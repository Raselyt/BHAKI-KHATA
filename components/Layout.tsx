
import React, { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onSyncClick?: () => void;
  onLogout?: () => void;
  username?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, onSyncClick, onLogout, username }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const initial = username ? username.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white shadow-xl relative">
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-[50] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f172a] p-2 rounded-2xl shadow-lg shadow-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 20H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-[#0f172a] leading-none">বাকির যম</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">ডিজিটাল খাতা</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onSyncClick && (
            <button 
              onClick={onSyncClick}
              className="p-2.5 text-slate-400 hover:text-[#0f172a] hover:bg-slate-50 rounded-2xl transition-all active:scale-90"
              title="ব্যাকআপ"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            </button>
          )}

          {/* Profile Pill as requested */}
          <div 
            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
            className="flex items-center gap-3 bg-[#f8fafc] p-1.5 pr-4 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all active:scale-95 group relative"
          >
            <div className="w-10 h-10 bg-[#0f172a] rounded-full flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
              {initial}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showLogoutConfirm ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>

            {/* Simple Logout Dropdown */}
            {showLogoutConfirm && onLogout && (
              <div className="absolute top-full right-0 mt-3 w-48 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 z-[60]">
                <div className="px-4 py-3 border-b border-slate-50 mb-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">লগইন আছেন</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{username}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors font-bold text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  লগ আউট
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24 bg-white">
        {children}
      </main>
      
      {/* Click outside closer for dropdown */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[55]" onClick={() => setShowLogoutConfirm(false)} />
      )}
    </div>
  );
};
