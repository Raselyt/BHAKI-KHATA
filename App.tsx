
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

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [shopName, setShopName] = useState("দোকানের খাতা");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerPhones, setCustomerPhones] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  
  // Navigation State
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setIsLoggedIn(true);
        setShopName(session.user.user_metadata?.shop_name || "আমার খাতা");
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        setShopName(session.user.user_metadata?.shop_name || "আমার খাতা");
      } else {
        setIsLoggedIn(false);
      }
    });

    const local = localStorage.getItem('transactions');
    const localPhones = localStorage.getItem('customerPhones');
    if (local) setTransactions(JSON.parse(local));
    if (localPhones) setCustomerPhones(JSON.parse(localPhones));
    fetchTransactions();

    return () => subscription.unsubscribe();
  }, []);

  const fetchTransactions = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setTransactions(data);
        localStorage.setItem('transactions', JSON.stringify(data));
        setSyncMessage("অনলাইন সিঙ্ক সম্পন্ন ✅");
      }
    } catch (error) {
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
      localStorage.clear(); // Complete cleanup
      window.location.reload(); // Hard refresh to clear all states
    }
  };

  const handleImportData = async (importedData: any) => {
    setSyncing(true);
    try {
      let finalTransactions: Transaction[] = [];
      let phones: Record<string, string> = {};
      
      if (Array.isArray(importedData)) {
        finalTransactions = importedData;
      } else if (importedData && importedData.transactions) {
        finalTransactions = importedData.transactions;
        if (importedData.customerPhones) {
          phones = importedData.customerPhones;
        }
      }

      setTransactions(finalTransactions);
      setCustomerPhones(phones);
      localStorage.setItem('transactions', JSON.stringify(finalTransactions));
      localStorage.setItem('customerPhones', JSON.stringify(phones));
      setSyncMessage("ডেটা ইম্পোর্ট সফল ✅");
    } catch (error) {
      alert("ডেটা ইম্পোর্ট করতে সমস্যা হয়েছে।");
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
    const tempId = `local-${Date.now()}`;
    const newTransaction: Transaction = { ...data, id: tempId, date: new Date().toISOString() };
    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    setSyncMessage("সেভ হয়েছে ✅");

    try {
      await supabase.from('transactions').insert([{ ...data, date: newTransaction.date }]);
    } catch (e) {}
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে মুছতে চান?")) return;
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('transactions', JSON.stringify(updated));
    if (!id.startsWith('local-')) await supabase.from('transactions').delete().eq('id', id);
    setSyncMessage("মুছে ফেলা হয়েছে");
    setTimeout(() => setSyncMessage(null), 3000);
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
          transactions={customerTransactions}
          onBack={() => setSelectedCustomer(null)}
          onAdd={handleAddTransaction}
          onDelete={handleDeleteTransaction}
        />
      </Layout>
    );
  }

  return (
    <Layout username={shopName} onSyncClick={() => setIsSyncModalOpen(true)} onLogout={handleLogout}>
      <SyncModal 
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        transactions={transactions}
        onImportData={handleImportData}
      />

      <ManualAddModal 
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onAdd={handleAddTransaction}
      />

      {syncMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#0f172a] text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            {syncMessage}
          </div>
        </div>
      )}

      <DashboardStats stats={stats} />
      <SmartAddInput onParsed={handleAddTransaction} />

      <div className="sticky top-[72px] bg-white/90 backdrop-blur-md z-40 py-2 border-b border-slate-50">
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

      <div className="mt-6 space-y-4 pb-40">
        {customers.length === 0 ? (
          <div className="py-20 text-center bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 className="text-slate-500 font-black text-lg mb-1">কোনো হিসাব পাওয়া যায়নি</h3>
            <p className="text-slate-400 text-sm font-bold">নতুন কাষ্টমার যোগ করতে নিচের বাটন ব্যবহার করুন</p>
          </div>
        ) : (
          customers.map(customer => (
            <CustomerCard 
              key={customer.name}
              customer={customer}
              onClick={() => setSelectedCustomer(customer.name)}
            />
          ))
        )}
      </div>

      {/* Modern Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] animate-in slide-in-from-bottom-10 duration-500 delay-300">
        <button 
          onClick={() => setIsManualAddOpen(true)}
          className="w-full bg-[#0f172a] text-white p-2 rounded-[2.5rem] shadow-[0_20px_40px_rgba(15,23,42,0.3)] flex items-center justify-between group active:scale-[0.97] transition-all border-2 border-white/5"
        >
          <div className="flex items-center gap-4 pl-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </div>
            <span className="font-black text-lg tracking-tight">নতুন হিসাব যোগ করুন</span>
          </div>
          <div className="bg-emerald-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg mr-1">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      </div>
    </Layout>
  );
};

export default App;
