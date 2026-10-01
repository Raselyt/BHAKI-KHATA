
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout.tsx';
import { Transaction, TransactionType, DashboardStats as StatsType } from './types.ts';
import { TransactionCard } from './components/TransactionCard.tsx';
import { DashboardStats } from './components/DashboardStats.tsx';
import { SmartAddInput } from './components/SmartAddInput.tsx';
import { supabase } from './lib/supabase.ts';
import { SyncModal } from './components/SyncModal.tsx';
import { CustomerCard } from './components/CustomerCard.tsx';
import { CustomerFolder } from './components/CustomerFolder.tsx';
import { ManualAddModal } from './components/ManualAddModal.tsx';
import { Login } from './components/Login.tsx';
import { HoldingLedger } from './components/HoldingLedger.tsx';
import { BulkWAMessengerModal } from './components/BulkWAMessengerModal.tsx';
import { 
  reconcileAllTransactions, 
  syncReconciledNotesToSupabase 
} from './services/reconciliationService.ts';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [shopName, setShopName] = useState("দোকানের খাতা");
  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerPhones, setCustomerPhones] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isBulkWAModalOpen, setIsBulkWAModalOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<'baki' | 'holding'>('baki');
  
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingCustomerFromList, setEditingCustomerFromList] = useState<{ oldName: string; phone?: string } | null>(null);
  const [listEditName, setListEditName] = useState('');
  const [listEditPhone, setListEditPhone] = useState('');

  const handleSaveCustomerPhone = (name: string, phone: string) => {
    const trimmed = phone.trim();
    const updated = { ...customerPhones, [name]: trimmed };
    setCustomerPhones(updated);
    localStorage.setItem('customerPhones', JSON.stringify(updated));
    setSyncMessage(`মোবাইল নম্বর সেভ করা হয়েছে ✅`);
    setTimeout(() => setSyncMessage(null), 2500);
  };

  const handleDirectWhatsAppFromCard = (cust: { name: string; balance: number; phone?: string }) => {
    if (!cust.phone) return;
    let cleaned = cust.phone.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = '88' + cleaned;
    const formattedBalance = Math.abs(cust.balance).toLocaleString('it-IT');
    const text = `আসসালামু আলাইকুম ${cust.name},\nআপনার কাছে ${shopName || 'দোকানের খাতা'}-এ বর্তমানে € ${formattedBalance} বকেয়া পাওনা আছে। দয়া করে পরিশোধ করার জন্য বিনীত অনুরোধ করা হলো। ধন্যবাদ।\n— ${shopName || 'দোকানের খাতা'}`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`, '_blank');
  };

  useEffect(() => {
    const savedPhones = localStorage.getItem('customerPhones');
    if (savedPhones) {
      try {
        setCustomerPhones(JSON.parse(savedPhones));
      } catch (e) {}
    }
  }, []);

  const handleRenameCustomer = async (oldName: string, newName: string, phone?: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew) return;

    // 1. Update customerPhones
    const updatedPhones = { ...customerPhones };
    if (phone !== undefined) {
      updatedPhones[trimmedNew] = phone.trim();
    }
    if (oldName !== trimmedNew && updatedPhones[oldName]) {
      delete updatedPhones[oldName];
    }
    setCustomerPhones(updatedPhones);
    localStorage.setItem('customerPhones', JSON.stringify(updatedPhones));

    // 2. Update transactions array where t.name === oldName & reconcile
    const mapped = transactions.map(t => {
      if (t.name === oldName) {
        return { ...t, name: trimmedNew };
      }
      return t;
    });
    const updatedTransactions = reconcileAllTransactions(mapped);

    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));

    // 3. Update Supabase
    if (userId) {
      try {
        await supabase
          .from('transactions')
          .update({ name: trimmedNew })
          .eq('user_id', userId)
          .eq('name', oldName);
        setSyncMessage("কাস্টমারের নাম আপডেট করা হয়েছে ✅");
      } catch (e) {
        setSyncMessage("অফলাইনে নাম আপডেট হলো ⚠️");
      }
      setTimeout(() => setSyncMessage(null), 3000);
    }

    // 4. Update selectedCustomer if currently opened
    if (selectedCustomer === oldName) {
      setSelectedCustomer(trimmedNew);
    }
  };

  const handleEditTransaction = async (id: string, updatedData: { name: string; amount: number; note?: string; type?: TransactionType }) => {
    const mapped = transactions.map(t => {
      if (t.id === id) {
        return {
          ...t,
          ...updatedData
        };
      }
      return t;
    });
    const updatedTransactions = reconcileAllTransactions(mapped);

    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));

    if (userId && !id.startsWith('local-')) {
      try {
        await supabase
          .from('transactions')
          .update(updatedData)
          .eq('id', id);
        setSyncMessage("লেনদেন তথ্য আপডেট করা হয়েছে ✅");
      } catch (e) {
        setSyncMessage("অফলাইনে তথ্য সেভ হলো ⚠️");
      }
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        handleAuthSuccess(session);
      } else {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleAuthSuccess(session);
      } else {
        setIsLoggedIn(false);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = (session: any) => {
    setIsLoggedIn(true);
    setUserId(session.user.id);
    setShopName(session.user.user_metadata?.shop_name || "আমার খাতা");
    setLoading(false);
    fetchTransactions(session.user.id);
  };

  const fetchTransactions = async (uid: string) => {
    if (!uid) return;
    setSyncing(true);
    setSyncMessage("ডাটা লোড ও হিসাব বিশ্লেষণ হচ্ছে...");
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Automatically reconcile all customer debts and payments
        const reconciled = reconcileAllTransactions(data);
        setTransactions(reconciled);
        localStorage.setItem('transactions', JSON.stringify(reconciled));
        setSyncMessage("ডাটা লোড ও হিসাব সমন্বয় সম্পন্ন ✅");
      }
    } catch (error) {
      const local = localStorage.getItem('transactions');
      if (local) {
        const parsed = JSON.parse(local);
        const reconciled = reconcileAllTransactions(parsed);
        setTransactions(reconciled);
      }
      setSyncMessage("অফলাইন মোড 📁");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const handleLogin = (name: string) => {
    setShopName(name);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    if (confirm("আপনি কি নিশ্চিতভাবে লগ আউট করতে চান?")) {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleImportData = async (importedData: any) => {
    setSyncing(true);
    try {
      let finalTransactions: Transaction[] = [];
      if (Array.isArray(importedData)) {
        finalTransactions = importedData;
      } else if (importedData && importedData.transactions) {
        finalTransactions = importedData.transactions;
      }

      // Add user_id to imported transactions if missing
      const sanitized = finalTransactions.map(t => ({...t, user_id: userId}));
      const reconciled = reconcileAllTransactions(sanitized);
      
      setTransactions(reconciled);
      localStorage.setItem('transactions', JSON.stringify(reconciled));
      
      // Upload to Supabase
      if (userId) {
        await supabase.from('transactions').insert(sanitized);
      }
      
      setSyncMessage("ইম্পোর্ট ও হিসাব সমন্বয় সফল ✅");
      setIsSyncModalOpen(false);
    } catch (error) {
      alert("ইম্পোর্ট করতে সমস্যা হয়েছে।");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const stats = useMemo<StatsType>(() => {
    const given = transactions
      .filter(t => t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI)
      .reduce((sum, t) => sum + t.amount, 0);
    const received = transactions
      .filter(t => t.type === TransactionType.BKASH_JOMA || t.type === TransactionType.CASH_PAYMENT)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalGiven: given,
      totalReceived: received,
      totalRemaining: given - received,
      recentCount: transactions.length
    };
  }, [transactions]);

  const customers = useMemo(() => {
    const groups: Record<string, { name: string; balance: number; lastDate: string; count: number; phone?: string }> = {};
    
    transactions.forEach(t => {
      if (!groups[t.name]) {
        groups[t.name] = { 
          name: t.name, 
          balance: 0, 
          lastDate: t.date, 
          count: 0, 
          phone: customerPhones[t.name] 
        };
      }
      const isJoma = t.type === TransactionType.BKASH_JOMA || t.type === TransactionType.CASH_PAYMENT;
      groups[t.name].balance += isJoma ? -t.amount : t.amount;
      groups[t.name].count += 1;
      if (new Date(t.date) > new Date(groups[t.name].lastDate)) {
        groups[t.name].lastDate = t.date;
      }
    });

    return Object.values(groups)
      .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.balance - a.balance);
  }, [transactions, searchQuery, customerPhones]);

  const handleAddTransaction = async (data: { name: string; amount: number; type: TransactionType; note?: string }) => {
    if (!userId) return;
    
    const tempId = `local-${Date.now()}`;
    const date = new Date().toISOString();
    const newTransaction: Transaction = { ...data, id: tempId, date };
    
    const updatedTransactions = reconcileAllTransactions([newTransaction, ...transactions]);
    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));

    try {
      await supabase.from('transactions').insert([{ 
        ...data, 
        date, 
        user_id: userId 
      }]);
      setSyncMessage("সেভ হয়েছে ✅");
    } catch (e) {
      setSyncMessage("অফলাইনে সেভ হলো ⚠️");
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে মুছতে চান?")) return;
    const updated = reconcileAllTransactions(transactions.filter(t => t.id !== id));
    setTransactions(updated);
    localStorage.setItem('transactions', JSON.stringify(updated));
    if (!id.startsWith('local-')) {
      await supabase.from('transactions').delete().eq('id', id);
    }
    setSyncMessage("মুছে ফেলা হয়েছে");
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleSettleBakiItem = async (bakiTx: Transaction, payAmount: number, payType: TransactionType, payNote?: string) => {
    if (!userId) return;

    const baseNote = (bakiTx.note || bakiTx.type).replace(/\s*\[পরিশোধিত\]/g, '').replace(/\s*\[আংশিক পরিশোধ.*?\]/g, '').trim();

    // 1. Create payment transaction
    const paymentTempId = `local-${Date.now()}`;
    const paymentDate = new Date().toISOString();
    const cleanPaymentNote = payNote?.trim() || `${baseNote} পরিশোধ`;
    const paymentTransaction: Transaction = {
      id: paymentTempId,
      name: bakiTx.name,
      amount: payAmount,
      type: payType,
      date: paymentDate,
      note: cleanPaymentNote,
      status: 'paid'
    };

    // 2. Reconcile customer transactions with new payment
    const combined = [paymentTransaction, ...transactions];
    const finalList = reconcileAllTransactions(combined);
    setTransactions(finalList);
    localStorage.setItem('transactions', JSON.stringify(finalList));

    // 3. Sync to Supabase
    try {
      await supabase.from('transactions').insert([{
        name: bakiTx.name,
        amount: payAmount,
        type: payType,
        date: paymentDate,
        note: cleanPaymentNote,
        user_id: userId
      }]);

      // Find updated baki transaction note
      const updatedBaki = finalList.find(t => t.id === bakiTx.id);
      if (updatedBaki && !bakiTx.id.startsWith('local-')) {
        await supabase
          .from('transactions')
          .update({
            note: updatedBaki.note || ''
          })
          .eq('id', bakiTx.id);
      }
      setSyncMessage("হিসাব পরিশোধ সফল হয়েছে ✅");
    } catch (e) {
      console.error("Supabase sync error:", e);
      setSyncMessage("অফলাইনে পরিশোধ সেভ হলো ⚠️");
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleReconcileHistory = async () => {
    setSyncing(true);
    setSyncMessage("পুরোনো হিসাবের পুরো হিস্টরি বিশ্লেষণ ও সমন্বয় হচ্ছে... ⏳");
    try {
      const reconciled = reconcileAllTransactions(transactions);
      setTransactions(reconciled);
      localStorage.setItem('transactions', JSON.stringify(reconciled));

      if (userId) {
        const res = await syncReconciledNotesToSupabase(reconciled, userId);
        setSyncMessage(`হিসাবের হিস্টরি সফলভাবে সমন্বয় করা হয়েছে (${res.updatedCount} লেনদেন ডাটাবেজে সিঙ্ক) ✅`);
      } else {
        setSyncMessage("হিসাবের হিস্টরি সফলভাবে সমন্বয় করা হয়েছে ✅");
      }
    } catch (e) {
      console.error("Reconciliation error:", e);
      setSyncMessage("হিসাব সমন্বয় সম্পন্ন হয়েছে ✅");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 3500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-[#0f172a] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#0f172a] font-black text-lg animate-pulse">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (selectedCustomer) {
    const customerTransactions = transactions.filter(t => t.name === selectedCustomer);
    const customer = customers.find(c => c.name === selectedCustomer);
    
    return (
      <Layout username={shopName} onLogout={handleLogout}>
        <CustomerFolder 
          name={selectedCustomer}
          balance={customer?.balance || 0}
          phone={customer?.phone}
          shopName={shopName}
          transactions={customerTransactions}
          onBack={() => setSelectedCustomer(null)}
          onAdd={handleAddTransaction}
          onDelete={handleDeleteTransaction}
          onRenameCustomer={handleRenameCustomer}
          onEditTransaction={handleEditTransaction}
          onSettleBakiItem={handleSettleBakiItem}
          onReconcileHistory={handleReconcileHistory}
        />
      </Layout>
    );
  }

  return (
    <Layout 
      username={shopName} 
      onRefresh={() => fetchTransactions(userId!)} 
      onSyncClick={() => setIsSyncModalOpen(true)}
      onLogout={handleLogout}
    >
      <SyncModal 
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        transactions={transactions}
        onImportData={handleImportData} 
        onReconcileAll={handleReconcileHistory}
      />

      <ManualAddModal 
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onAdd={handleAddTransaction}
      />

      <BulkWAMessengerModal
        isOpen={isBulkWAModalOpen}
        onClose={() => setIsBulkWAModalOpen(false)}
        customers={customers}
        shopName={shopName}
        onSavePhone={handleSaveCustomerPhone}
      />

      {/* Edit Customer Modal From Main List */}
      {editingCustomerFromList && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingCustomerFromList(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 z-10">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-black text-slate-800">কাস্টমারের নাম এডিট করুন ✏️</h3>
                <p className="text-xs font-bold text-slate-400">ভুল নাম বা ফোন নম্বর সংশোধন করুন</p>
              </div>
              <button onClick={() => setEditingCustomerFromList(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!listEditName.trim()) {
                  alert("কাস্টমারের সঠিক নাম লিখুন!");
                  return;
                }
                handleRenameCustomer(editingCustomerFromList.oldName, listEditName.trim(), listEditPhone.trim());
                setEditingCustomerFromList(null);
              }} 
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">কাস্টমারের নাম *</label>
                <input 
                  type="text"
                  required
                  placeholder="যেমন: জামাল হোসেন"
                  value={listEditName}
                  onChange={(e) => setListEditName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input 
                  type="tel"
                  placeholder="যেমন: 01700000000"
                  value={listEditPhone}
                  onChange={(e) => setListEditPhone(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingCustomerFromList(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-black text-sm transition-all"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-2xl font-black text-sm shadow-xl transition-all"
                >
                  সেভ করুন ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {syncMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#0f172a] text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            {syncMessage}
          </div>
        </div>
      )}

      {/* Main Ledger Mode Switcher */}
      <div className="mb-5 flex bg-slate-100 p-1 rounded-full border border-slate-200/60 shadow-sm">
        <button 
          onClick={() => setCurrentMode('baki')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${
            currentMode === 'baki' 
              ? 'bg-[#0f172a] text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 20H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          বকেয়া খাতা (Credit)
        </button>
        <button 
          onClick={() => setCurrentMode('holding')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${
            currentMode === 'holding' 
              ? 'bg-amber-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          আমানত খাতা (Deposit)
        </button>
      </div>

      {currentMode === 'holding' ? (
        <HoldingLedger userId={userId} />
      ) : (
        <>
          <DashboardStats stats={stats} />
          <SmartAddInput onParsed={handleAddTransaction} />

          {/* Bulk WhatsApp Reminder Banner */}
          {customers.some(c => c.balance > 0) && (
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-slate-900 rounded-[2rem] p-4 sm:p-5 text-white shadow-xl shadow-emerald-900/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-500/20 my-2">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/20 shrink-0">
                  💬
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base sm:text-lg tracking-tight">
                      ১-ক্লিকে সবাইকে WhatsApp তাগাদা
                    </h4>
                    <span className="bg-emerald-400/30 text-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400/20">
                      বাকি খাতা
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 font-bold mt-0.5">
                    মোট বাকি: {customers.filter(c => c.balance > 0).length} জন • নম্বর রেডি: {customers.filter(c => c.balance > 0 && c.phone && c.phone.trim().length >= 8).length} জন
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBulkWAModalOpen(true)}
                className="px-5 py-3 bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span>তাগাদা পাঠান</span>
                <span className="text-sm">🚀</span>
              </button>
            </div>
          )}

          {/* Customer List Header & Reconcile Button */}
          <div className="flex items-center justify-between gap-2 px-1 mb-2 mt-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              গ্রাহকের খাতা তালিকা ({customers.length})
            </span>
            <button
              onClick={handleReconcileHistory}
              disabled={syncing}
              className="text-[11px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200/80 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              title="পুরোনো সব লেনদেন বিশ্লেষণ করে বকেয়া ও পরিশোধিত স্ট্যাটাস ঠিক করুন"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              <span>হিস্টরি সমন্বয়</span>
            </button>
          </div>

          <div className="py-2 border-b border-slate-50">
             <div className="relative">
               <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
               <input 
                 type="text" 
                 placeholder="নাম দিয়ে কাস্টমার খুঁজুন..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full p-5 pl-12 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-[#0f172a] focus:bg-white focus:outline-none transition-all font-bold text-sm"
               />
             </div>
          </div>

          <div className="mt-6 space-y-4 pb-48">
            {customers.length === 0 ? (
              <div className="py-20 text-center bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <h3 className="text-slate-500 font-black text-lg mb-1">কোনো হিসাব পাওয়া যায়নি</h3>
                <p className="text-slate-400 text-sm font-bold">নতুন হিসাব যোগ করতে নিচের বাটনটি ব্যবহার করুন</p>
              </div>
            ) : (
              customers.map(customer => (
                <CustomerCard 
                  key={customer.name}
                  customer={customer}
                  onClick={() => setSelectedCustomer(customer.name)}
                  onEditCustomer={(name, phone) => {
                    setEditingCustomerFromList({ oldName: name, phone });
                    setListEditName(name);
                    setListEditPhone(phone || '');
                  }}
                  onDirectWhatsApp={handleDirectWhatsAppFromCard}
                />
              ))
            )}
          </div>

          {/* Floating Action Bar */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] animate-in slide-in-from-bottom-12 duration-700">
            <button 
              onClick={() => setIsManualAddOpen(true)}
              className="w-full bg-[#0f172a] text-white p-1.5 pr-2 rounded-[2.8rem] shadow-[0_25px_50px_-12px_rgba(15,23,42,0.5)] flex items-center justify-between group active:scale-[0.96] transition-all border border-white/10"
            >
              <div className="flex items-center gap-4 pl-4">
                <div className="w-12 h-12 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg group-hover:rotate-180 transition-transform duration-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </div>
                <div className="text-left">
                  <span className="block font-black text-lg leading-none mb-0.5">নতুন হিসাব যোগ করুন</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">বাকি বা জমার রেকর্ড</span>
                </div>
              </div>
              <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center transition-colors group-hover:bg-white/20">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          </div>
        </>
      )}
    </Layout>
  );
};

export default App;
