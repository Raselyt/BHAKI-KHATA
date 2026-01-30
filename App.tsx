
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from './components/Layout';
import { Transaction, TransactionType, DashboardStats as StatsType, User } from './types';
import { TransactionCard } from './components/TransactionCard';
import { DashboardStats } from './components/DashboardStats';
import { SmartAddInput } from './components/SmartAddInput';

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  // --- App State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerPhones, setCustomerPhones] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncCode, setSyncCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'single' | 'folder'; id?: string; name?: string; }>({ isOpen: false, type: 'single' });
  const [formData, setFormData] = useState({ name: '', amount: '', type: TransactionType.BAKI, note: '' });

  // 1. Check for logged in user on start
  useEffect(() => {
    const savedUser = localStorage.getItem('baki_khata_active_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // 2. Load transactions for the specific user
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.username;
    const savedTx = localStorage.getItem(`baki_khata_transactions_${userId}`);
    const savedPh = localStorage.getItem(`baki_khata_phones_${userId}`);
    if (savedTx) {
      try { setTransactions(JSON.parse(savedTx)); } catch (e) { console.error(e); }
    } else {
      setTransactions([]);
    }
    if (savedPh) {
      try { setCustomerPhones(JSON.parse(savedPh)); } catch (e) { console.error(e); }
    } else {
      setCustomerPhones({});
    }
  }, [currentUser]);

  // 3. Save transactions for the specific user
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.username;
    localStorage.setItem(`baki_khata_transactions_${userId}`, JSON.stringify(transactions));
    localStorage.setItem(`baki_khata_phones_${userId}`, JSON.stringify(customerPhones));
  }, [transactions, customerPhones, currentUser]);

  // --- Auth Handlers ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const { username, password } = authForm;
    if (!username || !password) return alert("ইউজারনেম ও পাসওয়ার্ড দিন");

    const usersStr = localStorage.getItem('baki_khata_users');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (isSignup) {
      if (users.find(u => u.username === username)) return alert("এই নামে অলরেডি একাউন্ট আছে");
      const newUser: User = { id: crypto.randomUUID(), username, passwordHash: password }; // Simple storage for demo
      users.push(newUser);
      localStorage.setItem('baki_khata_users', JSON.stringify(users));
      alert("একাউন্ট তৈরি হয়েছে! এখন লগইন করুন।");
      setIsSignup(false);
    } else {
      const user = users.find(u => u.username === username && u.passwordHash === password);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('baki_khata_active_user', JSON.stringify(user));
      } else {
        alert("ভুল ইউজারনেম বা পাসওয়ার্ড!");
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('baki_khata_active_user');
    setTransactions([]);
    setCustomerPhones({});
  };

  // --- App Logic ---
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

  const handleAddTransaction = (data?: { name: string; amount: number; type: TransactionType; note?: string }) => {
    const nameToUse = (data?.name || formData.name).trim();
    const amountToUse = data?.amount || Number(formData.amount);
    const typeToUse = data?.type || formData.type;
    const noteToUse = data?.note || formData.note;
    
    if (!nameToUse || isNaN(amountToUse) || amountToUse <= 0) { alert("সঠিক নাম ও পরিমাণ লিখুন"); return; }
    
    const newTx: Transaction = { 
      id: crypto.randomUUID(), 
      name: nameToUse, 
      amount: amountToUse, 
      type: typeToUse, 
      date: new Date().toISOString(),
      note: noteToUse.trim() || undefined
    };
    
    setTransactions(prev => [newTx, ...prev]);
    setIsModalOpen(false);
    setFormData({ name: '', amount: '', type: TransactionType.BAKI, note: '' });
  };

  const confirmDeleteAction = () => {
    if (deleteConfirm.type === 'single' && deleteConfirm.id) {
      const updated = transactions.filter(t => t.id !== deleteConfirm.id);
      setTransactions(updated);
      if (selectedPerson && !updated.some(t => t.name.trim() === selectedPerson)) setSelectedPerson(null);
    } else if (deleteConfirm.type === 'folder' && deleteConfirm.name) {
      const updated = transactions.filter(t => t.name.trim() !== deleteConfirm.name);
      setTransactions(updated);
      setSelectedPerson(null);
    }
    setDeleteConfirm({ isOpen: false, type: 'single' });
  };

  const handleRenameCustomer = () => {
    const targetName = newName.trim();
    if (!selectedPerson || !targetName) return;
    const updatedTransactions = transactions.map(tx => (tx.name.trim() === selectedPerson ? { ...tx, name: targetName } : tx));
    setTransactions(updatedTransactions);
    if (customerPhones[selectedPerson]) {
      const updatedPhones = { ...customerPhones };
      updatedPhones[targetName] = updatedPhones[selectedPerson];
      delete updatedPhones[selectedPerson];
      setCustomerPhones(updatedPhones);
    }
    setSelectedPerson(targetName);
    setIsRenameModalOpen(false);
  };

  const handleSavePhone = () => {
    if (!selectedPerson) return;
    setCustomerPhones(prev => ({ ...prev, [selectedPerson]: newPhone.trim() }));
    setIsPhoneModalOpen(false);
  };

  const initiateCall = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = customerPhones[name];
    if (phone) window.location.href = `tel:${phone}`;
    else { setSelectedPerson(name); setNewPhone(''); setIsPhoneModalOpen(true); }
  };

  const initiateSMS = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = customerPhones[name];
    const balance = customerFolders[name]?.balance || 0;
    
    if (phone) {
      const txs = customerFolders[name].transactions;
      const reasonsList = txs
        .filter(t => t.note && (t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI))
        .map(t => t.note!)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);
        
      const detailStr = reasonsList.length > 0 ? ` (বিবরণ: ${reasonsList.join(', ')})` : '';
      const message = encodeURIComponent(`আসসালামু আলাইকুম, ${name}। আপনার নিকট আমাদের বকেয়া পাওনা ৳${balance.toLocaleString()}${detailStr}। অনুগ্রহ করে পরিশোধ করবেন। ধন্যবাদ।`);
      window.location.href = `sms:${phone}?body=${message}`;
    } else { 
      setSelectedPerson(name); 
      setNewPhone(''); 
      setIsPhoneModalOpen(true); 
    }
  };

  const handlePayment = () => {
    if (!selectedPerson || !payAmount) return;
    const pAmount = parseFloat(payAmount);
    if (isNaN(pAmount) || pAmount <= 0) return;
    const paymentRecord: Transaction = { id: crypto.randomUUID(), name: selectedPerson, amount: pAmount, type: TransactionType.CASH_PAYMENT, date: new Date().toISOString(), note: `পরিশোধিত` };
    setTransactions(prev => [paymentRecord, ...prev]);
    setIsPayModalOpen(false);
  };

  // --- STABLE SYNC LOGIC ---
  const utf8_to_b64 = (str: string) => {
    return window.btoa(unescape(encodeURIComponent(str)));
  };

  const b64_to_utf8 = (str: string) => {
    return decodeURIComponent(escape(window.atob(str)));
  };

  const generateExportCode = () => {
    try {
      const data = { transactions, customerPhones, v: "2.1" };
      const code = utf8_to_b64(JSON.stringify(data));
      setSyncCode(code);
      alert("কোড তৈরি হয়েছে! এটি কপি করে অন্য মোবাইলে নিয়ে যান।");
    } catch (e) {
      alert("কোড তৈরি করতে সমস্যা হয়েছে।");
    }
  };

  const handleCopyCode = () => {
    if (!syncCode) return;
    if (syncTextAreaRef.current) {
      syncTextAreaRef.current.select();
      try {
        document.execCommand('copy');
        alert("কোড কপি হয়েছে!");
      } catch (e) {
        alert("দয়া করে বক্সের লেখাটি ম্যানুয়ালি কপি করুন।");
      }
    }
  };

  const handleImportCode = () => {
    const code = syncCode.trim();
    if (!code) { alert("বক্সে কোড পেস্ট করুন।"); return; }
    try {
      const decodedStr = b64_to_utf8(code);
      const decoded = JSON.parse(decodedStr);
      
      if (decoded && Array.isArray(decoded.transactions)) {
        if (window.confirm("আপনি কি নিশ্চিত? আগের সব হিসাব মুছে যাবে এবং নতুন হিসাবগুলো চলে আসবে।")) {
          setTransactions(decoded.transactions);
          setCustomerPhones(decoded.customerPhones || {});
          alert("ডাটা সফলভাবে রিস্টোর হয়েছে!");
          setIsSyncModalOpen(false);
        }
      } else {
        alert("কোডটি সঠিক নয়।");
      }
    } catch (e) {
      alert("ভুল কোড! দয়া করে সঠিক কোডটি পেস্ট করুন।");
    }
  };

  const handleDownloadFile = () => {
    try {
      const data = { transactions, customerPhones, v: "2.1" };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `baki_khata_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("ব্যাকআপ ফাইল তৈরি করতে সমস্যা হয়েছে।");
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const decoded = JSON.parse(content);
        
        if (decoded && Array.isArray(decoded.transactions)) {
          if (window.confirm("আপনি কি নিশ্চিত? আগের সব হিসাব মুছে যাবে এবং নতুন হিসাবগুলো চলে আসবে।")) {
             setTransactions(decoded.transactions);
             setCustomerPhones(decoded.customerPhones || {});
             alert("ডাটা সফলভাবে রিস্টোর হয়েছে!");
             setIsSyncModalOpen(false);
          }
        } else {
          alert("ফাইলটি সঠিক নয়।");
        }
      } catch (err) {
        alert("ফাইল পড়তে সমস্যা হয়েছে।");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Auth View ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-100 mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">ডিজিটাল বাকি খাতা</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">দোকানের হিসাব এখন হাতের মুঠোয়</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজারনেম</label>
              <input 
                type="text" 
                value={authForm.username}
                onChange={e => setAuthForm(p => ({...p, username: e.target.value}))}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none rounded-2xl font-bold transition-all"
                placeholder="আপনার নাম..."
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
              />
            </div>
            <button className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all mt-4">
              {isSignup ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন'}
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
        <p className="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Privacy Secure & Made with Love</p>
      </div>
    );
  }

  return (
    <Layout 
      onSyncClick={() => setIsSyncModalOpen(true)} 
      onLogout={handleLogout}
      username={currentUser.username}
    >
      {selectedPerson && customerFolders[selectedPerson] ? (
        <div className="animate-in slide-in-from-right duration-300">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedPerson(null)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg></button>
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-2xl font-black text-slate-800">{selectedPerson}</h2><button onClick={() => { setNewName(selectedPerson); setIsRenameModalOpen(true); }} className="text-slate-400 hover:text-emerald-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button></div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">ব্যক্তিগত ফোল্ডার</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={(e) => initiateCall(selectedPerson!, e)} className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                 <button onClick={(e) => initiateSMS(selectedPerson!, e)} className="bg-pink-600 text-white p-3 rounded-2xl hover:bg-pink-700 shadow-lg shadow-pink-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
              </div>
           </div>
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-6 shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest">বর্তমানে মোট পাওনা</p>
                <p className="text-5xl font-black tracking-tighter mb-8">৳ {customerFolders[selectedPerson].balance.toLocaleString()}</p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setFormData({name: selectedPerson!, amount: '', type: TransactionType.BAKI, note: ''}); setIsModalOpen(true); }} className="bg-rose-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-900/20 active:scale-95 transition-all">বাকি দিন</button>
                  <button onClick={() => { setSelectedPerson(selectedPerson); setPayAmount(''); setIsPayModalOpen(true); }} className="bg-emerald-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">জমা নিন</button>
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
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="নাম দিয়ে কাস্টমার খুঁজুন..." className="w-full bg-white border-2 border-slate-50 rounded-2xl py-4 px-6 text-slate-700 font-bold focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400 shadow-sm" />
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
                     <div className="flex items-center gap-2">
                        <button onClick={(e) => initiateCall(name, e)} className={`p-3 rounded-2xl transition-all ${phone ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-slate-50 text-slate-300 hover:text-indigo-600'}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                        <div className="text-right min-w-[90px]"><p className={`text-xl font-black ${folderData.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>৳ {folderData.balance.toLocaleString()}</p></div>
                     </div>
                  </div>
                );
              })}
            </div>
        </>
      )}

      {/* Simplified Sync Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[120] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[95vh]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">ডাটা সিংকিং</h2>
                <button onClick={() => setIsSyncModalOpen(false)} className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-2">সিংকিং কোড বক্স</p>
                  
                  <textarea 
                    ref={syncTextAreaRef}
                    value={syncCode}
                    onChange={(e) => setSyncCode(e.target.value)}
                    placeholder="কোডটি এখানে পেস্ট করুন অথবা এখান থেকে কপি করুন..."
                    className="w-full h-40 p-3 rounded-xl border-2 border-emerald-100 focus:border-emerald-500 focus:outline-none text-[10px] font-mono bg-white resize-none shadow-inner break-all"
                  />
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={generateExportCode} className="bg-slate-800 text-white py-4 rounded-xl font-bold text-sm shadow-lg">কোড তৈরি করুন</button>
                    <button onClick={handleImportCode} className="bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm shadow-lg">ডাটা ইম্পোর্ট</button>
                  </div>

                  {syncCode && (
                    <button onClick={handleCopyCode} className="w-full mt-3 bg-emerald-600 text-white py-4 rounded-xl font-bold text-base shadow-lg">কপি করুন</button>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase text-center">বিকল্প ফাইল পদ্ধতি</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleDownloadFile} className="bg-slate-100 text-slate-700 p-3 rounded-xl font-bold text-xs border border-slate-200">ফাইল নামান</button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-slate-50 text-slate-500 p-3 rounded-xl font-bold text-xs border border-slate-200">ফাইল ইম্পোর্ট</button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleUploadFile} accept=".json" className="hidden" />
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh]">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-slate-800">নতুন হিসাব যোগ</h2><button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-3 rounded-2xl text-slate-400 hover:text-rose-500"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div className="space-y-6 pb-8">
              <input type="text" value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-lg shadow-sm" placeholder="কাস্টমারের নাম..." />
              <input type="number" value={formData.amount} onChange={e => setFormData(prev => ({...prev, amount: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-rose-500 focus:outline-none font-black text-2xl text-rose-600 shadow-sm" placeholder="৳ 0.00" />
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">বিবরণ / কারণ (ফটোকপি, রিচার্জ ইত্যাদি)</p>
                <input type="text" value={formData.note} onChange={e => setFormData(prev => ({...prev, note: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-lg shadow-sm" placeholder="কি কারণে বাকি? (ঐচ্ছিক)" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setFormData(p => ({...p, type: TransactionType.BAKI}))} className={`py-5 rounded-2xl font-black border-2 transition-all ${formData.type === TransactionType.BAKI ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-100' : 'bg-white text-orange-600 border-orange-50'}`}>বাকি</button>
                <button onClick={() => setFormData(p => ({...p, type: TransactionType.BKASH_BAKI}))} className={`py-5 rounded-2xl font-black border-2 transition-all ${formData.type === TransactionType.BKASH_BAKI ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-100' : 'bg-white text-pink-600 border-pink-50'}`}>বিকাশ বাকি</button>
              </div>
              <button onClick={() => handleAddTransaction()} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xl active:scale-95 transition-all mt-4 hover:bg-emerald-600 shadow-2xl">হিসাব সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { setFormData({ name: '', amount: '', type: TransactionType.BAKI, note: '' }); setIsModalOpen(true); }} className="fixed bottom-8 right-6 w-16 h-16 bg-emerald-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:bg-emerald-700 active:scale-90 z-20 shadow-emerald-200 transition-all shadow-lg active:translate-y-1"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
    </Layout>
  );
};

export default App;
