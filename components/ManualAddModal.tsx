
import React, { useState } from 'react';
import { TransactionType } from '../types';

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; amount: number; type: TransactionType; note?: string }) => void;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.BAKI);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name || !amount) {
      alert("দয়া করে নাম এবং টাকার পরিমাণ লিখুন।");
      return;
    }
    onAdd({
      name,
      amount: Number(amount),
      type,
      note: note.trim()
    });
    // Reset and close
    setName('');
    setAmount('');
    setNote('');
    setType(TransactionType.BAKI);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-2xl rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        {/* Top Indicator Handle */}
        <div className="flex justify-center pt-4 mb-2">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className="px-8 pb-10 pt-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-[#1e293b]">নতুন হিসাব যোগ</h2>
            <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="space-y-5">
            {/* Customer Name Input */}
            <div>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="কাষ্টমারের নাম..."
                className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] text-lg font-bold text-slate-700 placeholder:text-slate-300 shadow-sm focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            {/* Amount Input */}
            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">৳</div>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-6 pl-12 bg-white border-2 border-slate-100 rounded-[2rem] text-3xl font-black text-slate-800 placeholder:text-slate-300 shadow-sm focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            {/* Note Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">বিবরণ / কারণ (যেমন: ফটোকপি, রিচার্জ)</label>
              <input 
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="কি কারণে বাকি? (ঐচ্ছিক)"
                className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] font-bold text-slate-700 placeholder:text-slate-300 shadow-sm focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            {/* Type Toggles */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button 
                onClick={() => setType(TransactionType.BAKI)}
                className={`py-5 rounded-[2rem] font-black text-lg transition-all shadow-md ${
                  type === TransactionType.BAKI 
                  ? 'bg-[#f97316] text-white shadow-orange-200 scale-105' 
                  : 'bg-white text-slate-400 border-2 border-slate-100'
                }`}
              >
                বাকি
              </button>
              <button 
                onClick={() => setType(TransactionType.BKASH_BAKI)}
                className={`py-5 rounded-[2rem] font-black text-lg transition-all shadow-md ${
                  type === TransactionType.BKASH_BAKI 
                  ? 'bg-white text-[#db2777] border-2 border-[#db2777] scale-105' 
                  : 'bg-white text-slate-400 border-2 border-slate-100'
                }`}
              >
                বিকাশ বাকি
              </button>
            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              className="w-full bg-[#059669] hover:bg-[#047857] text-white py-6 rounded-[2.5rem] font-black text-xl shadow-xl shadow-emerald-100 active:scale-95 transition-all mt-6"
            >
              হিসাব সেভ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
