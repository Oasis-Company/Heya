import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, Check, Loader2, Mail } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export const AddFriendModal = ({ isOpen, onClose, user }: AddFriendModalProps) => {
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (email.trim().toLowerCase() === user.email.toLowerCase()) {
      setError("You cannot add yourself as a friend.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    setSent(false);

    try {
      const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("User not found. Make sure they have logged in to heya at least once.");
      } else {
        const userData = querySnapshot.docs[0].data();
        setSearchResult({ id: querySnapshot.docs[0].id, ...userData });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
      setError("An error occurred while searching.");
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchResult || isSending) return;
    setIsSending(true);

    try {
      // Check if friendship already exists
      const q = query(
        collection(db, 'friendships'),
        where('user1Id', 'in', [user.uid, searchResult.uid]),
        where('user2Id', 'in', [user.uid, searchResult.uid])
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        setError("Friend request already sent or you are already friends.");
        setIsSending(false);
        return;
      }

      await addDoc(collection(db, 'friendships'), {
        user1Id: user.uid,
        user2Id: searchResult.uid,
        status: 'pending',
        createdAt: Date.now()
      });
      setSent(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'friendships');
      setError("Failed to send friend request.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Add Friend</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSearch} className="relative">
            <input 
              type="email"
              placeholder="Enter friend's email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
              required
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <button 
              type="submit"
              disabled={isSearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </form>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2"
              >
                <X size={16} />
                {error}
              </motion.div>
            )}

            {searchResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img src={searchResult.photoURL} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="" />
                  <div>
                    <div className="font-bold text-slate-800">{searchResult.displayName}</div>
                    <div className="text-xs text-slate-500">{searchResult.email}</div>
                  </div>
                </div>
                
                {sent ? (
                  <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                    <Check size={16} />
                    Sent
                  </div>
                ) : (
                  <button 
                    onClick={sendFriendRequest}
                    disabled={isSending}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-200"
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Add
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!searchResult && !error && !isSearching && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus size={24} className="text-slate-300" />
              </div>
              <p className="text-sm text-slate-400 max-w-[200px] mx-auto">
                Search for your friends by their email address to start collaborating.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
