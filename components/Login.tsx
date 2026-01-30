
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';

interface LoginProps {
  onLogin: (shopName: string, email: string) => void;
}

type AuthMode = 'login' | 'register';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        if (!shopName.trim()) throw new Error("দোকানের নাম লিখুন");
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { shop_name: shopName }
          }
        });
        if (signUpError) throw signUpError;
        
        localStorage.setItem('shopInfo', JSON.stringify({ name: shopName }));
        onLogin(shopName, email);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        const userShopName = data.user?.user_metadata?.shop_name || "আমার খাতা";
        localStorage.setItem('shopInfo', JSON.stringify({ name: userShopName }));
        onLogin(userShopName, email);
      }
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "ভুল ইমেইল বা পাসওয়ার্ড!" : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-[#0f172a]">
      {/* Top Icon - Wallet Icon fits "Baki" perfectly */}
      <div className="w-24 h-24 bg-[#0f172a] rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl animate-in zoom-in duration-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
          <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-4xl font-black mb-2 tracking-tight">বাকির যম</h1>
        <p className="text-[#94a3b8] font-black text-[10px] uppercase tracking-[0.2em]">বাকি টাকার ডিজিটাল হিসাব খাতা</p>
      </div>

      <div className="w-full max-w-md bg-white p-2 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
        {/* Tabs */}
        <div className="flex bg-[#f1f5f9] rounded-[3rem] p-1.5 mb-8">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-4 rounded-[2.5rem] text-sm font-black transition-all ${mode === 'login' ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#94a3b8]'}`}
          >
            লগইন
          </button>
          <button 
            onClick={() => setMode('register')}
            className={`flex-1 py-4 rounded-[2.5rem] text-sm font-black transition-all ${mode === 'register' ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#94a3b8]'}`}
          >
            নতুন অ্যাকাউন্ট
          </button>
        </div>

        <form onSubmit={handleAuth} className="px-6 pb-8 space-y-5">
          {mode === 'register' && (
            <div className="relative animate-in fade-in slide-in-from-top-2">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <input 
                type="text" 
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="দোকানের নাম লিখুন"
                className="w-full p-5 pl-14 bg-[#f8fafc] border-2 border-slate-50 rounded-2xl text-sm font-bold placeholder:text-slate-400 outline-none focus:border-[#0f172a]/10 transition-all"
                required
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ইমেইল অ্যাড্রেস"
              className="w-full p-5 pl-14 bg-[#f8fafc] border-2 border-slate-50 rounded-2xl text-sm font-bold placeholder:text-slate-400 outline-none focus:border-[#0f172a]/10 transition-all"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="পাসওয়ার্ড"
              className="w-full p-5 pl-14 pr-14 bg-[#f8fafc] border-2 border-slate-50 rounded-2xl text-sm font-bold placeholder:text-slate-400 outline-none focus:border-[#0f172a]/10 transition-all"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-center text-rose-500 text-[11px] font-black animate-pulse px-4">{error}</p>
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {mode === 'register' ? 'অ্যাকাউন্ট খুলুন' : 'অ্যাপে প্রবেশ করুন'}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="mt-12 flex items-center gap-2 opacity-40">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
        <p className="text-[10px] font-black uppercase tracking-widest">হিসাব রাখা এখন পানির মত সহজ</p>
      </div>
    </div>
  );
};
