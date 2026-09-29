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
  onDirectWhatsApp?: (customer: { name: string; balance: number; phone?: string }) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ 
  customer, 
  onClick, 
  onEditCustomer,
  onDirectWhatsApp
}) => {
  const initials = customer.name.charAt(0).toUpperCase();
  const isPositive = customer.balance > 0;

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-[1.8rem] border-2 border-slate-100 hover:border-emerald-200 transition-all flex items-center gap-3.5 cursor-pointer active:scale-[0.99] group shadow-sm hover:shadow-md"
    >
      <div className="w-13 h-13 sm:w-14 sm:h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-600/20 shrink-0">
        {initials}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-800 truncate text-base sm:text-lg">{customer.name}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {customer.phone ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              📞 {customer.phone}
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditCustomer) onEditCustomer(customer.name, '');
              }}
              className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
              title="মোবাইল নম্বর যোগ করুন"
            >
              + নম্বর দিন
            </button>
          )}

          <span className="text-[10px] text-slate-400 font-bold tracking-tight">
            • {customer.count} লেনদেন • {new Date(customer.lastDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      <div className="text-right flex items-center gap-2 shrink-0">
        <div>
          <p className={`font-black text-base sm:text-lg ${isPositive ? 'text-rose-600' : 'text-emerald-600'}`}>
            € {Math.abs(customer.balance).toLocaleString()}
          </p>
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            {isPositive ? 'বাকি পাওনা' : 'পরিশোধিত'}
          </p>
        </div>

        {/* WhatsApp quick trigger if has phone and has due */}
        {isPositive && customer.phone && onDirectWhatsApp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDirectWhatsApp(customer);
            }}
            className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all active:scale-90 border border-emerald-200/60"
            title="হোয়াটসঅ্যাপে তাগাদা মেসেজ পাঠান"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/></svg>
          </button>
        )}

        {onEditCustomer && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditCustomer(customer.name, customer.phone);
            }}
            className="p-2.5 bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-800 rounded-xl transition-all active:scale-90"
            title="নাম ও নম্বর এডিট করুন"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        )}
      </div>
    </div>
  );
};
