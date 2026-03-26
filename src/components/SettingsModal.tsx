import React, { useState } from 'react';
import { X, User, Shield, Cpu, CreditCard, LogOut, Plus, Trash2, Info, ExternalLink, HelpCircle, BookOpen } from 'lucide-react';
import { auth, logout, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Agent, AgentRole } from '../types';
import { generateAvatar } from '../services/imageService';
import { RefreshCw, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  user: any;
  apiKeys: Record<string, string>;
  initialTab?: string;
}

type Tab = 'profile' | 'agents' | 'api' | 'docs' | 'about';

const DOCUMENTATION = {
  'getting-started': `# Getting Started with Heya

Welcome to **Heya**, your international collaborative AI workspace. Heya allows you to create multiple AI agents with distinct personalities and roles, and have them collaborate in shared discussion rooms.

## Quick Start
1. **Set up your API Key**: Go to Settings > API Keys and add your Google Gemini API key.
2. **Create an Agent**: Go to Settings > Agents and create your first AI collaborator. Give them a name, a role (e.g., "Software Architect"), and a personality.
3. **Start a Discussion**: Click the "+" button in the sidebar and select "New Discussion".
4. **Invite Agents**: Choose which agents you want to participate in the conversation.
5. **Collaborate**: Type your message and watch your agents interact with you and each other.

## Key Features
- **Multi-Agent Collaboration**: Multiple AI agents can talk to each other in the same room.
- **Smart Orchestration**: The system automatically decides which agent should speak next based on the context.
- **Convergence**: Use the "Converge" button to have the system summarize the current discussion and provide a clear path forward.
- **Scenarios**: Try "Love Battlefield" for pre-set dramatic scenarios to test agent personalities.`,
  'agents': `# Managing AI Agents

Agents are the heart of Heya. Each agent is a specialized AI instance with its own instructions and personality.

## Creating an Agent
In the Settings > Agents section, you can define:
- **Name**: How the agent is identified in chat.
- **Role**: Their professional or functional identity (e.g., "UX Designer", "Python Expert").
- **Avatar**: A visual representation (you can generate one using AI!).
- **System Instructions**: The core prompt that defines how the agent behaves, their knowledge base, and their communication style.

## Best Practices for Instructions
- Be specific about the agent's goals.
- Define their tone (e.g., "Professional and concise" or "Creative and enthusiastic").
- Mention any specific constraints or tools they should focus on.

## Active Agents
When creating a session, you select which agents are "active". Only active agents will participate in the orchestration logic.`,
  'api-keys': `# API Key Configuration

Heya uses Google's Gemini models to power its AI agents. To use the application, you must provide your own API key.

## How to get a Gemini API Key
1. Visit the [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a new API key.
3. Copy the key.

## Adding the key to Heya
1. Open **Settings** in the bottom left corner.
2. Navigate to the **API Keys** tab.
3. Paste your key into the Google Gemini field and click **Save**.

## Security
Your API keys are stored securely in your private user document in Firestore. They are only used to make requests to the Gemini API on your behalf.`
};

