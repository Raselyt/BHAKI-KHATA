
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from './components/Layout.tsx';
import { Transaction, TransactionType, DashboardStats as StatsType } from './types.ts';
import { TransactionCard } from './components/TransactionCard.tsx';
import { DashboardStats } from './components/DashboardStats.tsx';
import { SmartAddInput } from './components/SmartAddInput.tsx';
import { supabase } from './lib/supabase.ts';

const App: React.FC = () => {
  // --- Auth State ---
  const [session, setSession] = useState<any>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  // --- App State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerPhones, setCustomerPhones] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'single' | 'folder'; id?: string; name?: string; }>({ isOpen: false, type: 'single' });
  const [formData, setFormData] = useState({ name: '', amount: '', type: TransactionType.BAKI, note: '' });

  // 1. Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.error("Supabase connection error:", err);
      } finally {
        setBootstrapping(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Load Data from Supabase when session changes
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      // Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      // Fetch Customer Phones
      const { data: phData, error: phError } = await supabase
        .from('customer_phones')
        .select('*');

      if (phError) throw phError;
      const phMap: Record<string, string> = {};
      phData?.forEach(p => phMap[p.name] = p.phone);
      setCustomerPhones(phMap);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Auth Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { email, password } = authForm;

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("একাউন্ট তৈরি হয়েছে! ইমেইল চেক করুন অথবা এখন লগইন করুন।");
        setIsSignup(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message || "লগইন এ সমস্যা হয়েছে। আপনার তথ্য চেক করুন।");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTransactions([]);
    setCustomerPhones({});
  };

  // --- Data Handlers ---
  const handleAddTransaction = async (data?: { name: string; amount: number; type: TransactionType; note?: string }) => {
    if (!session) return;
    const nameToUse = (data?.name || formData.name).trim();
    const amountToUse = data?.amount || Number(formData.amount);
    const typeToUse = data?.type || formData.type;
    const noteToUse = data?.note || formData.note;
    
    if (!nameToUse || isNaN(amountToUse) || amountToUse <= 0) { alert("সঠিক নাম ও পরিমাণ লিখুন"); return; }
    
    const newTx = { 
      name: nameToUse, 
      amount: amountToUse, 
      type: typeToUse, 
      date: new Date().toISOString(),
      note: noteToUse?.trim() || undefined,
      user_id: session.user.id
    };
    
    try {
      const { data: inserted, error } = await supabase.from('transactions').insert([newTx]).select();
      if (error) throw error;
      if (inserted) setTransactions(prev => [inserted[0], ...prev]);
      setIsModalOpen(false);
      setFormData({ name: '', amount: '', type: TransactionType.BAKI, note: '' });
    } catch (error: any) {
      alert("সেভ করতে সমস্যা হয়েছে: " + error.message);
    }
  };

  const confirmDeleteAction = async () => {
    try {
      if (deleteConfirm.type === 'single' && deleteConfirm.id) {
        const { error } = await supabase.from('transactions').delete().eq('id', deleteConfirm.id);
        if (error) throw error;
        setTransactions(prev => prev.filter(t => t.id !== deleteConfirm.id));
      } else if (deleteConfirm.type === 'folder' && deleteConfirm.name) {
        const { error } = await supabase.from('transactions').delete().eq('name', deleteConfirm.name);
        if (error) throw error;
        setTransactions(prev => prev.filter(t => t.name !== deleteConfirm.name));
        setSelectedPerson(null);
      }
      setDeleteConfirm({ isOpen: false, type: 'single' });
    } catch (error: any) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + error.message);
    }
  };

  const handleRenameCustomer = async () => {
    const targetName = newName.trim();
    if (!selectedPerson || !targetName) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ name: targetName })
        .eq('name', selectedPerson);
      
      if (error) throw error;

      setTransactions(prev => prev.map(tx => tx.name === selectedPerson ? { ...tx, name: targetName } : tx));
      
      if (customerPhones[selectedPerson]) {
        await supabase.from('customer_phones').update({ name: targetName }).eq('name', selectedPerson);
        setCustomerPhones(prev => {
          const next = { ...prev };
          next[targetName] = next[selectedPerson];
          delete next[selectedPerson];
          return next;
        });
      }

      setSelectedPerson(targetName);
      setIsRenameModalOpen(false);
    } catch (error: any) {
      alert("নাম পরিবর্তন করতে সমস্যা হয়েছে: " + error.message);
    }
  };

  const handleSavePhone = async () => {
    if (!selectedPerson || !session) return;
    const phone = newPhone.trim();
    try {
      const { error } = await supabase
        .from('customer_phones')
        .upsert([{ name: selectedPerson, phone, user_id: session.user.id }], { onConflict: 'name,user_id' });
      
      if (error) throw error;
      setCustomerPhones(prev => ({ ...prev, [selectedPerson]: phone }));
      setIsPhoneModalOpen(false);
    } catch (error: any) {
      alert("নাম্বার সেভ করতে সমস্যা হয়েছে: " + error.message);
    }
  };

  const handlePayment = async () => {
    if (!selectedPerson || !payAmount || !session) return;
    const pAmount = parseFloat(payAmount);
    if (isNaN(pAmount) || pAmount <= 0) return;
    
    const paymentRecord = { 
      name: selectedPerson, 
      amount: pAmount, 
      type: TransactionType.CASH_PAYMENT, 
      date: new Date().toISOString(), 
      note: `পরিশোধিত`,
      user_id: session.user.id
    };

    try {
      const { data: inserted, error } = await supabase.from('transactions').insert([paymentRecord]).select();
      if (error) throw error;
      if (inserted) setTransactions(prev => [inserted[0], ...prev]);
      setIsPayModalOpen(false);
      setPayAmount('');
    } catch (error: any) {
      alert("পেমেন্ট যোগ করতে সমস্যা হয়েছে");
    }
  };

  const stats = useMemo<StatsType>(() => {
    return transactions.reduce((acc, curr) => {
      if (curr.type === TransactionType.BAKI || curr.type === TransactionType.BKASH_BAKI) { acc.totalGiven += curr.amount; }
      else { acc.totalReceived += curr.amount; }
      acc.totalRemaining = acc.totalGiven - acc.totalReceived;
      acc.recentCount += 1;
      return acc;
    }, { totalGiven: 0, totalReceived: 0, totalRemaining: 0, recentCount: 0 });
  }, [transactions]);

  const customerFolders = useMemo(() => {
    const folders: Record<string, { balance: number; transactions: Transaction[] }> = {};
    transactions.forEach(tx => {
      const name = tx.name.trim();
      if (!name) return;
      if (!folders[name]) folders[name] = { balance: 0, transactions: [] };
      folders[name].transactions.push(tx);
      if (tx.type === TransactionType.BAKI || tx.type === TransactionType.BKASH_BAKI) folders[name].balance += tx.amount;
      else folders[name].balance -= tx.amount;
    });
    return folders;
  }, [transactions]);

  const filteredCustomerList = useMemo(() => {
    return Object.entries(customerFolders).filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a[0].localeCompare(b[0]));
  }, [customerFolders, searchQuery]);

  // Initializing View
  if (bootstrapping) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400">খাতা চালু হচ্ছে...</p>
      </div>
    );
  }

  // Auth View
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-100 mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">ক্লাউড বাকি খাতা</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1 text-center">অনলাইন ব্যাকআপ ও সিকিউর হিসাব</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইমেইল ঠিকানা</label>
              <input 
                type="email" 
                value={authForm.email}
                onChange={e => setAuthForm(p => ({...p, email: e.target.value}))}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none rounded-2xl font-bold transition-all"
                placeholder="test@example.com"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
              <input 
                type="password" 
                value={authForm.password}
                onChange={e => setAuthForm(p => ({...p, password: e.target.value}))}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none rounded-2xl font-bold transition-all"
                placeholder="******"
                required
              />
            </div>
            <button 
              disabled={authLoading}
              className={`w-full bg-emerald-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all mt-4 ${authLoading ? 'opacity-50' : 'hover:bg-emerald-700'}`}
            >
              {authLoading ? 'কাজ চলছে...' : isSignup ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-medium">
              {isSignup ? 'অলরেডি একাউন্ট আছে?' : 'একাউন্ট নেই?'} 
              <button 
                onClick={() => setIsSignup(!isSignup)} 
                className="ml-2 text-emerald-600 font-black hover:underline"
              >
                {isSignup ? 'লগইন করুন' : 'নতুন একাউন্ট খুলুন'}
              </button>
            </p>
          </div>
        </div>
        <p className="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">ডাটাবেস কানেক্টেড (Supabase)</p>
      </div>
    );
  }

  return (
    <Layout 
      onLogout={handleLogout}
      username={session.user.email}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
           <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="font-bold text-slate-400 animate-pulse">ডাটা লোড হচ্ছে...</p>
        </div>
      ) : selectedPerson && customerFolders[selectedPerson] ? (
        <div className="animate-in slide-in-from-right duration-300">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedPerson(null)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg></button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-800">{selectedPerson}</h2>
                    <button onClick={() => { setNewName(selectedPerson); setIsRenameModalOpen(true); }} className="text-slate-400 hover:text-emerald-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">ব্যক্তিগত ফোল্ডার</p>
                </div>
              </div>
           </div>
           
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-6 shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest">বর্তমানে মোট পাওনা</p>
                <p className="text-5xl font-black tracking-tighter mb-8">৳ {customerFolders[selectedPerson].balance.toLocaleString()}</p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setFormData({name: selectedPerson!, amount: '', type: TransactionType.BAKI, note: ''}); setIsModalOpen(true); }} className="bg-rose-500 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">বাকি দিন</button>
                  <button onClick={() => { setSelectedPerson(selectedPerson); setPayAmount(''); setIsPayModalOpen(true); }} className="bg-emerald-500 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">জমা নিন</button>
                </div>
              </div>
           </div>
           
           <div className="space-y-1">
              {customerFolders[selectedPerson].transactions.map(tx => (
                <TransactionCard key={tx.id} transaction={tx} onDelete={(id) => setDeleteConfirm({ isOpen: true, type: 'single', id })} onClick={() => {}} />
              ))}
           </div>
        </div>
      ) : (
        <>
          <DashboardStats stats={stats} />
          <SmartAddInput onParsed={handleAddTransaction} />
          
          <div className="relative mb-6">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="নাম দিয়ে কাস্টমার খুঁজুন..." 
              className="w-full bg-white border-2 border-slate-50 rounded-2xl py-4 px-6 text-slate-700 font-bold focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400 shadow-sm" 
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
              {filteredCustomerList.map(([name, data]) => {
                const folderData = data as { balance: number; transactions: Transaction[] };
                const phone = customerPhones[name];
                return (
                  <div key={name} onClick={() => setSelectedPerson(name)} className="bg-white border border-slate-100 rounded-3xl p-4 flex items-center justify-between hover:border-emerald-500 hover:bg-emerald-50/10 transition-all cursor-pointer shadow-sm active:scale-95 group">
                     <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">{name[0]}</div>
                        <div className="min-w-0">
                           <h3 className="font-bold text-slate-800 text-lg leading-none mb-1 group-hover:text-emerald-700 truncate">{name}</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{folderData.transactions.length} লেনদেন {phone ? `• ${phone}` : ''}</p>
                        </div>
                     </div>
                     <div className="text-right min-w-[90px]">
                        <p className={`text-xl font-black ${folderData.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                           ৳ {folderData.balance.toLocaleString()}
                        </p>
                     </div>
                  </div>
                );
              })}
            </div>
        </>
      )}

      {/* Modals maintained from previous version */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-slate-800">নতুন হিসাব যোগ</h2><button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-3 rounded-2xl text-slate-400 hover:text-rose-500"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div className="space-y-6 pb-8">
              <input type="text" value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-lg shadow-sm" placeholder="কাস্টমারের নাম..." />
              <input type="number" value={formData.amount} onChange={e => setFormData(prev => ({...prev, amount: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-rose-500 focus:outline-none font-black text-2xl text-rose-600 shadow-sm" placeholder="৳ 0.00" />
              <input type="text" value={formData.note} onChange={e => setFormData(prev => ({...prev, note: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-lg shadow-sm" placeholder="বিবরণ (ঐচ্ছিক)" />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setFormData(p => ({...p, type: TransactionType.BAKI}))} className={`py-5 rounded-2xl font-black border-2 transition-all ${formData.type === TransactionType.BAKI ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-orange-600'}`}>বাকি</button>
                <button onClick={() => setFormData(p => ({...p, type: TransactionType.BKASH_BAKI}))} className={`py-5 rounded-2xl font-black border-2 transition-all ${formData.type === TransactionType.BKASH_BAKI ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-pink-600'}`}>বিকাশ বাকি</button>
              </div>
              <button onClick={() => handleAddTransaction()} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xl active:scale-95 transition-all mt-4 hover:bg-emerald-600 shadow-2xl">হিসাব সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">{selectedPerson}</h2>
            <input type="number" autoFocus value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full p-6 rounded-3xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none text-3xl font-black text-emerald-600 text-center mb-6" placeholder="৳ 0" />
            <div className="flex gap-3"><button onClick={() => setIsPayModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100">বাতিল</button><button onClick={handlePayment} className="flex-1 py-4 rounded-2xl font-bold text-white bg-emerald-600 shadow-xl">জমা নিন</button></div>
          </div>
        </div>
      )}

      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[120] p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
             <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">মুছে ফেলতে চান?</h2>
             <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">এই তথ্য চিরতরে মুছে যাবে।</p>
             <div className="flex flex-col gap-3"><button onClick={confirmDeleteAction} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-lg">হ্যাঁ, মুছে ফেলুন</button><button onClick={() => setDeleteConfirm({ isOpen: false, type: 'single' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold">বাতিল</button></div>
          </div>
        </div>
      )}

      <button onClick={() => { setFormData({ name: '', amount: '', type: TransactionType.BAKI, note: '' }); setIsModalOpen(true); }} className="fixed bottom-8 right-6 w-16 h-16 bg-emerald-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:bg-emerald-700 active:scale-90 z-20 shadow-emerald-200 transition-all">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </Layout>
  );
};

export default App;
