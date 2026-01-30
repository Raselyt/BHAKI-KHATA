
import React from 'react';

interface CustomerCardProps {
  customer: {
    name: string;
    balance: number;
    lastDate: string;
    count: number;
  };
  onClick: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onClick }) => {
  const initials = customer.name.charAt(0).toUpperCase();
  const isPositive = customer.balance > 0;

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-[1.5rem] border-2 border-slate-50 hover:border-emerald-100 transition-all flex items-center gap-4 cursor-pointer active:scale-[0.98] group"
    >
      <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-100 shrink-0">
        {initials}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-slate-800 truncate text-lg">{customer.name}</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
          {customer.count} লেনদেন • {new Date(customer.lastDate).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
        </p>
      </div>

      <div className="text-right">
        <p className={`font-black text-lg ${isPositive ? 'text-rose-600' : 'text-emerald-600'}`}>
          ৳ {Math.abs(customer.balance).toLocaleString()}
        </p>
        <div className="flex justify-end">
           <div className="bg-slate-100 group-hover:bg-emerald-50 p-1.5 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-emerald-500"><path d="m9 18 6-6-6-6"/></svg>
           </div>
        </div>
      </div>
    </div>
  );
};