export const SettingsModal = ({ isOpen, onClose, agents, user, apiKeys, initialTab }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || 'profile');
  const [activeDoc, setActiveDoc] = useState<keyof typeof DOCUMENTATION>('getting-started');
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    role: '',
    description: '',
    provider: 'google' as const,
    model: 'gemini-3-flash-preview',
    color: 'bg-orange-500',
    mcpServers: [] as any[]
  });

  const [mcpServerInput, setMcpServerInput] = useState({ name: '', url: '', apiKey: '' });

  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab as Tab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSaveKey = async (provider: string) => {
    const key = editingKeys[provider];
    if (!key) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'secrets', provider), {
        provider,
        key,
        updatedAt: Date.now()
      });
      alert(`${provider} API key saved!`);
      setEditingKeys(prev => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/secrets/${provider}`);
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'agents'), {
        ...newAgent,
        ownerId: user.uid,
        avatar: `https://picsum.photos/seed/${newAgent.name.toLowerCase()}/100/100`,
        createdAt: Date.now()
      });
      setIsAddingAgent(false);
      setNewAgent({
        name: '',
        role: '',
        description: '',
        provider: 'google',
        model: 'gemini-3-flash-preview',
        color: 'bg-orange-500',
        mcpServers: []
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'agents');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      await deleteDoc(doc(db, 'agents', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `agents/${id}`);
    }
  };

  const bootstrapDefaultTeam = async () => {
    if (agents.length > 0 && !confirm("You already have agents. Do you want to add the default team anyway?")) return;
    
    setIsBootstrapping(true);
    const defaultTeam = [
      { name: 'Alex', role: 'Product Manager', description: 'Strategic, organized, focus on user value and product roadmap.', color: 'bg-blue-500', prompt: 'A professional and friendly product manager, wearing a smart casual outfit, holding a tablet, clean minimalist background.' },
      { name: 'Sam', role: 'Senior Developer', description: 'Technical, problem-solver, focus on implementation and code quality.', color: 'bg-indigo-500', prompt: 'A focused software engineer with glasses, wearing a hoodie, sitting in front of multiple monitors with code, cinematic lighting.' },
      { name: 'Jordan', role: 'UI/UX Designer', description: 'Creative, aesthetic, focus on user experience and visual design.', color: 'bg-pink-500', prompt: 'A creative designer with a stylish look, holding a stylus, surrounded by colorful design elements and wireframes, bright studio lighting.' },
      { name: 'Taylor', role: 'Marketing Specialist', description: 'Communicative, persuasive, focus on growth and market presence.', color: 'bg-orange-500', prompt: 'An energetic marketing expert, wearing a bright blazer, standing in front of a whiteboard with growth charts, optimistic and professional.' },
      { name: 'Morgan', role: 'QA Engineer', description: 'Meticulous, detail-oriented, focus on stability and bug-free releases.', color: 'bg-emerald-500', prompt: 'A meticulous quality assurance engineer, wearing a headset, looking closely at a screen with bug reports and magnifying glass icons, clean and technical vibe.' }
    ];

    try {
      for (const member of defaultTeam) {
        const avatar = await generateAvatar(member.prompt);
        await addDoc(collection(db, 'agents'), {
          name: member.name,
          role: member.role,
          description: member.description,
          color: member.color,
          ownerId: user.uid,
          provider: 'google',
          model: 'gemini-3-flash-preview',
          avatar: avatar || `https://picsum.photos/seed/${member.name.toLowerCase()}/100/100`,
          createdAt: Date.now()
        });
      }
      alert("Default team bootstrapped successfully!");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'agents');
    } finally {
      setIsBootstrapping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-slate-100 p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <User size={18} />
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'agents' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Cpu size={18} />
              Agents
            </button>
            <button 
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'api' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Shield size={18} />
              API Keys
            </button>
            <button 
              onClick={() => setActiveTab('docs')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'docs' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <BookOpen size={18} />
              Docs
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'about' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Info size={18} />
              About Us
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">User Profile</h3>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <img src={user?.photoURL || ""} className="w-16 h-16 rounded-full border-4 border-white shadow-sm" alt="User" />
                    <div>
                      <div className="font-bold text-slate-800">{user?.displayName}</div>
                      <div className="text-sm text-slate-500">{user?.email}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">User ID:</span>
                        <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono select-all cursor-copy" onClick={() => { navigator.clipboard.writeText(user.uid); alert("User ID copied!"); }}>
                          {user?.uid}
                        </code>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Danger Zone</h3>
                  <button 
                    onClick={() => { logout(); onClose(); }}
                    className="flex items-center gap-2 px-4 py-2 border border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </section>
              </div>
            )}

            {activeTab === 'agents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Your Agents</h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={bootstrapDefaultTeam}
                      disabled={isBootstrapping}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-600 disabled:opacity-50"
                    >
                      {isBootstrapping ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {isBootstrapping ? 'Generating Team...' : 'Bootstrap Team'}
                    </button>
                    <button 
                      onClick={() => setIsAddingAgent(!isAddingAgent)}
                      className="flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600"
                    >
                      <Plus size={14} />
                      {isAddingAgent ? 'Cancel' : 'Add Agent'}
                    </button>
                  </div>
                </div>

                {isAddingAgent && (
                  <form onSubmit={handleAddAgent} className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-orange-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                        <input 
                          required
                          value={newAgent.name}
                          onChange={e => setNewAgent({...newAgent, name: e.target.value})}
                          className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          placeholder="e.g. Sam"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
                        <input 
                          required
                          value={newAgent.role}
                          onChange={e => setNewAgent({...newAgent, role: e.target.value})}
                          className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          placeholder="e.g. Developer"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                      <textarea 
                        required
                        value={newAgent.description}
                        onChange={e => setNewAgent({...newAgent, description: e.target.value})}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        placeholder="What is this agent's expertise?"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Provider</label>
                        <select 
                          value={newAgent.provider}
                          onChange={e => {
                            const p = e.target.value as any;
                            setNewAgent({
                              ...newAgent, 
                              provider: p,
                              model: p === 'google' ? 'gemini-3-flash-preview' : 'gpt-4o'
                            });
                          }}
                          className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                          <option value="google">Google Gemini</option>
                          <option value="openai">OpenAI</option>
                          <option value="deepseek">DeepSeek</option>
                          <option value="qwen">Qwen (Alibaba)</option>
                          <option value="xai">xAI (Grok)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Model</label>
                        <input 
                          required
                          value={newAgent.model}
                          onChange={e => setNewAgent({...newAgent, model: e.target.value})}
                          className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          placeholder={newAgent.provider === 'google' ? 'gemini-3-flash-preview' : 'gpt-4o'}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Color</label>
                        <select 
                          value={newAgent.color}
                          onChange={e => setNewAgent({...newAgent, color: e.target.value})}
                          className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                          <option value="bg-orange-500">Orange</option>
                          <option value="bg-blue-500">Blue</option>
                          <option value="bg-purple-500">Purple</option>
                          <option value="bg-green-500">Green</option>
                          <option value="bg-red-500">Red</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 bg-white border border-slate-100 rounded-xl">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">MCP Servers (Optional)</label>
                      <div className="space-y-2">
                        {newAgent.mcpServers.map((server, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{server.name}</span>
                              <span className="text-slate-400 truncate max-w-[150px]">{server.url}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setNewAgent({...newAgent, mcpServers: newAgent.mcpServers.filter((_, i) => i !== idx)})}
                              className="p-1 text-slate-300 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            placeholder="Server Name"
                            value={mcpServerInput.name}
                            onChange={e => setMcpServerInput({...mcpServerInput, name: e.target.value})}
                            className="p-2 text-xs border border-slate-200 rounded-lg"
                          />
                          <input 
                            placeholder="Server URL"
                            value={mcpServerInput.url}
                            onChange={e => setMcpServerInput({...mcpServerInput, url: e.target.value})}
                            className="p-2 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input 
                            placeholder="API Key (Optional)"
                            value={mcpServerInput.apiKey}
                            onChange={e => setMcpServerInput({...mcpServerInput, apiKey: e.target.value})}
                            className="flex-1 p-2 text-xs border border-slate-200 rounded-lg"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (mcpServerInput.name && mcpServerInput.url) {
                                setNewAgent({
                                  ...newAgent, 
                                  mcpServers: [...newAgent.mcpServers, mcpServerInput]
                                });
                                setMcpServerInput({ name: '', url: '', apiKey: '' });
                              }
                            }}
                            className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all">
                      Create Agent
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {agents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm italic">No agents created yet.</div>
                  ) : (
                    agents.map(agent => (
                      <div key={agent.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:border-orange-200 transition-all group">
                        <img src={agent.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt={agent.name} />
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-800">{agent.name}</div>
                            <div className={`text-[10px] px-1.5 py-0.5 rounded text-white font-bold ${agent.color}`}>{agent.role}</div>
                            {agent.isTemplate && (
                              <div className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-bold border border-slate-200 uppercase tracking-tighter flex items-center gap-1">
                                <Sparkles size={10} /> Template
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{agent.description}</div>
                          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                            {agent.provider} • {agent.model}
                            {agent.mcpServers && agent.mcpServers.length > 0 && (
                              <span className="ml-2 text-indigo-500">• {agent.mcpServers.length} MCP Tools</span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">API Keys</h3>
                  <div className="group relative">
                    <HelpCircle size={16} className="text-slate-300 cursor-help" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none leading-relaxed">
                      <p className="font-bold mb-1">API Key Templates:</p>
                      <ul className="space-y-1 list-disc pl-3">
                        <li>OpenAI: sk-... (from platform.openai.com)</li>
                        <li>DeepSeek: sk-... (from platform.deepseek.com)</li>
                        <li>Qwen: sk-... (from dashscope.console.aliyun.com)</li>
                        <li>xAI: xai-... (from console.x.ai)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">Enter your API keys to enable agents from different providers. Keys are stored securely in your private workspace.</p>
                
                {['openai', 'deepseek', 'qwen', 'xai'].map(provider => (
                  <div key={provider} className="space-y-2 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{provider}</label>
                      {apiKeys[provider] && (
                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                          <Shield size={10} /> Active
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="password"
                        placeholder={apiKeys[provider] ? "••••••••••••••••" : `Enter ${provider} API Key`}
                        value={editingKeys[provider] || ''}
                        onChange={e => setEditingKeys({...editingKeys, [provider]: e.target.value})}
                        className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                      <button 
                        onClick={() => handleSaveKey(provider)}
                        disabled={!editingKeys[provider]}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <Shield size={16} className="text-orange-500 mt-0.5" />
                    <div className="text-xs text-orange-800 leading-relaxed">
                      <strong>Security Note:</strong> Google Gemini is enabled by default using the system key. For other providers, your keys are stored in your private Firestore collection, accessible only by you.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {Object.keys(DOCUMENTATION).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveDoc(key as any)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeDoc === key ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
                <div className="prose prose-sm max-w-none bg-slate-50/50 p-6 rounded-2xl border border-slate-100 overflow-y-auto max-h-[50vh]">
                  <Markdown>{DOCUMENTATION[activeDoc]}</Markdown>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-8">
                <section className="text-center py-8">
                  <div className="w-20 h-20 bg-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-orange-500/20 mb-6">
                    <Cpu size={40} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Heya AI</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                    Building the future of collaborative intelligence. Connect, create, and converse with multiple AI agents in one place.
                  </p>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Company</h4>
                  <a 
                    href="https://oasis-company.github.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <ExternalLink size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Oasis Company</div>
                        <div className="text-xs text-slate-500">Visit our official website</div>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                  </a>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Author</h4>
                  <a 
                    href="https://github.com/zbbsdsb" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <User size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">ceaserzhao</div>
                        <div className="text-xs text-slate-500">github.com/zbbsdsb</div>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                  </a>
                </section>

                <section className="pt-8 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Version 1.2.0 • Made with ❤️ by Oasis</p>
                </section>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
