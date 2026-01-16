
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white shadow-xl relative">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-[50] flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1.5 rounded-xl shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <h1 className="text-xl font-black tracking-tight">বাকি ও বিকাশ খাতা</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSelectKey}
            className="bg-emerald-500 hover:bg-emerald-400 p-2.5 rounded-2xl transition-all active:scale-95 flex items-center gap-2"
            title="AI কানেক্ট করুন"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">AI Setup</span>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {children}
      </main>
    </div>
  );
};
