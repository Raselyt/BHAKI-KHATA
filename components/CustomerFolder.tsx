
import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { TransactionCard } from './TransactionCard.tsx';

interface CustomerFolderProps {
  name: string;
  balance: number;
  phone?: string;
  shopName: string;
  transactions: Transaction[];
  onBack: () => void;
  onAdd: (data: { name: string; amount: number; type: TransactionType; note?: string; status?: 'unpaid' | 'paid' | 'partial'; paidAmount?: number }) => void;
  onDelete: (id: string) => void;
  onRenameCustomer?: (oldName: string, newName: string, phone?: string) => void;
  onEditTransaction?: (id: string, updatedData: { name: string; amount: number; note?: string; type?: TransactionType; status?: 'unpaid' | 'paid' | 'partial'; paidAmount?: number }) => void;
  onSettleBakiItem?: (bakiTx: Transaction, payAmount: number, payType: TransactionType, payNote?: string) => void;
}

export const CustomerFolder: React.FC<CustomerFolderProps> = ({ 
  name, 
  balance, 
  phone, 
  shopName, 
  transactions, 
  onBack, 
  onAdd, 
  onDelete,
  onRenameCustomer,
  onEditTransaction,
  onSettleBakiItem
}) => {
  const [showAddModal, setShowAddModal] = useState<{ type: TransactionType } | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txEditAmount, setTxEditAmount] = useState('');
  const [txEditNote, setTxEditNote] = useState('');

  // Settle Item State
  const [settleModalItem, setSettleModalItem] = useState<Transaction | null>(null);
  const [settlePayAmount, setSettlePayAmount] = useState('');
  const [settlePayType, setSettlePayType] = useState<TransactionType>(TransactionType.CASH_PAYMENT);
  const [settlePayNote, setSettlePayNote] = useState('');

  // History tab filter: 'all' | 'due' | 'paid'
  const [historyTab, setHistoryTab] = useState<'all' | 'due' | 'paid'>('all');

  const [msgType, setMsgType] = useState<'reminder' | 'thankyou' | 'statement'>('reminder');
  const [customMessage, setCustomMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Stats calculations for this customer
  const totalBaki = transactions
    .filter(t => t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalJoma = transactions
    .filter(t => t.type === TransactionType.BKASH_JOMA || t.type === TransactionType.CASH_PAYMENT)
    .reduce((sum, t) => sum + t.amount, 0);

  const lastPayment = transactions
    .find(t => t.type === TransactionType.BKASH_JOMA || t.type === TransactionType.CASH_PAYMENT);

  // Active Unpaid / Partial Baki items (strictly excluding paid items)
  const unpaidBakiItems = transactions.filter(t => 
    (t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI) &&
    t.status !== 'paid'
  );

  // Paid items count
  const paidItems = transactions.filter(t => 
    (t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI) &&
    t.status === 'paid'
  );

  // Generate Message Text based on type
  const generateMessageText = (type: 'reminder' | 'thankyou' | 'statement', currentBalance = balance) => {
    const shopSignature = shopName ? `\n\n— ${shopName}` : '';
    
    if (type === 'thankyou') {
      if (currentBalance <= 0) {
        return `আসসালামু আলাইকুম ${name},\nআপনার বাকি টাকা পরিশোধ করার জন্য আপনাকে অসংখ্য ধন্যবাদ! আপনার সাথে সততার সাথে লেনদেন করতে পেরে আমরা অত্যন্ত আনন্দিত। 🤝${shopSignature}`;
      } else {
        return `আসসালামু আলাইকুম ${name},\nআপনার বকেয়া টাকা জমা দেওয়ার জন্য আপনাকে অসংখ্য ধন্যবাদ! 🤝\nঅবশিষ্ট বকেয়া পরিমাণ: € ${currentBalance.toLocaleString('it-IT')}${shopSignature}`;
      }
    }

    if (type === 'statement') {
      return `আসসালামু আলাইকুম ${name},\nআপনার হিসাব বিবরণী:\n• মোট বাকি: € ${totalBaki.toLocaleString('it-IT')}\n• মোট জমা: € ${totalJoma.toLocaleString('it-IT')}\n• বর্তমান বাকি: € ${currentBalance.toLocaleString('it-IT')}\n\nধন্যবাদ।${shopSignature}`;
    }

    // Default: 'reminder'
    // ONLY include ACTIVE / UNPAID baki items!
    // Paid items are strictly omitted so past settled items NEVER appear in the message!
    const activeDues = transactions.filter(t => 
      (t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI) &&
      t.status !== 'paid'
    );

    let reasonSection = '';
    if (activeDues.length > 0) {
      const itemsList = activeDues.map(t => {
        const remaining = Math.max(0, t.amount - (t.paidAmount || 0));
        const cleanName = t.note?.replace(/\(অবশিষ্ট.*?\)/g, '')
          .replace(/\[.*?\]/g, '')
          .trim() || t.type;
        return `• ${cleanName}: € ${remaining.toLocaleString('it-IT')}`;
      }).join('\n');
      
      reasonSection = `\n\n📌 অপরিশোধিত হিসাব বিবরণ:\n${itemsList}`;
    }

    return `আসসালামু আলাইকুম ${name},\nআপনার কাছে বর্তমানে মোট € ${currentBalance.toLocaleString('it-IT')} বকেয়া পাওনা আছে।${reasonSection}\n\nদয়া করে পরিশোধ করার জন্য বিনীত অনুরোধ করা হলো। ধন্যবাদ।${shopSignature}`;
  };

  const openMessageModal = (type: 'reminder' | 'thankyou' | 'statement' = balance <= 0 ? 'thankyou' : 'reminder') => {
    setMsgType(type);
    setCustomMessage(generateMessageText(type));
    setShowMessageModal(true);
  };

  const handleMsgTypeChange = (type: 'reminder' | 'thankyou' | 'statement') => {
    setMsgType(type);
    setCustomMessage(generateMessageText(type));
  };

  const activeMessageText = customMessage || generateMessageText(msgType);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(activeMessageText);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleWhatsApp = () => {
    let cleanPhone = phone || '';
    if (cleanPhone && !cleanPhone.startsWith('88') && !cleanPhone.startsWith('+')) {
      cleanPhone = '88' + cleanPhone;
    }
    cleanPhone = cleanPhone.replace(/[^0-9+]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(activeMessageText)}`;
    window.open(url, '_blank');
  };

  const handleSMS = () => {
    const url = `sms:${phone || ''}?body=${encodeURIComponent(activeMessageText)}`;
    window.open(url, '_blank');
  };

  const openSettleModal = (item: Transaction) => {
    const due = Math.max(0, item.amount - (item.paidAmount || 0));
    setSettleModalItem(item);
    setSettlePayAmount(due.toString());
    const isBkash = item.type.includes('বিকাশ') || (item.note && item.note.includes('বিকাশ'));
    setSettlePayType(isBkash ? TransactionType.BKASH_JOMA : TransactionType.CASH_PAYMENT);
    setSettlePayNote(`${item.note || item.type} পরিশোধ`);
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalItem) return;
    const numAmount = parseFloat(settlePayAmount);
    const due = Math.max(0, settleModalItem.amount - (settleModalItem.paidAmount || 0));
    
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("সঠিক পরিশোধের টাকার পরিমাণ লিখুন!");
      return;
    }

    const payAmount = Math.min(numAmount, due);

    if (onSettleBakiItem) {
      onSettleBakiItem(settleModalItem, payAmount, settlePayType, settlePayNote.trim());
    } else {
      // Fallback
      const newPaid = (settleModalItem.paidAmount || 0) + payAmount;
      const isFull = newPaid >= settleModalItem.amount;
      onAdd({
        name,
        amount: payAmount,
        type: settlePayType,
        note: settlePayNote.trim() || `${settleModalItem.note || settleModalItem.type} পরিশোধ`
      });
      if (onEditTransaction) {
        onEditTransaction(settleModalItem.id, {
          name,
          amount: settleModalItem.amount,
          note: settleModalItem.note,
          status: isFull ? 'paid' : 'partial',
          paidAmount: newPaid
        });
      }
    }

    setSettleModalItem(null);
    setSettlePayAmount('');
    setSettlePayNote('');

    // Open thank-you message option
    const newBal = Math.max(0, balance - payAmount);
    setMsgType('thankyou');
    setCustomMessage(generateMessageText('thankyou', newBal));
    setShowMessageModal(true);
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      // @ts-ignore - html2pdf is imported dynamically
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.getElementById('report-pdf-template');
      if (!element) throw new Error("Template not found");

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${name}_report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Show temporarily for capture
      element.style.display = 'block';
      
      // Small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await html2pdf().set(opt).from(element).save();
      element.style.display = 'none';

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("পিডিএফ তৈরি করতে সমস্যা হয়েছে।");
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickAdd = () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) return;

    const isPayment = showAddModal?.type === TransactionType.CASH_PAYMENT || showAddModal?.type === TransactionType.BKASH_JOMA;

    onAdd({
      name,
      amount: numAmount,
      type: showAddModal!.type,
      note: note.trim()
    });

    setAmount('');
    setNote('');
    setShowAddModal(null);

    // If money was received/paid, automatically open thank-you message modal with updated projected balance
    if (isPayment) {
      const newBal = Math.max(0, balance - numAmount);
      setMsgType('thankyou');
      setCustomMessage(generateMessageText('thankyou', newBal));
      setShowMessageModal(true);
    }
  };

  const handleSaveCustomerEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomerName.trim()) {
      alert("কাস্টমারের নাম লিখুন!");
      return;
    }
    if (onRenameCustomer) {
      onRenameCustomer(name, editCustomerName.trim(), editCustomerPhone.trim());
    }
    setShowEditCustomerModal(false);
  };

  const handleSaveTxEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !txEditAmount || isNaN(Number(txEditAmount))) {
      alert("সঠিক টাকার পরিমাণ লিখুন!");
      return;
    }
    if (onEditTransaction) {
      onEditTransaction(editingTx.id, {
        name,
        amount: Number(txEditAmount),
        note: txEditNote.trim()
      });
    }
    setEditingTx(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 className="text-xl font-black text-slate-800 truncate flex-1">{name}</h2>
        <button 
          onClick={() => {
            setEditCustomerName(name);
            setEditCustomerPhone(phone || '');
            setShowEditCustomerModal(true);
          }}
          className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 border border-amber-200 shrink-0"
          title="কাস্টমারের নাম বা ফোন নম্বর এডিট করুন"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          নাম এডিট
        </button>
      </div>

      {/* Customer Stats Card */}
      <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white mb-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 select-none">
          {/* Main Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-1">বর্তমানে পাওনা</p>
              <p className="text-3xl font-black text-rose-400">€ {balance.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">সর্বশেষ জমা</p>
                <p className="text-2xl font-black text-indigo-400">
                  {lastPayment ? `€ ${lastPayment.amount.toLocaleString()}` : '€ 0'}
                </p>
              </div>
              <p className="text-[10px] font-bold text-indigo-200">
                {lastPayment ? `তারিখ: ${new Date(lastPayment.date).toLocaleDateString('it-IT')}` : 'কোনো জমা নেই'}
              </p>
            </div>
          </div>

          {/* Mini Supportive Stats */}
          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mb-6 text-sm">
            <div className="pl-2">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">মোট বাকি দেওয়া হয়েছে</span>
              <span className="text-md font-extrabold text-rose-300">€ {totalBaki.toLocaleString()}</span>
            </div>
            <div className="pl-2 border-l border-white/5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">মোট জমা দেওয়া হয়েছে</span>
              <span className="text-md font-extrabold text-emerald-300">€ {totalJoma.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => openMessageModal(balance <= 0 ? 'thankyou' : 'reminder')}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              মেসেজ দিন
            </button>
            <button 
              onClick={() => openMessageModal('thankyou')}
              className="bg-emerald-500 hover:bg-emerald-600 px-4 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 text-white"
              title="ধন্যবাদ মেসেজ পাঠান"
            >
              <span>💚 ধন্যবাদ</span>
            </button>
            <button 
              disabled={isExporting}
              onClick={handleDownloadPDF}
              className="w-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-white/10 disabled:opacity-50"
            >
              {isExporting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              )}
            </button>
            <button 
              onClick={() => window.open(`tel:${phone || ''}`)}
              className="w-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => setShowAddModal({ type: TransactionType.BAKI })}
          className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] text-center active:scale-95 transition-all group"
        >
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </div>
          <p className="font-black text-rose-600">বাকি দিন</p>
        </button>
        <button 
          onClick={() => setShowAddModal({ type: TransactionType.CASH_PAYMENT })}
          className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] text-center active:scale-95 transition-all group"
        >
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="font-black text-emerald-600">টাকা জমা নিন</p>
        </button>
      </div>

      {/* Active Unpaid Dues Section */}
      {unpaidBakiItems.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-rose-50/60 to-orange-50/40 p-5 sm:p-6 rounded-[2.5rem] border-2 border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                বর্তমান অপরিশোধিত খাতসমূহ ({unpaidBakiItems.length} টি)
              </h3>
            </div>
            <span className="text-[11px] font-extrabold text-rose-600 bg-rose-100/70 px-2.5 py-1 rounded-xl">
              খাত অনুযায়ী ১-ক্লিক পরিশোধ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unpaidBakiItems.map(item => {
              const remainingDue = Math.max(0, item.amount - (item.paidAmount || 0));
              const isBkash = item.type.includes('বিকাশ') || (item.note && item.note.includes('বিকাশ'));
              const isMobile = item.note && item.note.includes('মোবাইল');
              const isPartial = item.status === 'partial';

              return (
                <div 
                  key={item.id} 
                  className="bg-white p-4 rounded-2xl border-2 border-rose-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-xs ${
                        isBkash ? 'bg-pink-100 text-pink-600' : isMobile ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {isBkash ? '⚡' : isMobile ? '📱' : '🛒'}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">{item.note || item.type}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {new Date(item.date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-600 text-lg">€ {remainingDue.toLocaleString('it-IT')}</span>
                      {isPartial && (
                        <p className="text-[9px] font-bold text-amber-600">
                          মূল: €{item.amount}, জমা: €{item.paidAmount}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400">
                      {isPartial ? '⚡ আংশিক বাকি' : '⏳ বকেয়া'}
                    </span>
                    <button
                      onClick={() => openSettleModal(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>পরিশোধ করুন 🟢</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction History Section Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 ml-1">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">লেনদেন ইতিহাস</h3>
        
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl text-[11px] font-black self-start sm:self-auto">
          <button
            onClick={() => setHistoryTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              historyTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            সব ({transactions.length})
          </button>
          <button
            onClick={() => setHistoryTab('due')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              historyTab === 'due' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            বকেয়া ({unpaidBakiItems.length})
          </button>
          <button
            onClick={() => setHistoryTab('paid')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              historyTab === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            পরিশোধিত ({paidItems.length})
          </button>
        </div>
      </div>

      <div className="space-y-3 pb-10">
        {transactions
          .filter(t => {
            if (historyTab === 'due') {
              return (t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI) && t.status !== 'paid';
            }
            if (historyTab === 'paid') {
              return t.status === 'paid' || t.type === TransactionType.CASH_PAYMENT || t.type === TransactionType.BKASH_JOMA;
            }
            return true;
          })
          .map(t => (
            <TransactionCard 
              key={t.id} 
              transaction={t} 
              onDelete={onDelete} 
              onEdit={(tx) => {
                setEditingTx(tx);
                setTxEditAmount(tx.amount.toString());
                setTxEditNote(tx.note || '');
              }}
              onSettle={openSettleModal}
              onClick={() => {}} 
            />
          ))}
      </div>

      {/* Edit Customer Modal */}
      {showEditCustomerModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditCustomerModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 z-10">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-black text-slate-800">কাস্টমারের নাম এডিট করুন ✏️</h3>
                <p className="text-xs font-bold text-slate-400">ভুল নাম বা তথ্য ঠিক করতে এডিট করুন</p>
              </div>
              <button onClick={() => setShowEditCustomerModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveCustomerEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">কাস্টমারের নাম *</label>
                <input 
                  type="text"
                  required
                  placeholder="যেমন: রহিম হোসেন"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input 
                  type="tel"
                  placeholder="যেমন: 01700000000"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowEditCustomerModal(false)}
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

      {/* Edit Single Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingTx(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 z-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">লেনদেন সংশোধন ✏️</h3>
                <p className="text-xs font-bold text-slate-400">{editingTx.type} এর পরিমাণ বা বিবরণ পরিমার্জন</p>
              </div>
              <button onClick={() => setEditingTx(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveTxEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">টাকার পরিমাণ (€) *</label>
                <input 
                  type="number" 
                  step="any"
                  required
                  value={txEditAmount}
                  onChange={(e) => setTxEditAmount(e.target.value)}
                  placeholder="টাকার পরিমাণ..."
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">বিবরণ (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  value={txEditNote}
                  onChange={(e) => setTxEditNote(e.target.value)}
                  placeholder="বিবরণ..."
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-slate-800 transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-2xl font-black text-sm"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-slate-900 text-white p-4 rounded-2xl font-black text-sm shadow-xl"
                >
                  আপডেট করুন ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Baki Item Modal (১-ক্লিক সম্পূর্ণ বা আংশিক পরিশোধ) */}
      {settleModalItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSettleModalItem(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 z-10">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-black text-slate-800">হিসাব পরিশোধ করুন ✅</h3>
                <p className="text-xs font-bold text-slate-400">
                  {settleModalItem.note || settleModalItem.type}
                </p>
              </div>
              <button 
                onClick={() => setSettleModalItem(null)} 
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {/* Item Due Status Banner */}
            <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl mb-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-500 block tracking-wider">এই খাতের মোট বাকি</span>
                <span className="text-2xl font-black text-rose-600">
                  € {Math.max(0, settleModalItem.amount - (settleModalItem.paidAmount || 0)).toLocaleString('it-IT')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const fullDue = Math.max(0, settleModalItem.amount - (settleModalItem.paidAmount || 0));
                  setSettlePayAmount(fullDue.toString());
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-md shadow-emerald-100 active:scale-95 transition-all"
              >
                পুরো € {Math.max(0, settleModalItem.amount - (settleModalItem.paidAmount || 0))} পরিশোধ
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  পরিশোধের পরিমাণ (€) * (আংশিক বা সম্পূর্ণ)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">€</div>
                  <input 
                    type="number" 
                    step="any"
                    required
                    value={settlePayAmount}
                    onChange={(e) => setSettlePayAmount(e.target.value)}
                    placeholder="পরিমাণ লিখুন..."
                    className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl outline-none focus:border-emerald-600 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Payment Type Selection */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  কীভাবে টাকা জমা নিলেন?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlePayType(TransactionType.CASH_PAYMENT)}
                    className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                      settlePayType === TransactionType.CASH_PAYMENT
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span>💵 নগদ পরিশোধ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlePayType(TransactionType.BKASH_JOMA)}
                    className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                      settlePayType === TransactionType.BKASH_JOMA
                        ? 'bg-pink-600 text-white border-pink-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span>📱 বিকাশ জমা</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  পরিশোধের বিবরণ / নোট (ঐচ্ছিক)
                </label>
                <input 
                  type="text" 
                  value={settlePayNote}
                  onChange={(e) => setSettlePayNote(e.target.value)}
                  placeholder="যেমন: বিকাশ বাকি পরিশোধ..."
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-600 transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setSettleModalItem(null)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-2xl font-black text-sm"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 active:scale-95 transition-all"
                >
                  পরিশোধ সম্পন্ন করুন ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-slate-800">
                {showAddModal.type === TransactionType.BAKI || showAddModal.type === TransactionType.BKASH_BAKI 
                  ? 'নতুন বাকি হিসাব 🔴' 
                  : 'টাকা জমা নিন 🟢'}
              </h3>
              <button 
                onClick={() => setShowAddModal(null)} 
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Category Quick Chips */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  খাত / ক্যাটাগরি বাছাই করুন
                </label>
                {(showAddModal.type === TransactionType.BAKI || showAddModal.type === TransactionType.BKASH_BAKI) ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal({ type: TransactionType.BKASH_BAKI });
                        setNote('বিকাশ বাকি');
                      }}
                      className={`p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                        showAddModal.type === TransactionType.BKASH_BAKI || note.includes('বিকাশ')
                          ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      <span>⚡ বিকাশ বাকি</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal({ type: TransactionType.BAKI });
                        setNote('দোকানের বাকি');
                      }}
                      className={`p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                        note === 'দোকানের বাকি'
                          ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      <span>🛒 দোকানের বাকি</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal({ type: TransactionType.BAKI });
                        setNote('মোবাইল বাকি');
                      }}
                      className={`p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                        note === 'মোবাইল বাকি'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      <span>📱 মোবাইল বাকি</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal({ type: TransactionType.BAKI });
                        if (['বিকাশ বাকি', 'দোকানের বাকি', 'মোবাইল বাকি'].includes(note)) setNote('');
                      }}
                      className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                        showAddModal.type === TransactionType.BAKI && !['দোকানের বাকি', 'মোবাইল বাকি'].includes(note) && !note.includes('বিকাশ')
                          ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      <span>📝 সাধারণ বাকি</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal({ type: TransactionType.CASH_PAYMENT });
                        setNote('নগদ পরিশোধ');
                      }}
                      className={`p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                        showAddModal.type === TransactionType.CASH_PAYMENT
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      }`}
                    >
                      <span>💵 নগদ পরিশোধ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal({ type: TransactionType.BKASH_JOMA });
                        setNote('বিকাশ জমা');
                      }}
                      className={`p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                        showAddModal.type === TransactionType.BKASH_JOMA
                          ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                          : 'bg-pink-50 border-pink-100 text-pink-700'
                      }`}
                    >
                      <span>📱 বিকাশ জমা</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  টাকার পরিমাণ (€) *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">€</div>
                  <input 
                    autoFocus
                    type="number" 
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl outline-none focus:border-slate-800 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  বিবরণ (ঐচ্ছিক)
                </label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="যেমন: বিকাশ বাকি, দোকানের বাকি ইত্যাদি..."
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-slate-800 transition-all"
                />
              </div>

              <button 
                onClick={handleQuickAdd}
                className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 text-base ${
                  showAddModal.type === TransactionType.BAKI || showAddModal.type === TransactionType.BKASH_BAKI 
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' 
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'
                }`}
              >
                সেভ করুন ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMessageModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800">মেসেজ পাঠান 💬</h3>
                <p className="text-xs font-bold text-slate-400">{name}-এর জন্য বার্তা টেমপ্লেট</p>
              </div>
              <button onClick={() => setShowMessageModal(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-black">
              <button
                onClick={() => handleMsgTypeChange('reminder')}
                className={`flex-1 py-2.5 px-2 rounded-xl transition-all ${msgType === 'reminder' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🔴 বকেয়া তাগাদা
              </button>
              <button
                onClick={() => handleMsgTypeChange('thankyou')}
                className={`flex-1 py-2.5 px-2 rounded-xl transition-all ${msgType === 'thankyou' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🟢 ধন্যবাদ
              </button>
              <button
                onClick={() => handleMsgTypeChange('statement')}
                className={`flex-1 py-2.5 px-2 rounded-xl transition-all ${msgType === 'statement' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              >
                📋 বিবরণী
              </button>
            </div>

            {/* Editable Message Box */}
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-200 relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">মেসেজের বিবরণ (সম্পাদনাযোগ্য):</span>
                <button 
                  onClick={handleCopyMessage}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${copyStatus ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:text-indigo-600 border border-slate-200'}`}
                >
                  {copyStatus ? 'কপি হয়েছে!' : 'কপি করুন'}
                </button>
              </div>
              <textarea 
                rows={5}
                value={activeMessageText}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">কোথায় পাঠাতে চান?</p>
              
              <button 
                onClick={handleWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-100 active:scale-95 transition-all text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                WhatsApp-এ মেসেজ পাঠান
              </button>

              <button 
                onClick={handleSMS}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                সরাসরি SMS পাঠান
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden PDF Template */}
      <div id="report-pdf-template" style={{ display: 'none', padding: '20px', fontFamily: "'Hind Siliguri', sans-serif" }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', margin: '0', color: '#0f172a' }}>{shopName || "বাকির খাতা"}</h1>
          <p style={{ fontSize: '16px', color: '#64748b', marginTop: '5px' }}>লেনদেন রিপোর্ট (Transaction History)</p>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0', fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>গ্রাহকের নাম</p>
            <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{name}</p>
            {phone && <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#64748b' }}>মোবাইল: {phone}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0', fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>তারিখ</p>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{new Date().toLocaleDateString('it-IT')}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
          <div style={{ flex: '1', border: '1px solid #fee2e2', borderRadius: '15px', padding: '15px', backgroundColor: '#fff1f2', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#be123c', fontWeight: 'bold' }}>বর্তমানে পাওনা</p>
            <p style={{ margin: '0', fontSize: '20px', fontWeight: '900', color: '#e11d48' }}>€ {balance.toLocaleString('it-IT')}</p>
          </div>
          <div style={{ flex: '1', border: '1px solid #e0e7ff', borderRadius: '15px', padding: '15px', backgroundColor: '#eef2ff', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#3730a3', fontWeight: 'bold' }}>সর্বশেষ জমা</p>
            <p style={{ margin: '0', fontSize: '18px', fontWeight: '900', color: '#4f46e5' }}>
              € {lastPayment ? lastPayment.amount.toLocaleString('it-IT') : '0'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '9px', color: '#6366f1' }}>
              {lastPayment ? new Date(lastPayment.date).toLocaleDateString('it-IT') : 'কোনো জমা নেই'}
            </p>
          </div>
          <div style={{ flex: '1', border: '1px solid #fee2e2', borderRadius: '15px', padding: '15px', backgroundColor: '#fff5f5', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#991b1b', fontWeight: 'bold' }}>মোট বাকি দেওয়া</p>
            <p style={{ margin: '0', fontSize: '20px', fontWeight: '900', color: '#dc2626' }}>€ {totalBaki.toLocaleString('it-IT')}</p>
          </div>
          <div style={{ flex: '1', border: '1px solid #dcfce7', borderRadius: '15px', padding: '15px', backgroundColor: '#f0fdf4', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>মোট জমা পাওয়া</p>
            <p style={{ margin: '0', fontSize: '20px', fontWeight: '900', color: '#10b981' }}>€ {totalJoma.toLocaleString('it-IT')}</p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '10px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>তারিখ</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>বিবরণ</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, idx) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(t.date).toLocaleDateString('it-IT')}</td>
                <td style={{ padding: '12px', fontSize: '13px' }}>
                   <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                    {t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI ? 'বাকি' : 'জমা'}
                   </div>
                   {t.note && <div style={{ fontSize: '11px', color: '#64748b' }}>{t.note}</div>}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI ? '#e11d48' : '#10b981' }}>
                  {t.type === TransactionType.BAKI || t.type === TransactionType.BKASH_BAKI ? '+ ' : '- '}
                  € {t.amount.toLocaleString('it-IT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#fff1f2', borderRadius: '10px', borderLeft: '4px solid #e11d48' }}>
          <p style={{ margin: '0', fontSize: '14px', color: '#be123c', fontWeight: 'bold' }}>জরুরী তাগাদা (Official Request):</p>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#e11d48', lineHeight: '1.6' }}>
            উপরে উল্লেখিত বকেয়া টাকার বিবরণটি চূড়ান্ত হিসাব হিসেবে গণ্য করা হলো। অনুগ্রহ করে দ্রুত সময়ের মধ্যে আপনার সম্পূর্ণ বকেয়া টাকা পরিশোধ করে ব্যবসায়িক লেনদেন পরিষ্কার রাখুন। আপনার একান্ত সহযোগিতা আমাদের কাম্য।
          </p>
        </div>

        <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
          <p>এই রিপোর্টটি ডিজিটাল বকেয়া খাতা থেকে তৈরি করা হয়েছে।</p>
        </div>
      </div>
    </div>
  );
};
