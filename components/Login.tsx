
import React, { useState, useEffect } from 'react';

interface LoginProps {
  onLogin: (shopName: string) => void;
}

type AuthMode = 'login' | 'register';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [shopName, setShopName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registeredShop, setRegisteredShop] = useState<{ name: string, pin: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('shopInfo');
    if (saved) {
      const parsed = JSON.parse(saved);
      setRegisteredShop(parsed);
      setMode('login');
    } else {
      setMode('register');
    }
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      showError("দোকানের নাম লিখুন");
      return;
    }
    if (pin.length < 4) {
      showError("কমপক্ষে ৪ সংখ্যার পিন দিন");
      return;
    }
    if (pin !== confirmPin) {
      showError("পিন দুটি মিলছে না!");
      return;
    }

    const shopInfo = { name: shopName, pin };
    localStorage.setItem('shopInfo', JSON.stringify(shopInfo));
    setRegisteredShop(shopInfo);
    onLogin(shopName);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (registeredShop && pin === registeredShop.pin) {
      onLogin(registeredShop.name);
    } else {
      showError("ভুল পিন! আবার চেষ্টা করুন।");
    }
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  return (
    <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background patterns */}
      <div className="absolute top-[-5%] left-[-5%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>

      <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl animate-in zoom-in duration-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black mb-2 animate-in slide-in-from-top duration-700">
          {mode === 'register' ? 'খাতা খুলুন' : 'লগইন করুন'}
        </h1>
        <p className="text-emerald-100 font-bold opacity-70 text-sm tracking-wide">
          {mode === 'register' ? 'আপনার দোকানের ডিজিটাল হিসাব শুরু করুন' : `স্বাগতম, ${registeredShop?.name || 'দোকানি'}`}
        </p>
      </div>

      <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl p-8 rounded-[3rem] border border-white/20 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-500">
        <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
          {mode === 'register' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 mb-2 block opacity-60">দোকানের নাম</label>
              <input 
                type="text" 
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="যেমন: বিসমিল্লাহ টেলিকম"
                className="w-full p-4 bg-white/10 border-2 border-white/20 rounded-2xl text-center text-lg font-bold placeholder:text-white/30 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 mb-2 block opacity-60">গোপন পিন</label>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="৪ সংখ্যার পিন"
              className={`w-full p-5 bg-white/10 border-2 ${error ? 'border-rose-400' : 'border-white/20'} rounded-2xl text-center text-3xl font-black placeholder:text-white/30 outline-none focus:bg-white/20 transition-all`}
              maxLength={4}
            />
          </div>

          {mode === 'register' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 mb-2 block opacity-60">পিন নিশ্চিত করুন</label>
              <input 
                type="password" 
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="আবার পিন দিন"
                className="w-full p-4 bg-white/10 border-2 border-white/20 rounded-2xl text-center text-lg font-bold placeholder:text-white/30 outline-none focus:bg-white/20 transition-all"
                maxLength={4}
              />
            </div>
          )}

          {error && (
            <div className="bg-rose-500/20 py-2 rounded-xl border border-rose-500/30">
               <p className="text-center text-rose-200 text-xs font-black animate-pulse">{error}</p>
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full bg-white text-emerald-700 py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all mt-6"
          >
            {mode === 'register' ? 'রেজিষ্ট্রেশন করুন' : 'লগইন করুন'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
           <button 
             onClick={() => {
               setMode(mode === 'login' ? 'register' : 'login');
               setError(null);
             }}
             className="text-emerald-100/70 font-black text-xs uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
           >
             {mode === 'login' ? (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                 নতুন অ্যাকাউন্ট খুলুন
               </>
             ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                 আগের অ্যাকাউন্টে লগইন
               </>
             )}
           </button>
        </div>
      </div>
      
      <p className="mt-12 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Bismillah Telecom • Digital Ledger</p>
    </div>
  );
};
