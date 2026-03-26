import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Users, 
  Zap, 
  MessageSquare, 
  Settings, 
  Plus, 
  RefreshCw,
  LogOut,
  Trash2,
  ChevronRight,
  User as UserIcon,
  UserPlus,
  Cpu,
  ChevronDown,
  Share2,
  Menu,
  X as CloseIcon,
  Pin,
  Edit2,
  MoreVertical,
  ChevronLeft,
  History,
  Shield
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, setDoc, addDoc, query, orderBy, deleteDoc, onSnapshot, limit, where } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { Agent, Message, ChatSession, AgentRole } from './types';
import { generateAgentResponse, generateSummary, selectNextSpeaker } from './services/aiService';
import { HeyaLogo } from './components/Logo';
import { SettingsModal } from './components/SettingsModal';
import { CreateSessionModal } from './components/CreateSessionModal';
import { AddFriendModal } from './components/AddFriendModal';
import { ScenarioModal } from './components/ScenarioModal';
import { Heart } from 'lucide-react';

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');

  const [agentsValue, agentsLoading] = useCollection(
    query(collection(db, 'agents'), orderBy('createdAt', 'asc'))
  );

  const [keysValue, keysLoading] = useCollection(
    user ? collection(db, 'users', user.uid, 'secrets') : null
  );

  const agents = agentsValue?.docs.map(d => ({ id: d.id, ...d.data() } as Agent)) || [];
  const apiKeys = keysValue?.docs.reduce((acc, d) => {
    const data = d.data();
    acc[data.provider] = data.key;
    return acc;
  }, {} as Record<string, string>) || {};

  useEffect(() => {
    if (user) {
      setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastActive: Date.now()
      }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.ok ? setBackendStatus('online') : setBackendStatus('offline'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFCFB]"><RefreshCw className="animate-spin text-orange-500" /></div>;
  if (!user) return <LoginView />;

  return (
    <div className="flex h-screen bg-[#FDFCFB] text-slate-900 font-sans overflow-hidden relative">
      <div className={`fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      
      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform lg:relative lg:translate-x-0 h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          user={user} 
          currentSessionId={currentSessionId} 
          onSelectSession={(id) => { setCurrentSessionId(id); setIsSidebarOpen(false); }} 
          onOpenSettings={(tab) => { setSettingsTab(tab); setIsSettingsOpen(true); }}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenAddFriend={() => setIsAddFriendOpen(true)}
          onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
          backendStatus={backendStatus}
          agents={agents}
        />
      </div>

      <main className="flex-1 flex flex-col relative w-full">
        {currentSessionId ? (
          <ChatView 
            user={user} 
            sessionId={currentSessionId} 
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            agents={agents}
            apiKeys={apiKeys}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        ) : (
          <div className="flex flex-col h-full">
            <header className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center px-4 lg:hidden">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
                <Menu size={24} />
              </button>
            </header>
            <div className="flex-1">
              <EmptyState onNewSession={() => setIsCreateModalOpen(true)} />
            </div>
          </div>
        )}
      </main>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => { setIsSettingsOpen(false); setSettingsTab(undefined); }} 
        agents={agents}
        user={user}
        apiKeys={apiKeys}
        initialTab={settingsTab}
      />
      <CreateSessionModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        agents={agents}
        user={user}
        onSessionCreated={(id) => setCurrentSessionId(id)}
      />
      <AddFriendModal 
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        user={user}
      />
      <ScenarioModal 
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        user={user}
        onSessionCreated={(id) => setCurrentSessionId(id)}
      />
    </div>
  );
}

function LoginView() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFB] p-6">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <HeyaLogo size={120} />
      </motion.div>
      <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tighter text-center">The AGI Orchestration Layer</h1>
      <p className="text-slate-500 mb-10 text-center max-w-lg text-lg leading-relaxed">
        Stop chatting, start orchestrating. Heya is the world's first multi-agent workspace where specialized AI agents collaborate as your <span className="text-orange-600 font-bold">Autonomous AI Workforce</span>.
      </p>
      <div className="flex flex-col items-center gap-6">
        <button 
          onClick={signInWithGoogle}
          className="flex items-center gap-3 px-10 py-5 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-white hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 group"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-200" alt="Google" />
          Get Started with Google
        </button>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Gemini 1.5 Pro</span>
          <div className="w-1 h-1 rounded-full bg-slate-200" />
          <span>GPT-4o</span>
          <div className="w-1 h-1 rounded-full bg-slate-200" />
          <span>DeepSeek V3</span>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ user, currentSessionId, onSelectSession, onOpenSettings, onOpenCreateModal, onOpenAddFriend, onOpenScenarioModal, backendStatus, agents }: { user: any, currentSessionId: string | null, onSelectSession: (id: string) => void, onOpenSettings: (tab?: string) => void, onOpenCreateModal: () => void, onOpenAddFriend: () => void, onOpenScenarioModal: () => void, backendStatus: 'online' | 'offline', agents: Agent[] }) {
  const [sessionsValue, loading] = useCollection(
    user ? query(
      collection(db, 'sessions'), 
      where('participantIds', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    ) : null
  );
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
      if (currentSessionId === id) onSelectSession('');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sessions/${id}`);
    }
  };

  return (
    <aside className="w-72 h-full border-r border-slate-200 flex flex-col bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => onSelectSession('')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <HeyaLogo size={32} />
            <h1 className="text-xl font-black tracking-tighter text-slate-900">heya</h1>
          </button>
          <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-green-500' : 'bg-red-500'} shadow-sm shadow-green-100`}></div>
        </div>

        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <span>New Discussion</span>
            <Plus size={20} className={`text-orange-400 transition-transform duration-300 ${isAddMenuOpen ? 'rotate-45' : ''}`} />
          </button>

          <AnimatePresence>
            {isAddMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <button 
                  onClick={() => { onOpenCreateModal(); setIsAddMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Discussion</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Start a chatroom</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => { onOpenSettings('agents'); setIsAddMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Create Agent</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Add a new AI role</div>
                  </div>
                </button>

                <button 
                  onClick={() => { onOpenAddFriend(); setIsAddMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Add Friend</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Invite collaborators</div>
                  </div>
                </button>

                <button 
                  onClick={() => { onOpenScenarioModal(); setIsAddMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                    <Heart size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Love Battlefield</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Preset Scenarios</div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2">
            <History size={12} className="text-slate-400" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">History</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-300">{sessionsValue?.size || 0} chats</span>
            <RefreshCw size={10} className={`text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw size={20} className="animate-spin text-slate-200" /></div>
        ) : sessionsValue?.empty ? (
          <div className="px-4 py-8 text-center">
            <div className="text-xs text-slate-400 italic">No history yet</div>
          </div>
        ) : (
          sessionsValue?.docs.map(doc => (
            <div 
              key={doc.id}
              onClick={() => onSelectSession(doc.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === doc.id ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className={currentSessionId === doc.id ? 'text-orange-500' : 'text-slate-300'} />
                <span className="text-sm font-medium truncate">{doc.data().title}</span>
              </div>
              <button 
                onClick={(e) => deleteSession(doc.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-all group cursor-pointer" onClick={() => onOpenSettings()}>
          <img src={user.photoURL} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt="User" />
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-bold text-slate-800 truncate">{user.displayName}</div>
            <div className="text-[10px] text-slate-400 truncate font-medium uppercase tracking-tighter">Settings & Profile</div>
          </div>
          <Settings size={18} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>
      </div>
    </aside>
  );
}

function ChatView({ user, sessionId, isGenerating, setIsGenerating, agents, apiKeys, onOpenSidebar }: { user: any, sessionId: string, isGenerating: boolean, setIsGenerating: (v: boolean) => void, agents: Agent[], apiKeys: Record<string, string>, onOpenSidebar: () => void }) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionData, setSessionData] = useState<ChatSession | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubSession = onSnapshot(doc(db, 'sessions', sessionId), (doc) => {
      setSessionData({ id: doc.id, ...doc.data() } as ChatSession);
    });
    const unsubMessages = onSnapshot(
      query(collection(db, 'sessions', sessionId, 'messages'), orderBy('timestamp', 'asc')),
      (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      }
    );
    return () => { unsubSession(); unsubMessages(); };
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sessionData?.typingAgentId]);

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;
    const text = inputValue;
    setInputValue('');
    setIsGenerating(true);

    try {
      const userMsg = {
        sessionId,
        agentId: 'user',
        role: 'user',
        content: text,
        timestamp: Date.now()
      };
      await addDoc(collection(db, 'sessions', sessionId, 'messages'), userMsg);

      // Orchestration Logic
      const activeAgents = agents.filter(a => sessionData?.activeAgentIds.includes(a.id));
      const nextAgent = await selectNextSpeaker(activeAgents, [...messages, userMsg as Message], apiKeys);
      
      if (nextAgent) {
        // Set typing indicator
        await setDoc(doc(db, 'sessions', sessionId), { typingAgentId: nextAgent.id }, { merge: true });
        
        const response = await generateAgentResponse(nextAgent, [...messages, userMsg as Message], undefined, apiKeys);
        
        // Clear typing indicator
        await setDoc(doc(db, 'sessions', sessionId), { typingAgentId: null }, { merge: true });

        await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
          sessionId,
          agentId: nextAgent.id,
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error(e);
      await setDoc(doc(db, 'sessions', sessionId), { typingAgentId: null }, { merge: true });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConverge = async () => {
    if (messages.length === 0 || isGenerating) return;
    setIsGenerating(true);
    try {
      const summary = await generateSummary(messages, apiKeys);
      await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
        sessionId,
        agentId: 'system',
        role: 'system',
        content: summary,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInvite = async () => {
    const friendId = prompt("Enter your friend's User ID (they can find this in Settings > Profile):");
    if (!friendId) return;
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const currentParticipants = sessionData?.participantIds || [];
      if (currentParticipants.includes(friendId)) {
        alert("This user is already a participant!");
        return;
      }
      await setDoc(sessionRef, {
        ...sessionData,
        participantIds: [...currentParticipants, friendId]
      });
      alert("Friend invited successfully!");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}`);
    }
  };

  const handleShare = async () => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await setDoc(sessionRef, {
        ...sessionData,
        isPublic: true
      }, { merge: true });
      const shareUrl = `${window.location.origin}?session=${sessionId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("分享链接已复制到剪贴板！此会话现在已公开。");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}`);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'sessions', sessionId, 'messages', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sessions/${sessionId}/messages/${id}`);
    }
  };

  const handleTogglePin = async (msg: Message) => {
    try {
      await setDoc(doc(db, 'sessions', sessionId, 'messages', msg.id), {
        isPinned: !msg.isPinned
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}/messages/${msg.id}`);
    }
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditValue(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId) return;
    try {
      await setDoc(doc(db, 'sessions', sessionId, 'messages', editingMessageId), {
        content: editValue,
        isEdited: true
      }, { merge: true });
      setEditingMessageId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}/messages/${editingMessageId}`);
    }
  };

  const pinnedMessages = messages.filter(m => m.isPinned);
  const typingAgent = agents.find(a => a.id === sessionData?.typingAgentId);

  return (
    <>
      <header className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
          <button onClick={onOpenSidebar} className="p-2 text-slate-500 lg:hidden -ml-2">
            <Menu size={20} />
          </button>
          <h2 className="font-bold text-slate-800 truncate text-sm lg:text-base">{sessionData?.title || 'Loading...'}</h2>
          <div className="hidden sm:flex -space-x-2">
            {agents.filter(a => sessionData?.activeAgentIds.includes(a.id)).map(a => (
              <img key={a.id} src={a.avatar} className="w-6 h-6 rounded-full border-2 border-white" title={a.name} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 lg:gap-3">
          <button 
            onClick={handleShare}
            className="p-2 lg:px-4 lg:py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
            title="公开分享此会话"
          >
            <Share2 size={14} />
            <span className="hidden lg:inline ml-2">Share</span>
          </button>
          <button 
            onClick={handleInvite}
            className="hidden sm:flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
          >
            <UserPlus size={14} />
            <span className="hidden lg:inline">Invite</span>
          </button>
          <button onClick={handleConverge} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">
            <Zap size={14} className="text-orange-400" />
            <span className="hidden lg:inline">Converge</span>
          </button>
        </div>
      </header>

      {pinnedMessages.length > 0 && (
        <div className="bg-orange-50/50 border-b border-orange-100 px-8 py-2 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <Pin size={12} className="text-orange-500 shrink-0" />
          <div className="flex gap-2">
            {pinnedMessages.map(m => (
              <div key={m.id} className="bg-white border border-orange-200 rounded-lg px-3 py-1 text-[10px] font-medium text-slate-600 whitespace-nowrap flex items-center gap-2">
                <span className="truncate max-w-[150px]">{m.content}</span>
                <button onClick={() => handleTogglePin(m)} className="text-slate-300 hover:text-orange-500">
                  <CloseIcon size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
        {messages.map((msg) => {
          const agent = agents.find(a => a.id === msg.agentId);
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';
          const isEditing = editingMessageId === msg.id;

          if (isSystem) return (
            <div key={msg.id} className="flex justify-center">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 max-w-2xl text-slate-700 text-sm shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-orange-400 font-bold uppercase text-[10px] tracking-widest">
                  <Zap size={12} />
                  <span>Convergence Summary</span>
                </div>
                <div className="prose prose-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          );

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 lg:gap-4 group`}>
              {!isUser && agent && <img src={agent.avatar} className="w-8 h-8 rounded-full self-end" />}
              <div className={`max-w-[85%] lg:max-w-[70%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 px-1">
                  {!isUser && agent && <div className="text-[10px] font-bold text-slate-400">{agent.name} • {agent.role}</div>}
                  {msg.isPinned && <Pin size={10} className="text-orange-500" />}
                  {msg.isEdited && <div className="text-[10px] text-slate-300 italic">(edited)</div>}
                </div>
                
                <div className="relative group/msg">
                  {isEditing ? (
                    <div className="space-y-2 bg-white border border-orange-200 p-3 rounded-2xl shadow-lg">
                      <textarea 
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full text-sm focus:outline-none resize-none min-h-[60px]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                        <button onClick={handleSaveEdit} className="text-[10px] font-bold text-orange-500 hover:text-orange-600">Save Changes</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl text-sm ${isUser ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none shadow-sm'}`}>
                      {msg.content}
                    </div>
                  )}

                  {!isEditing && (
                    <div className={`absolute top-0 ${isUser ? '-left-12' : '-right-12'} opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-1`}>
                      <button onClick={() => handleTogglePin(msg)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-orange-500 transition-colors" title="Pin">
                        <Pin size={14} className={msg.isPinned ? 'fill-orange-500 text-orange-500' : ''} />
                      </button>
                      {isUser && (
                        <>
                          <button onClick={() => handleStartEdit(msg)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {typingAgent && (
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <img src={typingAgent.avatar} className="w-8 h-8 rounded-full self-end" />
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{typingAgent.name} is thinking...</span>
            </div>
          </div>
        )}

        {isGenerating && !typingAgent && <div className="flex gap-2 p-4 text-slate-400 text-xs italic animate-pulse">AI is thinking...</div>}
      </div>

      <div className="p-4 lg:p-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Collaborate with your agents..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 lg:px-6 py-3 lg:py-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all resize-none min-h-[48px] lg:min-h-[56px]"
            rows={1}
          />
          <button onClick={handleSend} disabled={!inputValue.trim() || isGenerating} className="absolute right-2 bottom-2 lg:right-3 lg:bottom-3 p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-100">
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

function EmptyState({ onNewSession }: { onNewSession: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
      <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-4 shadow-inner">
        <Users size={48} />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Deploy Your AI Workforce</h2>
        <p className="text-slate-500 max-w-md text-lg">
          Select a discussion from the sidebar or start a new one to begin collaborating with your <span className="text-orange-600 font-bold italic">Swarm Intelligence</span>.
        </p>
      </div>
      <button 
        onClick={onNewSession}
        className="mt-4 px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 flex items-center gap-3 group"
      >
        <Plus size={20} className="text-orange-400 group-hover:rotate-90 transition-transform" />
        Start New AGI Discussion
      </button>
      <div className="pt-8 grid grid-cols-3 gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
        <div className="flex flex-col items-center gap-1">
          <Cpu size={24} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Orchestration</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Zap size={24} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Convergence</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Shield size={24} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Security</span>
        </div>
      </div>
    </div>
  );
}
