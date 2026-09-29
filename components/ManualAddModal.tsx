
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
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">€</div>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-6 pl-12 bg-white border-2 border-slate-100 rounded-[2rem] text-3xl font-black text-slate-800 placeholder:text-slate-300 shadow-sm focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            {/* Category / Type Toggles */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">
                খাত / ক্যাটাগরি বাছাই করুন
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setType(TransactionType.BKASH_BAKI);
                    if (!note || ['বাকি', 'দোকানের বাকি', 'মোবাইল বাকি', 'নগদ পরিশোধ', 'বিকাশ জমা'].includes(note)) {
                      setNote('বিকাশ বাকি');
                    }
                  }}
                  className={`p-3 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center gap-1 transition-all border-2 ${
                    type === TransactionType.BKASH_BAKI 
                    ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-md scale-102' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <span className="text-base">⚡</span>
                  <span>বিকাশ বাকি</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setType(TransactionType.BAKI);
                    if (!note || ['বাকি', 'বিকাশ বাকি', 'মোবাইল বাকি', 'নগদ পরিশোধ', 'বিকাশ জমা'].includes(note)) {
                      setNote('দোকানের বাকি');
                    }
                  }}
                  className={`p-3 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center gap-1 transition-all border-2 ${
                    type === TransactionType.BAKI && note === 'দোকানের বাকি'
                    ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-md scale-102' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <span className="text-base">🛒</span>
                  <span>দোকানের বাকি</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setType(TransactionType.BAKI);
                    if (!note || ['বাকি', 'বিকাশ বাকি', 'দোকানের বাকি', 'নগদ পরিশোধ', 'বিকাশ জমা'].includes(note)) {
                      setNote('মোবাইল বাকি');
                    }
                  }}
                  className={`p-3 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center gap-1 transition-all border-2 ${
                    type === TransactionType.BAKI && note === 'মোবাইল বাকি'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md scale-102' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <span className="text-base">📱</span>
                  <span>মোবাইল বাকি</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setType(TransactionType.BAKI);
                    if (['দোকানের বাকি', 'বিকাশ বাকি', 'মোবাইল বাকি', 'নগদ পরিশোধ', 'বিকাশ জমা'].includes(note)) {
                      setNote('');
                    }
                  }}
                  className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1 transition-all border-2 ${
                    type === TransactionType.BAKI && !['দোকানের বাকি', 'মোবাইল বাকি'].includes(note)
                    ? 'bg-slate-800 border-slate-800 text-white shadow-sm' 
                    : 'bg-slate-50 border-slate-100 text-slate-500'
                  }`}
                >
                  <span>📝 সাধারণ বাকি</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setType(TransactionType.CASH_PAYMENT);
                    if (!note || ['বাকি', 'বিকাশ বাকি', 'দোকানের বাকি', 'মোবাইল বাকি', 'বিকাশ জমা'].includes(note)) {
                      setNote('নগদ পরিশোধ');
                    }
                  }}
                  className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1 transition-all border-2 ${
                    type === TransactionType.CASH_PAYMENT
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-700'
                  }`}
                >
                  <span>💵 নগদ জমা</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setType(TransactionType.BKASH_JOMA);
                    if (!note || ['বাকি', 'বিকাশ বাকি', 'দোকানের বাকি', 'মোবাইল বাকি', 'নগদ পরিশোধ'].includes(note)) {
                      setNote('বিকাশ জমা');
                    }
                  }}
                  className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1 transition-all border-2 ${
                    type === TransactionType.BKASH_JOMA
                    ? 'bg-pink-600 border-pink-600 text-white shadow-sm' 
                    : 'bg-pink-50/50 border-pink-100 text-pink-700'
                  }`}
                >
                  <span>💳 বিকাশ জমা</span>
                </button>
              </div>
            </div>

            {/* Note Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">
                বিবরণ / বিস্তারিত নোট (ঐচ্ছিক)
              </label>
              <input 
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="যেমন: বিকাশ বাকি, দোকানের বাকি, চাল-ডাল ইত্যাদি..."
                className="w-full p-5 bg-white border-2 border-slate-100 rounded-[2rem] font-bold text-slate-700 placeholder:text-slate-300 shadow-sm focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              className="w-full bg-[#059669] hover:bg-[#047857] text-white py-6 rounded-[2.5rem] font-black text-xl shadow-xl shadow-emerald-100 active:scale-95 transition-all mt-4"
            >
              হিসাব সেভ করুন ✅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
