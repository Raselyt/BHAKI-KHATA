
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
    // Check session
    const auth = localStorage.getItem('isLoggedIn');
    const savedShop = localStorage.getItem('shopInfo');
    
    if (auth === 'true') {
      setIsLoggedIn(true);
      if (savedShop) {
        setShopName(JSON.parse(savedShop).name);
      }
    }

    const local = localStorage.getItem('transactions');
    const localPhones = localStorage.getItem('customerPhones');
    if (local) setTransactions(JSON.parse(local));
    if (localPhones) setCustomerPhones(JSON.parse(localPhones));
    fetchTransactions();
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
      setLoading(false);
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const handleLogin = (name: string) => {
    setShopName(name);
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleLogout = () => {
    if (confirm("আপনি কি নিশ্চিতভাবে লগ আউট করতে চান?")) {
      setIsLoggedIn(false);
      localStorage.removeItem('isLoggedIn');
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2">
            {syncMessage}
          </div>
        </div>
      )}

      <DashboardStats stats={stats} />
      <SmartAddInput onParsed={handleAddTransaction} />

      <div className="sticky top-[72px] bg-white z-40 py-2">
         <div className="relative">
           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
           </div>
           <input 
             type="text"
             placeholder="নাম দিয়ে কাস্টমার খুঁজুন..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-medium text-sm"
           />
         </div>
      </div>

      <div className="mt-6 space-y-3 pb-28">
        {customers.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <p className="text-slate-400 font-bold">কোনো হিসাব পাওয়া যায়নি</p>
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

      {/* Persistent Add Button at Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50">
        <button 
          onClick={() => setIsManualAddOpen(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all border-4 border-white"
        >
          <div className="bg-white/20 p-1.5 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </div>
          নতুন হিসাব যোগ করুন
        </button>
      </div>
    </Layout>
  );
};

export default App;
