
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
    const message = `আসসালামু আলাইকুম ${name}, বিসমিল্লাহ টেলিকম থেকে বলছি। আপনার কাছে বর্তমানে ${balance} টাকা পাওনা আছে। দয়া করে দ্রুত পরিশোধ করুন। ধন্যবাদ।`;
    const smsUrl = `sms:${phone || ''}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
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
    <div className="animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl active:scale-90 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-black text-slate-800">{name}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{phone || 'ফোন নম্বর নেই'}</p>
        </div>
        {balance > 0 && (
          <button 
            onClick={handleSendMessage}
            className="bg-indigo-100 p-3 rounded-2xl active:scale-90 transition-all text-indigo-600 shadow-sm"
            title="মেসেজ পাঠান"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        )}
      </div>

      {/* Balance Card */}
      <div className="bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl mb-8 relative overflow-hidden">
        <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-2">বর্তমানে মোট পাওনা</p>
        <h3 className="text-white text-5xl font-black tracking-tight mb-8">
           ৳ {balance.toLocaleString()}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setShowAddModal({ type: TransactionType.BAKI })}
            className="bg-rose-500 hover:bg-rose-400 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
          >
            বাকি দিন
          </button>
          <button 
            onClick={() => setShowAddModal({ type: TransactionType.CASH_PAYMENT })}
            className="bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
          >
            জমা নিন
          </button>
        </div>
      </div>

      {/* History */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-black text-slate-800">লেনদেনের ইতিহাস</h4>
        <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500">{transactions.length} টি</span>
      </div>

      <div className="space-y-1">
        {transactions.map(t => (
          <TransactionCard key={t.id} transaction={t} onDelete={onDelete} onClick={() => {}} />
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
               {showAddModal.type === TransactionType.BAKI ? 'বাকি যোগ করুন' : 'জমা যোগ করুন'}
            </h3>
            <div className="space-y-4">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="টাকার পরিমাণ" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black outline-none" autoFocus />
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
              <button onClick={handleQuickAdd} className={`w-full py-5 rounded-2xl font-black text-lg text-white shadow-xl ${showAddModal.type === TransactionType.BAKI ? 'bg-rose-500' : 'bg-emerald-500'}`}>নিশ্চিত করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
