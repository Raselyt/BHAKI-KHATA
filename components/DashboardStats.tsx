
import React from 'react';
import { DashboardStats as StatsType } from '../types';

interface DashboardStatsProps {
  stats: StatsType;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {/* Primary Remaining Balance Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-[2rem] shadow-xl shadow-indigo-100 col-span-2 relative overflow-hidden group">
        <div className="relative z-10 flex justify-between items-center text-white">
          <div>
            <p className="text-[10px] text-indigo-100 font-black mb-1 uppercase tracking-widest opacity-80">বর্তমানে মোট পাওনা আছে</p>
            <p className="text-4xl font-black tracking-tight">€ {stats.totalRemaining.toLocaleString()}</p>
          </div>
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md transform group-hover:rotate-12 transition-transform duration-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-8 -top-8 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Total Given Card */}
      <div className="bg-rose-50 p-5 rounded-[2rem] border-2 border-rose-100 col-span-1 group hover:bg-rose-100 transition-colors">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
           <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">মোট বাকি দিয়েছি</p>
        </div>
        <p className="text-2xl font-black text-rose-700">€ {stats.totalGiven.toLocaleString()}</p>
      </div>

      {/* Total Received Card */}
      <div className="bg-emerald-50 p-5 rounded-[2rem] border-2 border-emerald-100 col-span-1 group hover:bg-emerald-100 transition-colors">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">মোট ফেরত পেয়েছি</p>
        </div>
        <p className="text-2xl font-black text-emerald-700">€ {stats.totalReceived.toLocaleString()}</p>
      </div>
    </div>
  );
};
