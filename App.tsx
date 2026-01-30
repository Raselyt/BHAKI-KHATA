
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout.tsx';
import { Transaction, TransactionType, DashboardStats as StatsType } from './types.ts';
import { TransactionCard } from './components/TransactionCard.tsx';
import { DashboardStats } from './components/DashboardStats.tsx';
import { SmartAddInput } from './components/SmartAddInput.tsx';
import { getFinancialAdvice } from './services/geminiService.ts';
import { supabase } from './lib/supabase.ts';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState<string>("");
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      // Fallback to local storage if supabase fails
      const local = localStorage.getItem('transactions');
      if (local) setTransactions(JSON.parse(local));
    } else {
      setTransactions(data || []);
      localStorage.setItem('transactions', JSON.stringify(data || []));
    }
    setLoading(false);
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

  const handleAddTransaction = async (data: { name: string; amount: number; type: TransactionType; note?: string }) => {
    const newTransaction: Omit<Transaction, 'id'> = {
      ...data,
      date: new Date().toISOString(),
    };

    const { data: insertedData, error } = await supabase
      .from('transactions')
      .insert([newTransaction])
      .select();

    if (error) {
      console.error('Error adding transaction:', error);
      // Local fallback
      const localT: Transaction = { ...newTransaction, id: Math.random().toString(36).substr(2, 9) };
      const updated = [localT, ...transactions];
      setTransactions(updated);
      localStorage.setItem('transactions', JSON.stringify(updated));
    } else if (insertedData) {
      setTransactions([insertedData[0], ...transactions]);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
    }
    
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('transactions', JSON.stringify(updated));
  };

  const handleGetAdvice = async () => {
    if (transactions.length === 0) return;
    setIsAdviceLoading(true);
    try {
      const result = await getFinancialAdvice(transactions);
      setAdvice(result || "পরামর্শ পাওয়া যায়নি।");
    } catch (err) {
      setAdvice("AI সংযোগে সমস্যা হচ্ছে।");
    } finally {
      setIsAdviceLoading(false);
    }
  };

  return (
    <Layout 
      username="বিসমিল্লাহ টেলিকম" 
      onSyncClick={fetchTransactions}
    >
      <DashboardStats stats={stats} />

      <SmartAddInput onParsed={handleAddTransaction} />

      <div className="mb-6">
        <button 
          onClick={handleGetAdvice}
          disabled={isAdviceLoading || transactions.length === 0}
          className="w-full bg-indigo-50 text-indigo-700 py-4 rounded-3xl font-black text-sm border-2 border-indigo-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          {isAdviceLoading ? (
            <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              AI পরামর্শ নিন
            </>
          )}
        </button>
        {advice && (
          <div className="mt-3 bg-indigo-600 text-white p-5 rounded-[2rem] text-sm leading-relaxed shadow-lg animate-in fade-in slide-in-from-top-2">
            <p className="font-medium">{advice}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-xl font-black text-slate-800">সাম্প্রতিক লেনদেন</h2>
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{transactions.length} টি</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-xs uppercase tracking-widest">লোড হচ্ছে...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold text-sm">কোন লেনদেন পাওয়া যায়নি।</p>
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map(t => (
            <TransactionCard 
              key={t.id} 
              transaction={t} 
              onDelete={handleDeleteTransaction}
              onClick={(trans) => console.log('Edit', trans)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
};

export default App;
