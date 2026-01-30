
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onSyncClick?: () => void;
  onLogout?: () => void;
  username?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, onSyncClick, onLogout, username }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white shadow-xl relative">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-[50] flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1.5 rounded-xl shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 20H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">বাকি ও বিকাশ খাতা</h1>
            {username && <p className="text-[10px] font-bold text-emerald-100 mt-0.5 opacity-80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></span>
              {username}
            </p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onSyncClick && (
            <button 
              onClick={onSyncClick}
              className="bg-emerald-500 hover:bg-emerald-400 p-2.5 rounded-2xl transition-all active:scale-95 flex items-center gap-2"
              title="ব্যাকআপ ও সিঙ্ক"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span className="text-[10px] font-black hidden sm:inline uppercase">ব্যাকআপ</span>
            </button>
          )}
          {onLogout && (
            <button 
              onClick={onLogout}
              className="bg-rose-500 hover:bg-rose-400 p-2.5 rounded-2xl transition-all active:scale-95"
              title="লগ আউট"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {children}
      </main>
    </div>
  );
};
