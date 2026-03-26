import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Zap, Shield, MapPin, Sparkles, User as UserIcon } from 'lucide-react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Agent, AgentRole } from '../types';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSessionCreated: (id: string) => void;
}

type ScenarioType = 'asian' | 'western';
type Intensity = 'mild' | 'heated' | 'toxic';
type Conflict = 'rekindle' | 'secret' | 'money' | 'custody';
type Setting = 'groupchat' | 'party' | 'latecall';

export function ScenarioModal({ isOpen, onClose, user, onSessionCreated }: ScenarioModalProps) {
  const [type, setType] = useState<ScenarioType>('asian');
  const [intensity, setIntensity] = useState<Intensity>('heated');
  const [conflict, setConflict] = useState<Conflict>('rekindle');
  const [setting, setSetting] = useState<Setting>('groupchat');
  const [isGenerating, setIsGenerating] = useState(false);

  const [names, setNames] = useState({
    ex: type === 'asian' ? '林深' : 'Julian',
    current: type === 'asian' ? '陆昭' : 'Marcus',
    protagonist: type === 'asian' ? '苏悦' : 'Elena'
  });

  const handleTypeChange = (newType: ScenarioType) => {
    setType(newType);
    setNames({
      ex: newType === 'asian' ? '林深' : 'Julian',
      current: newType === 'asian' ? '陆昭' : 'Marcus',
      protagonist: newType === 'asian' ? '苏悦' : 'Elena'
    });
  };

  const generateScenario = async () => {
    setIsGenerating(true);
    try {
      const intensityDesc = {
        mild: 'rational, calm, trying to resolve things maturely',
        heated: 'sharp, emotional, full of tension and sarcasm',
        toxic: 'paranoid, aggressive, bringing up painful past secrets, no filters'
      }[intensity];

      const conflictDesc = {
        rekindle: 'The Ex is trying to win back the Protagonist, while the Current is fiercely protective.',
        secret: 'A hidden past secret about the Protagonist has been accidentally revealed.',
        money: 'Unresolved financial issues from the past breakup are resurfacing, and the Current is intervening.',
        custody: 'A dispute over a shared pet or child is forcing them to interact.'
      }[conflict];

      const settingDesc = {
        groupchat: 'A temporary group chat named "We Need to Talk".',
        party: 'An unexpected encounter at a mutual friend\'s wedding party.',
        latecall: 'A late-night three-way conference call.'
      }[setting];

      // Create Agents
      const agentsToCreate = [
        {
          name: names.ex,
          role: 'The Ex',
          description: `The persistent and emotional ex-partner. Intensity: ${intensity}. Background: ${type === 'asian' ? 'Asian cultural context (guilt, duty)' : 'Western cultural context (boundaries, independence)'}.`,
          color: 'bg-blue-500',
          instruction: `You are ${names.ex}, the ex-partner. The current intensity is ${intensityDesc}. The core conflict is: ${conflictDesc}. You are in this setting: ${settingDesc}. Stay in character and respond to others.`
        },
        {
          name: names.current,
          role: 'The Current',
          description: `The protective and firm current partner. Intensity: ${intensity}. Background: ${type === 'asian' ? 'Asian cultural context' : 'Western cultural context'}.`,
          color: 'bg-red-500',
          instruction: `You are ${names.current}, the current partner. The current intensity is ${intensityDesc}. The core conflict is: ${conflictDesc}. You are in this setting: ${settingDesc}. You despise the ex's interference.`
        },
        {
          name: names.protagonist,
          role: 'The Protagonist',
          description: `The person caught in the middle. Intensity: ${intensity}. Background: ${type === 'asian' ? 'Asian cultural context' : 'Western cultural context'}.`,
          color: 'bg-purple-500',
          instruction: `You are ${names.protagonist}, the one caught between your past and present. The current intensity is ${intensityDesc}. The core conflict is: ${conflictDesc}. You are in this setting: ${settingDesc}. You are trying to manage the situation.`
        }
      ];

      const createdAgentIds: string[] = [];
      for (const a of agentsToCreate) {
        const docRef = await addDoc(collection(db, 'agents'), {
          name: a.name,
          role: a.role,
          description: a.description,
          color: a.color,
          ownerId: user.uid,
          provider: 'google',
          model: 'gemini-3-flash-preview',
          avatar: `https://picsum.photos/seed/${a.name.toLowerCase()}/100/100`,
          createdAt: Date.now(),
          systemInstruction: a.instruction,
          isTemplate: true
        });
        createdAgentIds.push(docRef.id);
      }

      // Create Session
      const sessionTitle = type === 'asian' ? `爱情修罗场：${names.protagonist}` : `Love Battlefield: ${names.protagonist}`;
      const sessionRef = await addDoc(collection(db, 'sessions'), {
        title: sessionTitle,
        ownerId: user.uid,
        participantIds: [user.uid],
        activeAgentIds: createdAgentIds,
        createdAt: Date.now()
      });

      // Initial Message
      const initialContent = type === 'asian' 
        ? `${names.ex}：“${names.protagonist}，我还是觉得那天在雨里的告别不应该是我们的结局。${names.current}，如果你真的爱她，就不应该限制她见老朋友的权利。”`
        : `${names.ex}: "${names.protagonist}, I saw that photo of you and ${names.current}. It looks... stable. But we both know you crave more than just 'stability'. ${names.current}, I hope you're not keeping her in a cage."`;

      await addDoc(collection(db, 'sessions', sessionRef.id, 'messages'), {
        sessionId: sessionRef.id,
        agentId: createdAgentIds[0],
        role: 'assistant',
        content: initialContent,
        timestamp: Date.now()
      });

      onSessionCreated(sessionRef.id);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to generate scenario.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-rose-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Heart className="text-rose-500 fill-rose-500" size={24} />
              Love Battlefield
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Scenario Customizer</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Template Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Template</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleTypeChange('asian')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${type === 'asian' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="font-bold text-slate-800">Asian Melodrama</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase">Duty & Regret</div>
              </button>
              <button 
                onClick={() => handleTypeChange('western')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${type === 'western' ? 'border-rose-500 bg-rose-50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="font-bold text-slate-800">Western Drama</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase">Boundaries & Passion</div>
              </button>
            </div>
          </div>

          {/* Names */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Character Names</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="text-[10px] text-blue-500 font-bold uppercase">The Ex</div>
                <input 
                  value={names.ex}
                  onChange={e => setNames({...names, ex: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-red-500 font-bold uppercase">The Current</div>
                <input 
                  value={names.current}
                  onChange={e => setNames({...names, current: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-purple-500 font-bold uppercase">Protagonist</div>
                <input 
                  value={names.protagonist}
                  onChange={e => setNames({...names, protagonist: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>
          </div>

          {/* Intensity & Conflict */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drama Intensity</label>
              <select 
                value={intensity}
                onChange={e => setIntensity(e.target.value as Intensity)}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
              >
                <option value="mild">Mild (Rational)</option>
                <option value="heated">Heated (Emotional)</option>
                <option value="toxic">Toxic (No Filter)</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Conflict</label>
              <select 
                value={conflict}
                onChange={e => setConflict(e.target.value as Conflict)}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
              >
                <option value="rekindle">Rekindling Old Flame</option>
                <option value="secret">Hidden Secret Exposed</option>
                <option value="money">Financial Dispute</option>
                <option value="custody">Shared Pet/Child Dispute</option>
              </select>
            </div>
          </div>

          {/* Setting */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Setting</label>
            <div className="flex gap-3">
              {(['groupchat', 'party', 'latecall'] as Setting[]).map(s => (
                <button 
                  key={s}
                  onClick={() => setSetting(s)}
                  className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all ${setting === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                >
                  {s === 'groupchat' && 'Group Chat'}
                  {s === 'party' && 'Wedding Party'}
                  {s === 'latecall' && 'Late Night Call'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={generateScenario}
            disabled={isGenerating}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Generating Drama...
              </>
            ) : (
              <>
                <Sparkles size={20} className="text-orange-400" />
                Enter the Battlefield
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RefreshCw({ size, className }: { size: number, className: string }) {
  return <Zap size={size} className={className} />;
}
