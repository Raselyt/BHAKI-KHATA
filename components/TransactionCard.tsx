
import React from 'react';
import { Transaction, TransactionType } from '../types';

interface TransactionCardProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  onSettle?: (transaction: Transaction) => void;
  onClick: (transaction: Transaction) => void;
  isSettled?: boolean;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onDelete, onEdit, onSettle, onClick, isSettled }) => {
  const isBkash = transaction.type.includes('বিকাশ');
  const isJoma = transaction.type === TransactionType.BKASH_JOMA || transaction.type === TransactionType.CASH_PAYMENT;
  const isBaki = transaction.type === TransactionType.BAKI || transaction.type === TransactionType.BKASH_BAKI;
  const isPaid = transaction.status === 'paid' || 
                 Boolean(isSettled) || 
                 Boolean(transaction.note && (transaction.note.includes('[পরিশোধিত]') || transaction.note.includes('(পরিশোধিত)')));
  const isPartial = transaction.status === 'partial' || Boolean(transaction.note && transaction.note.includes('[আংশিক পরিশোধ'));
  const remainingDue = Math.max(0, transaction.amount - (transaction.paidAmount || 0));

  return (
    <div 
      className={`bg-white rounded-[1.5rem] p-5 mb-3 border-2 transition-all group cursor-pointer active:scale-[0.98] ${
        isPaid 
          ? 'border-emerald-100/60 bg-emerald-50/10' 
          : isJoma 
            ? 'border-emerald-50 hover:border-emerald-100' 
            : isPartial
              ? 'border-amber-100 bg-amber-50/10'
              : 'border-slate-50 hover:border-slate-100'
      }`}
      onClick={() => onClick(transaction)}
    >
      <div className="flex items-center gap-4">
        {/* Type Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
          isPaid ? 'bg-emerald-100 text-emerald-700' :
          isJoma ? 'bg-emerald-100 text-emerald-600' : 
          isBkash ? 'bg-pink-100 text-pink-600' : 'bg-orange-100 text-orange-600'
        }`}>
          {isPaid ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          ) : transaction.type === TransactionType.CASH_PAYMENT ? (
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
            <div className="text-right">
              <span className={`font-black text-xl shrink-0 ${isJoma ? 'text-emerald-600' : isPaid ? 'text-slate-400 line-through' : 'text-rose-600'}`}>
                {isJoma ? '+' : '-'} € {transaction.amount.toLocaleString()}
              </span>
              {isPartial && (
                <div className="text-[11px] font-black text-rose-500">
                  বাকি: € {remainingDue.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-end mt-1">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    isJoma ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
                }`}>
                    {transaction.type}
                </span>

                {isPaid && (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    পরিশোধিত ✅
                  </span>
                )}

                {isPartial && (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    আংশিক (জমা €{transaction.paidAmount}) ⚡
                  </span>
                )}

                {!isPaid && !isPartial && isBaki && (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                    বকেয়া ⏳
                  </span>
                )}

                <span className="text-[10px] text-slate-400 font-bold">
                  {new Date(transaction.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {transaction.note && <p className="text-[10px] text-slate-500 mt-1 italic font-medium truncate"># {transaction.note}</p>}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick Settle Button for Unpaid/Partial Baki */}
              {isBaki && !isPaid && onSettle && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettle(transaction);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 shadow-md shadow-emerald-100 transition-all active:scale-90"
                  title="এই খাতটি পরিশোধ করুন"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>পরিশোধ</span>
                </button>
              )}

              {/* Edit Button */}
              {onEdit && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); 
                    onEdit(transaction);
                  }}
                  className="bg-amber-50 text-amber-500 hover:text-amber-700 p-2.5 rounded-xl transition-all active:scale-90"
                  title="এডিট করুন"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}

              {/* Delete Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  onDelete(transaction.id);
                }}
                className="bg-rose-50 text-rose-400 hover:text-rose-600 p-2.5 rounded-xl transition-all active:scale-90"
                title="মুছে ফেলুন"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
