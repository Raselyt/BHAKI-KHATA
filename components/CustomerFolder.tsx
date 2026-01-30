
import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { TransactionCard } from './TransactionCard.tsx';

interface CustomerFolderProps {
  name: string;
  balance: number;
  phone?: string;
  transactions: Transaction[];
  onBack: () => void;
  onAdd: (data: { name: string; amount: number; type: TransactionType; note?: string }) => void;
  onDelete: (id: string) => void;
}

export const CustomerFolder: React.FC<CustomerFolderProps> = ({ name, balance, phone, transactions, onBack, onAdd, onDelete }) => {
  const [showAddModal, setShowAddModal] = useState<{ type: TransactionType } | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSendMessage = () => {
    // Collect unique notes from recent baki transactions to show in description
    const bakiNotes = transactions
      .filter(t => (t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI) && t.note)
      .map(t => t.note?.trim())
      .filter(Boolean);
    
    const uniqueNotes = Array.from(new Set(bakiNotes)).slice(0, 4).join(', ');
    const description = uniqueNotes ? ` (বিবরণ: ${uniqueNotes} এর বাকি টাকা)` : '';
    
    const message = `আসসালামু আলাইকুম ${name}, আমি রাসেল বলছি। আপনার কাছে বর্তমানে ${balance} টাকা${description} পাওনা আছে। দয়া করে দ্রুত পরিশোধ করুন। ধন্যবাদ।`;
    
    const encodedMsg = encodeURIComponent(message);
    const smsUrl = `sms:${phone || ''}?body=${encodedMsg}`;
    
    if (phone) {
      window.open(smsUrl, '_blank');
    } else {
      // If no phone number, prompt for one or just show the message
      const targetPhone = prompt("কাস্টমারের ফোন নম্বর নেই। নম্বরটি দিন:", "");
      if (targetPhone) {
        window.open(`sms:${targetPhone}?body=${encodedMsg}`, '_blank');
      } else {
        alert("মেসেজটি কপি করুন:\n\n" + message);
      }
    }
  };

  const handleQuickAdd = () => {
    if (!amount || isNaN(Number(amount))) return;
    onAdd({
      name,
      amount: Number(amount),
      type: showAddModal!.type,
      note: note.trim()
    });
    setAmount('');
    setNote('');
    setShowAddModal(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 className="text-xl font-black text-slate-800 truncate flex-1">{name}</h2>
      </div>

      {/* Customer Stats Card */}
      <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white mb-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">মোট পাওনা</p>
          <p className="text-4xl font-black mb-6">৳ {balance.toLocaleString()}</p>
          
          <div className="flex gap-3">
            <button 
              onClick={handleSendMessage}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              মেসেজ দিন
            </button>
            <button 
              onClick={() => window.open(`tel:${phone || ''}`)}
              className="w-14 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => setShowAddModal({ type: TransactionType.BAKI })}
          className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] text-center active:scale-95 transition-all group"
        >
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </div>
          <p className="font-black text-rose-600">বাকি দিন</p>
        </button>
        <button 
          onClick={() => setShowAddModal({ type: TransactionType.CASH_PAYMENT })}
          className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] text-center active:scale-95 transition-all group"
        >
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="font-black text-emerald-600">টাকা জমা নিন</p>
        </button>
      </div>

      {/* Transaction History */}
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">লেনদেন ইতিহাস</h3>
      <div className="space-y-3 pb-10">
        {transactions.map(t => (
          <TransactionCard 
            key={t.id} 
            transaction={t} 
            onDelete={onDelete} 
            onClick={() => {}} 
          />
        ))}
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-6 text-slate-800">
              {showAddModal.type === TransactionType.BAKI ? 'নতুন বাকি লিখুন' : 'টাকা জমা নিন'}
            </h3>
            <div className="space-y-4">
              <input 
                autoFocus
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="টাকার পরিমাণ..."
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl outline-none focus:border-indigo-500 transition-all"
              />
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="বিবরণ (ঐচ্ছিক)..."
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
              />
              <button 
                onClick={handleQuickAdd}
                className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${
                  showAddModal.type === TransactionType.BAKI ? 'bg-rose-500 shadow-rose-100' : 'bg-emerald-500 shadow-emerald-100'
                }`}
              >
                সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
