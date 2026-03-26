export enum AgentRole {
  PRODUCT_MANAGER = 'Product Manager',
  DEVELOPER = 'Developer',
  DESIGNER = 'Designer',
  MARKETER = 'Marketer',
  USER = 'User'
}

export interface Agent {
  id: string;
  ownerId?: string;
  name: string;
  role: AgentRole | string;
  color: string;
  avatar: string;
  description: string;
  provider: 'google' | 'openai' | 'deepseek' | 'qwen' | 'xai';
  model: string;
  mcpServers?: McpServer[];
  systemInstruction?: string;
  isTemplate?: boolean;
  createdAt?: number;
}

export interface McpServer {
  name: string;
  url: string;
  apiKey?: string;
}

export interface ApiKey {
  provider: string;
  key: string;
  baseUrl?: string;
  updatedAt: number;
}

export interface Message {
  id: string;
  sessionId: string;
  agentId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isPinned?: boolean;
  isEdited?: boolean;
}

export interface ChatSession {
  id: string;
  ownerId: string;
  participantIds: string[];
  title: string;
  activeAgentIds: string[];
  isPublic?: boolean;
  typingAgentId?: string | null;
  createdAt: number;
}
