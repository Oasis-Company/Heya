import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import OpenAI from "openai";
import { Message, Agent, McpServer } from "../types";

const googleAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// MCP Client Implementation
class McpClient {
  static async listTools(server: McpServer): Promise<FunctionDeclaration[]> {
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(server.apiKey ? { 'Authorization': `Bearer ${server.apiKey}` } : {})
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: Date.now()
        })
      });

      if (!response.ok) throw new Error(`MCP Server ${server.name} returned ${response.status}`);
      const data = await response.json();
      
      if (data.error) throw new Error(`MCP Error: ${data.error.message}`);

      return (data.result?.tools || []).map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || { type: Type.OBJECT, properties: {} }
      }));
    } catch (error) {
      console.error(`Failed to list tools from MCP server ${server.name}:`, error);
      return [];
    }
  }

  static async callTool(server: McpServer, name: string, args: any): Promise<any> {
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(server.apiKey ? { 'Authorization': `Bearer ${server.apiKey}` } : {})
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name, arguments: args },
          id: Date.now()
        })
      });

      if (!response.ok) throw new Error(`MCP Server ${server.name} returned ${response.status}`);
      const data = await response.json();
      
      if (data.error) throw new Error(`MCP Error: ${data.error.message}`);
      
      return data.result?.content || data.result;
    } catch (error) {
      console.error(`Failed to call tool ${name} on MCP server ${server.name}:`, error);
      return { error: String(error) };
    }
  }
}

const PROVIDER_CONFIGS: Record<string, { baseUrl: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1" },
  deepseek: { baseUrl: "https://api.deepseek.com" },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  xai: { baseUrl: "https://api.x.ai/v1" }
};

function getOpenAIClient(provider: string, apiKeys: Record<string, string>) {
  const key = apiKeys[provider];
  if (!key) throw new Error(`API Key for ${provider} not found. Please add it in settings.`);
  
  return new OpenAI({
    apiKey: key,
    baseURL: PROVIDER_CONFIGS[provider]?.baseUrl,
    dangerouslyAllowBrowser: true
  });
}

export async function generateAgentResponse(
  agent: Agent,
  history: Message[],
  systemInstruction?: string,
  apiKeys: Record<string, string> = {}
) {
  const instruction = systemInstruction || agent.systemInstruction || `You are ${agent.name}, a ${agent.role}. ${agent.description} Keep your responses concise and stay in character.`;

  // Fetch MCP tools and map them to their servers
  const toolToServers: Record<string, McpServer> = {};
  let tools: FunctionDeclaration[] = [];
  
  if (agent.mcpServers && agent.mcpServers.length > 0) {
    const toolPromises = agent.mcpServers.map(async (server) => {
      const serverTools = await McpClient.listTools(server);
      serverTools.forEach(tool => {
        toolToServers[tool.name] = server;
      });
      return serverTools;
    });
    const toolResults = await Promise.all(toolPromises);
    tools = toolResults.flat();
  }

  if (agent.provider === 'google') {
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await googleAI.models.generateContent({
      model: agent.model,
      contents,
      config: {
        systemInstruction: instruction,
        tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined
      }
    });

    // Handle function calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      const toolResults = await Promise.all(response.functionCalls.map(async (call) => {
        const server = toolToServers[call.name];
        if (!server) return {
          functionResponse: {
            name: call.name,
            response: { error: "Tool not found on any MCP server" }
          }
        };

        const result = await McpClient.callTool(server, call.name, call.args);
        return {
          functionResponse: {
            name: call.name,
            response: { content: JSON.stringify(result) }
          }
        };
      }));

      // Send results back to model
      const finalResponse = await googleAI.models.generateContent({
        model: agent.model,
        contents: [
          ...contents,
          { role: 'model', parts: response.candidates[0].content.parts },
          { role: 'user', parts: toolResults }
        ],
        config: { systemInstruction: instruction }
      });

      return finalResponse.text || "";
    }

    return response.text || "";
  } else {
    const client = getOpenAIClient(agent.provider, apiKeys);
    const response = await client.chat.completions.create({
      model: agent.model,
      messages: [
        { role: 'system', content: instruction },
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant' as any,
          content: msg.content
        }))
      ]
    });
    return response.choices[0].message.content || "";
  }
}

export async function selectNextSpeaker(
  agents: Agent[],
  history: Message[],
  apiKeys: Record<string, string> = {}
): Promise<Agent | null> {
  if (agents.length === 0) return null;
  if (agents.length === 1) return agents[0];

  // We use Gemini as the default moderator for its reasoning capabilities, 
  // but we could also use a user-provided key if needed.
  const model = googleAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: 'user',
        parts: [{ text: `Based on the following conversation, which agent should speak next? 
        Available agents: ${agents.map(a => `${a.name} (${a.role})`).join(', ')}.
        Respond ONLY with the name of the agent.` }]
      },
      ...history.slice(-5).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: `${msg.agentId}: ${msg.content}` }]
      }))
    ],
    config: {
      systemInstruction: "You are a conversation moderator. Your job is to pick the most relevant next speaker.",
    }
  });

  const response = await model;
  const nextName = response.text?.trim() || "";
  return agents.find(a => nextName.includes(a.name)) || agents[0];
}

export async function generateSummary(history: Message[], apiKeys: Record<string, string> = {}) {
  const model = googleAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: 'user',
        parts: [{ text: "Please summarize the key points discussed so far and suggest the next steps. Be concise." }]
      },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: `${msg.agentId}: ${msg.content}` }]
      }))
    ],
    config: {
      systemInstruction: "You are a helpful assistant summarizing a multi-agent discussion.",
    }
  });

  const response = await model;
  return response.text || "";
}
