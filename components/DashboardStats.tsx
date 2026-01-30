
import React from 'react';
import { DashboardStats as StatsType } from '../types';

interface DashboardStatsProps {
  stats: StatsType;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {/* Primary Remaining Balance Card - Luxury Look */}
      <div className="bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#3730a3] p-7 rounded-[2.5rem] shadow-[0_20px_40px_rgba(79,70,229,0.25)] col-span-2 relative overflow-hidden group">
        <div className="relative z-10 text-white">
          <p className="text-[10px] text-indigo-100 font-black mb-1 uppercase tracking-[0.2em] opacity-80">বর্তমানে মোট পাওনা আছে</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">৳</span>
            <span className="text-5xl font-black tracking-tighter leading-tight">
              {stats.totalRemaining.toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:rotate-12 transition-transform duration-700">
           <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Total Given Card */}
      <div className="bg-[#fff1f2] p-6 rounded-[2.2rem] border border-rose-100 col-span-1 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-default">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-2 h-2 rounded-full bg-rose-500"></div>
           <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">মোট বাকি দিয়েছি</p>
        </div>
        <p className="text-2xl font-black text-rose-700 leading-none">৳ {stats.totalGiven.toLocaleString()}</p>
      </div>

      {/* Total Received Card */}
      <div className="bg-[#f0fdf4] p-6 rounded-[2.2rem] border border-emerald-100 col-span-1 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-default">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
           <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">মোট ফেরত পেয়েছি</p>
        </div>
        <p className="text-2xl font-black text-emerald-700 leading-none">৳ {stats.totalReceived.toLocaleString()}</p>
      </div>
    </div>
  );
};
