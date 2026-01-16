
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Transaction, TransactionType, DashboardStats as StatsType } from './types';
import { TransactionCard } from './components/TransactionCard';
import { DashboardStats } from './components/DashboardStats';
import { SmartAddInput } from './components/SmartAddInput';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerPhones, setCustomerPhones] = useState<Record<string, string>>({});
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
  const [formData, setFormData] = useState({ name: '', amount: '', type: TransactionType.BAKI });

  // Load data on start
  useEffect(() => {
    const savedTx = localStorage.getItem('baki_khata_transactions');
    const savedPh = localStorage.getItem('baki_khata_phones');
    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedPh) setCustomerPhones(JSON.parse(savedPh));
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem('baki_khata_transactions', JSON.stringify(transactions));
    localStorage.setItem('baki_khata_phones', JSON.stringify(customerPhones));
  }, [transactions, customerPhones]);

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

  const handleAddTransaction = (data?: { name: string; amount: number; type: TransactionType }) => {
    const nameToUse = (data?.name || formData.name).trim();
    const amountToUse = data?.amount || Number(formData.amount);
    const typeToUse = data?.type || formData.type;
    if (!nameToUse || isNaN(amountToUse) || amountToUse <= 0) { alert("সঠিক নাম ও পরিমাণ লিখুন"); return; }
    const newTx: Transaction = { id: crypto.randomUUID(), name: nameToUse, amount: amountToUse, type: typeToUse, date: new Date().toISOString() };
    setTransactions(prev => [newTx, ...prev]);
    setIsModalOpen(false);
    setFormData({ name: '', amount: '', type: TransactionType.BAKI });
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
      const message = encodeURIComponent(`আসসালামু আলাইকুম, ${name}। আপনার নিকট আমাদের বকেয়া পাওনা ৳${balance.toLocaleString()}। পরিশোধ করবেন। ধন্যবাদ।`);
      window.location.href = `sms:${phone}?body=${message}`;
    } else { setSelectedPerson(name); setNewPhone(''); setIsPhoneModalOpen(true); }
  };

  const handlePayment = () => {
    if (!selectedPerson || !payAmount) return;
    const pAmount = parseFloat(payAmount);
    if (isNaN(pAmount) || pAmount <= 0) return;
    const paymentRecord: Transaction = { id: crypto.randomUUID(), name: selectedPerson, amount: pAmount, type: TransactionType.CASH_PAYMENT, date: new Date().toISOString(), note: `পরিশোধিত` };
    setTransactions(prev => [paymentRecord, ...prev]);
    setIsPayModalOpen(false);
  };

  return (
    <Layout>
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
                  <button onClick={() => { setFormData({name: selectedPerson!, amount: '', type: TransactionType.BAKI}); setIsModalOpen(true); }} className="bg-rose-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-900/20 active:scale-95 transition-all">বাকি দিন</button>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-slate-800">নতুন হিসাব যোগ</h2><button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-3 rounded-2xl text-slate-400 hover:text-rose-500"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div className="space-y-6">
              <input type="text" value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-lg" placeholder="কাস্টমারের নাম..." />
              <input type="number" value={formData.amount} onChange={e => setFormData(prev => ({...prev, amount: e.target.value}))} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-rose-500 focus:outline-none font-black text-2xl text-rose-600" placeholder="৳ 0.00" />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setFormData(p => ({...p, type: TransactionType.BAKI}))} className={`py-5 rounded-2xl font-black border-2 ${formData.type === TransactionType.BAKI ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-100' : 'bg-white text-orange-600 border-orange-50'}`}>বাকি</button>
                <button onClick={() => setFormData(p => ({...p, type: TransactionType.BKASH_BAKI}))} className={`py-5 rounded-2xl font-black border-2 ${formData.type === TransactionType.BKASH_BAKI ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-100' : 'bg-white text-pink-600 border-pink-50'}`}>বিকাশ বাকি</button>
              </div>
              <button onClick={() => handleAddTransaction()} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xl active:scale-95 transition-all mt-4 hover:bg-emerald-600 shadow-2xl">হিসাব সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      {isPhoneModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
              <h2 className="text-xl font-black text-slate-800 mb-2 text-center">মোবাইল নাম্বার দিন</h2>
              <p className="text-slate-500 text-sm mb-6 text-center">'{selectedPerson}' এর জন্য নাম্বার সেভ করুন:</p>
              <input type="tel" autoFocus value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none text-xl font-black text-slate-700 mb-6 text-center" placeholder="017XXXXXXXX" />
              <div className="flex gap-3"><button onClick={() => setIsPhoneModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50">বাতিল</button><button onClick={handleSavePhone} className="flex-1 py-4 rounded-2xl font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-100">সেভ করুন</button></div>
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[120] p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
             <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">মুছে ফেলতে চান?</h2>
             <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">এই তথ্য চিরতরে ডিলিট হয়ে যাবে।</p>
             <div className="flex flex-col gap-3"><button onClick={confirmDeleteAction} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-all">হ্যাঁ, মুছে ফেলুন</button><button onClick={() => setDeleteConfirm({ isOpen: false, type: 'single' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold">বাতিল</button></div>
          </div>
        </div>
      )}

      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-6">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-300">
              <h2 className="text-xl font-black text-slate-800 mb-6 text-center">নাম পরিবর্তন</h2>
              <input type="text" autoFocus value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:outline-none text-lg font-bold text-slate-700 mb-6 text-center" />
              <div className="flex gap-3"><button onClick={() => setIsRenameModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50">বাতিল</button><button onClick={handleRenameCustomer} className="flex-1 py-4 rounded-2xl font-bold text-white bg-emerald-600">সেভ</button></div>
           </div>
        </div>
      )}

      <button onClick={() => { setFormData({ name: '', amount: '', type: TransactionType.BAKI }); setIsModalOpen(true); }} className="fixed bottom-8 right-6 w-16 h-16 bg-emerald-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:bg-emerald-700 active:scale-90 z-20 shadow-emerald-200"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
    </Layout>
  );
};

export default App;
