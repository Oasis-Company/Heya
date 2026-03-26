import React, { useState } from 'react';
import { X, Plus, Users, MessageSquare, Check } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Agent } from '../types';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  user: any;
  onSessionCreated: (id: string) => void;
}

export const CreateSessionModal = ({ isOpen, onClose, agents, user, onSessionCreated }: CreateSessionModalProps) => {
  const [title, setTitle] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter a title for the discussion.");
      return;
    }
    if (selectedAgentIds.length === 0) {
      alert("Please select at least one agent to join the discussion.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        ownerId: user.uid,
        participantIds: [user.uid],
        title: title.trim(),
        activeAgentIds: selectedAgentIds,
        createdAt: Date.now()
      });
      onSessionCreated(docRef.id);
      setTitle('');
      setSelectedAgentIds([]);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'sessions');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Plus size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">New Discussion</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Discussion Title</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                autoFocus
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-slate-800 font-medium"
                placeholder="e.g. Project Brainstorm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Agents to Import</label>
              <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                {selectedAgentIds.length} Selected
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {agents.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                  <p className="text-xs text-slate-400 italic">No agents found. Create one in settings first.</p>
                </div>
              ) : (
                agents.map(agent => (
                  <div 
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer group ${
                      selectedAgentIds.includes(agent.id) 
                        ? 'border-orange-500 bg-orange-50/50' 
                        : 'border-slate-50 bg-white hover:border-slate-200'
                    }`}
                  >
                    <img src={agent.avatar} className="w-10 h-10 rounded-xl shadow-sm" alt={agent.name} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-800 truncate">{agent.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate uppercase">{agent.role}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      selectedAgentIds.includes(agent.id) ? 'bg-orange-500 text-white' : 'bg-slate-100 text-transparent group-hover:bg-slate-200'
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={agents.length === 0}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus size={18} className="text-orange-400" />
            Create Discussion
          </button>
        </form>
      </div>
    </div>
  );
};
