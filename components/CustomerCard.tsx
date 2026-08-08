
import React from 'react';

interface CustomerCardProps {
  customer: {
    name: string;
    balance: number;
    lastDate: string;
    count: number;
    phone?: string;
  };
  onClick: () => void;
  onEditCustomer?: (customerName: string, phone?: string) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onClick, onEditCustomer }) => {
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
          {customer.count} লেনদেন • {new Date(customer.lastDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
        </p>
      </div>

      <div className="text-right flex items-center gap-2">
        <div>
          <p className={`font-black text-lg ${isPositive ? 'text-rose-600' : 'text-emerald-600'}`}>
            € {Math.abs(customer.balance).toLocaleString()}
          </p>
          <div className="flex justify-end">
             <div className="bg-slate-100 group-hover:bg-emerald-50 p-1.5 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-emerald-500"><path d="m9 18 6-6-6-6"/></svg>
             </div>
          </div>
        </div>

        {onEditCustomer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCustomer(customer.name, customer.phone);
            }}
            className="p-2.5 bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-800 rounded-xl transition-all active:scale-90"
            title="কাস্টমারের নাম এডিট করুন"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        )}
      </div>
    </div>
  );
};
