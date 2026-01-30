
import React from 'react';
import { Transaction, TransactionType } from '../types';

interface TransactionCardProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onClick: (transaction: Transaction) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onDelete, onClick }) => {
  const isBkash = transaction.type.includes('বিকাশ');
  const isJoma = transaction.type === TransactionType.BKASH_JOMA || transaction.type === TransactionType.CASH_PAYMENT;

  return (
    <div 
      className={`bg-white rounded-[1.5rem] p-5 mb-3 border-2 transition-all group cursor-pointer active:scale-[0.98] ${
        isJoma ? 'border-emerald-50 hover:border-emerald-100' : 'border-slate-50 hover:border-slate-100'
      }`}
      onClick={() => onClick(transaction)}
    >
      <div className="flex items-center gap-4">
        {/* Type Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
          isJoma ? 'bg-emerald-100 text-emerald-600' : 
          isBkash ? 'bg-pink-100 text-pink-600' : 'bg-orange-100 text-orange-600'
        }`}>
          {transaction.type === TransactionType.CASH_PAYMENT ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
          ) : isBkash ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-black text-slate-800 truncate text-lg">{transaction.name}</h3>
            <span className={`font-black text-xl shrink-0 ${isJoma ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isJoma ? '+' : '-'} ৳ {transaction.amount.toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between items-end mt-1">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    isJoma ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
                }`}>
                    {transaction.type}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {new Date(transaction.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {transaction.note && <p className="text-[10px] text-slate-500 mt-1 italic font-medium truncate"># {transaction.note}</p>}
            </div>

            {/* Delete Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                onDelete(transaction.id);
              }}
              className="ml-2 bg-rose-50 text-rose-400 hover:text-rose-600 p-2.5 rounded-xl transition-all active:scale-90"
              title="মুছে ফেলুন"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
