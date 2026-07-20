import React, { useState, useEffect, useMemo } from 'react';
import { HoldingTransaction } from '../types.ts';
import { supabase } from '../lib/supabase.ts';

// We import html2pdf if available on window, similar to CustomerFolder
declare const html2pdf: any;

interface HoldingLedgerProps {
  userId: string | null;
}

export const HoldingLedger: React.FC<HoldingLedgerProps> = ({ userId }) => {
  const [holdings, setHoldings] = useState<HoldingTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'holding' | 'completed'>('holding');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Partial pay/release modal states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayItem, setSelectedPayItem] = useState<HoldingTransaction | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEditItem, setSelectedEditItem] = useState<HoldingTransaction | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  // Add more money modal states
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [selectedAddMoneyItem, setSelectedAddMoneyItem] = useState<HoldingTransaction | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyNote, setAddMoneyNote] = useState('');
  
  // Selected entry for detailed view or action
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Load from LocalStorage & attempt Supabase fetch
  useEffect(() => {
    const local = localStorage.getItem('holding_transactions');
    if (local) {
      try {
        setHoldings(JSON.parse(local));
      } catch (e) {
        console.error("Error parsing local holding transactions", e);
      }
    }
    
    if (userId) {
      fetchHoldingsFromSupabase(userId);
    }
  }, [userId]);

  const fetchHoldingsFromSupabase = async (uid: string) => {
    try {
      // We check if the table exists or query it. If table doesn't exist, it will throw an error
      const { data, error } = await supabase
        .from('holding_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false });

      if (error) {
        // Table might not exist yet, we will rely on localStorage but try to create/insert anyway
        console.log("Supabase holding_transactions table read issue, using localStorage fallback:", error.message);
        return;
      }

      if (data) {
        setHoldings(data);
        localStorage.setItem('holding_transactions', JSON.stringify(data));
        showSyncStatus("ক্লাউড সিঙ্ক সম্পন্ন ✅");
      }
    } catch (e) {
      console.log("Offline or no table: relying on LocalStorage");
    }
  };

  const showSyncStatus = (msg: string) => {
    setSyncStatus(msg);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // Save holdings helper
  const saveHoldings = async (newHoldings: HoldingTransaction[]) => {
    setHoldings(newHoldings);
    localStorage.setItem('holding_transactions', JSON.stringify(newHoldings));

    if (userId) {
      try {
        // Attempt to sync to Supabase. We do upsert.
        // We'll map transactions with user_id
        const records = newHoldings.map(h => ({
          ...h,
          user_id: userId
        }));

        const { error } = await supabase
          .from('holding_transactions')
          .upsert(records, { onConflict: 'id' });

        if (error) {
          console.log("Supabase sync issue, saved locally:", error.message);
          showSyncStatus("অফলাইনে সেভ হলো ⚠️");
        } else {
          showSyncStatus("ক্লাউডে সেভ হয়েছে ✅");
        }
      } catch (e) {
        showSyncStatus("অফলাইনে সেভ হলো ⚠️");
      }
    }
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) {
      alert("নাম এবং টাকার পরিমাণ আবশ্যক!");
      return;
    }

    const newEntry: HoldingTransaction = {
      id: `holding-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || undefined,
      amount: parseFloat(amount),
      note: note.trim() || undefined,
      status: 'holding',
      date: new Date().toISOString()
    };

    const updated = [newEntry, ...holdings];
    await saveHoldings(updated);

    // Reset fields
    setName('');
    setPhone('');
    setAmount('');
    setNote('');
    setIsAddModalOpen(false);
  };

  const handleReleasePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayItem) return;

    const amountToPay = parseFloat(payAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      alert("পরিশোধের পরিমাণ সঠিক নয়!");
      return;
    }

    if (amountToPay > selectedPayItem.amount) {
      alert(`পরিশোধের পরিমাণ মোট জমার (€ ${selectedPayItem.amount}) চেয়ে বেশি হতে পারবে না!`);
      return;
    }

    const isFullPayment = amountToPay === selectedPayItem.amount;
    let updated: HoldingTransaction[] = [];

    const confirmMsg = isFullPayment
      ? `আপনি কি সম্পূর্ণ € ${amountToPay.toLocaleString('it-IT')} পরিশোধিত/কমপ্লিট হিসেবে চিহ্নিত করতে চান?`
      : `আপনি কি আংশিক € ${amountToPay.toLocaleString('it-IT')} পরিশোধ করতে চান? (অবশিষ্ট জমা থাকবে € ${(selectedPayItem.amount - amountToPay).toLocaleString('it-IT')})`;

    if (!confirm(confirmMsg)) return;

    if (isFullPayment) {
      // Mark original as completed
      updated = holdings.map(h => {
        if (h.id === selectedPayItem.id) {
          return {
            ...h,
            status: 'completed' as const,
            completedDate: new Date().toISOString(),
            note: payNote.trim() ? payNote.trim() : h.note
          };
        }
        return h;
      });
    } else {
      // Partial payment
      // 1. Create a new completed transaction for the paid/released portion
      const paidEntry: HoldingTransaction = {
        id: `holding-comp-${Date.now()}`,
        name: selectedPayItem.name,
        phone: selectedPayItem.phone,
        amount: amountToPay,
        note: `${payNote.trim() || 'আংশিক পরিশোধ'} (মূল জমা €${selectedPayItem.amount} থেকে আংশিক পরিশোধিত)`,
        status: 'completed',
        date: selectedPayItem.date, // keep original deposit date
        completedDate: new Date().toISOString()
      };

      // 2. Reduce the original active transaction's amount by the paid portion
      updated = holdings.map(h => {
        if (h.id === selectedPayItem.id) {
          const newAmount = h.amount - amountToPay;
          const currentNote = h.note || '';
          const addition = `[€${amountToPay} পরিশোধিত - ${new Date().toLocaleDateString('it-IT')}]`;
          return {
            ...h,
            amount: newAmount,
            note: currentNote ? `${currentNote} ${addition}` : addition
          };
        }
        return h;
      });

      // Insert the paid portion
      updated = [paidEntry, ...updated];
    }

    await saveHoldings(updated);
    setIsPayModalOpen(false);
    setSelectedPayItem(null);
    setPayAmount('');
    setPayNote('');
  };

  const handleEditHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditItem) return;
    if (!editName || !editAmount) {
      alert("নাম এবং টাকার পরিমাণ আবশ্যক!");
      return;
    }

    const updated = holdings.map(h => {
      if (h.id === selectedEditItem.id) {
        return {
          ...h,
          name: editName.trim(),
          phone: editPhone.trim() || undefined,
          amount: parseFloat(editAmount),
          note: editNote.trim() || undefined,
        };
      }
      return h;
    });

    await saveHoldings(updated);
    setIsEditModalOpen(false);
    setSelectedEditItem(null);
    setEditName('');
    setEditPhone('');
    setEditAmount('');
    setEditNote('');
  };

  const handleAddMoreMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddMoneyItem) return;

    const amountToAdd = parseFloat(addMoneyAmount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      alert("জমার পরিমাণ সঠিক নয়!");
      return;
    }

    const newAmount = selectedAddMoneyItem.amount + amountToAdd;
    const confirmMsg = `আপনি কি ${selectedAddMoneyItem.name}-এর হিসাবে আরও € ${amountToAdd.toLocaleString('it-IT')} যুক্ত করতে চান?\n\nপূর্বের জমা: € ${selectedAddMoneyItem.amount.toLocaleString('it-IT')}\nনতুন জমা: € ${newAmount.toLocaleString('it-IT')}`;

    if (!confirm(confirmMsg)) return;

    const updated = holdings.map(h => {
      if (h.id === selectedAddMoneyItem.id) {
        const currentNote = h.note || '';
        const dateStr = new Date().toLocaleDateString('it-IT');
        const customNotePart = addMoneyNote.trim() ? ` (${addMoneyNote.trim()})` : '';
        const addition = `[€${amountToAdd} অতিরিক্ত জমা${customNotePart} - ${dateStr}]`;
        return {
          ...h,
          amount: newAmount,
          note: currentNote ? `${currentNote} ${addition}` : addition
        };
      }
      return h;
    });

    await saveHoldings(updated);
    setIsAddMoneyModalOpen(false);
    setSelectedAddMoneyItem(null);
    setAddMoneyAmount('');
    setAddMoneyNote('');
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই রেকর্ডটি মুছে ফেলতে চান? এটি আর ফেরত পাওয়া যাবে না।")) return;
    
    const updated = holdings.filter(h => h.id !== id);
    setHoldings(updated);
    localStorage.setItem('holding_transactions', JSON.stringify(updated));

    if (userId) {
      try {
        const { error } = await supabase
          .from('holding_transactions')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.log("Supabase delete failed, deleted locally:", error.message);
        }
      } catch (e) {
        console.log("Offline delete");
      }
    }
    showSyncStatus("মুছে ফেলা হয়েছে");
  };

  // Stats calculation
  const stats = useMemo(() => {
    const activeHoldings = holdings.filter(h => h.status === 'holding');
    const completedHoldings = holdings.filter(h => h.status === 'completed');

    const totalActiveAmount = activeHoldings.reduce((sum, h) => sum + h.amount, 0);
    const totalCompletedAmount = completedHoldings.reduce((sum, h) => sum + h.amount, 0);
    const uniqueDepositors = new Set(activeHoldings.map(h => h.name)).size;

    return {
      totalActiveAmount,
      totalCompletedAmount,
      uniqueDepositors
    };
  }, [holdings]);

  // Filtered holdings list
  const filteredHoldings = useMemo(() => {
    return holdings
      .filter(h => h.status === activeTab)
      .filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()) || (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [holdings, activeTab, searchQuery]);

  // Generate WhatsApp text
  const sendWhatsApp = (item: HoldingTransaction) => {
    const formatAmount = `€ ${item.amount.toLocaleString()}`;
    const dateFormatted = new Date(item.date).toLocaleDateString('it-IT');
    
    let text = '';
    if (item.status === 'holding') {
      text = `আসসালামু আলাইকুম ${item.name},\nআপনার গচ্ছিত রাখা আমানত সফলভাবে আমাদের হেফাজতে জমা করা হয়েছে।\n\n💵 পরিমাণ: ${formatAmount}\n📅 তারিখ: ${dateFormatted}\n📌 বিবরণ: ${item.note || 'মানি ট্রান্সফারের জন্য জমা'}\n\nধন্যবাদান্তে,\nডিজিটাল আমানত খাতা`;
    } else {
      const compDate = item.completedDate ? new Date(item.completedDate).toLocaleDateString('it-IT') : dateFormatted;
      text = `আসসালামু আলাইকুম ${item.name},\nআপনার পূর্বের গচ্ছিত রাখা আমানতের টাকা সফলভাবে পাঠানো / পরিশোধ করা হয়েছে।\n\n💵 পরিমাণ: ${formatAmount}\n📅 জমার তারিখ: ${dateFormatted}\n✅ পরিশোধের তারিখ: ${compDate}\n📌 বিবরণ: ${item.note || 'পরিশোধিত'}\n\nআপনার বিশ্বস্ত সহযোগিতার জন্য ধন্যবাদ।`;
    }

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = item.phone 
      ? `https://api.whatsapp.com/send?phone=${item.phone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
  };

  // Download Receipt PDF
  const downloadReceiptPDF = async (item: HoldingTransaction) => {
    setLoading(true);
    
    // Create temporary styled div for printing
    const element = document.createElement('div');
    element.id = `receipt-pdf-${item.id}`;
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.color = '#1e293b';
    element.style.backgroundColor = '#ffffff';
    element.style.width = '100%';
    element.style.boxSizing = 'border-box';
    element.style.display = 'none';

    const formattedAmount = `€ ${item.amount.toLocaleString('it-IT')}`;
    const formattedDate = new Date(item.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedCompDate = item.completedDate 
      ? new Date(item.completedDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    element.innerHTML = `
      <div style="border: 2px solid #0f172a; border-radius: 20px; padding: 30px; position: relative; background: #fafafa;">
        <!-- Watermark / Background Pattern -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(15, 23, 42, 0.03); pointer-events: none; white-space: nowrap;">
          আমানত রশিদ
        </div>

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">আমানত রশিদ</h1>
            <p style="margin: 5px 0 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">মানি ট্রান্সফার ও সেফ কিপিং</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold;">রশিদ আইডি</p>
            <p style="margin: 2px 0 0; font-size: 14px; font-weight: bold; color: #0f172a;">${item.id}</p>
          </div>
        </div>

        <!-- Status Tag -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <div>
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold;">আমানতের অবস্থা</p>
            <span style="display: inline-block; margin-top: 5px; padding: 6px 16px; font-size: 12px; font-weight: 900; border-radius: 30px; ${
              item.status === 'holding' 
                ? 'background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a;' 
                : 'background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;'
            }">
              ${item.status === 'holding' ? 'জমা রয়েছে (HOLDING)' : 'পরিশোধিত/পাঠানো হয়েছে (PAID)'}
            </span>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold;">তারিখ</p>
            <p style="margin: 2px 0 0; font-size: 14px; font-weight: bold; color: #1e293b;">${formattedDate}</p>
          </div>
        </div>

        <!-- Content Box -->
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 15px; padding: 24px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: bold; width: 40%;">গ্রাহকের নাম</td>
              <td style="padding: 12px 0; font-size: 16px; color: #0f172a; font-weight: 900; text-align: right;">${item.name}</td>
            </tr>
            ${item.phone ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: bold;">মোবাইল নম্বর</td>
              <td style="padding: 12px 0; font-size: 14px; color: #0f172a; font-weight: bold; text-align: right;">${item.phone}</td>
            </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: bold;">টাকার পরিমাণ (ইউরো)</td>
              <td style="padding: 12px 0; font-size: 24px; color: #0f172a; font-weight: 900; text-align: right; font-family: monospace;">${formattedAmount}</td>
            </tr>
            ${item.note ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: bold;">বিশেষ নোট / বিবরণ</td>
              <td style="padding: 12px 0; font-size: 14px; color: #475569; text-align: right; font-style: italic;">"${item.note}"</td>
            </tr>
            ` : ''}
            ${item.status === 'completed' ? `
            <tr>
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: bold;">পরিশোধের তারিখ</td>
              <td style="padding: 12px 0; font-size: 14px; color: #16a34a; font-weight: 900; text-align: right;">${formattedCompDate}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Official Disclaimer / Request -->
        <div style="padding: 15px; background-color: #f8fafc; border-radius: 12px; border-left: 4px solid #0f172a; margin-bottom: 40px;">
          <p style="margin: 0; font-size: 13px; color: #0f172a; font-weight: bold; line-height: 1.6;">
            ${item.status === 'holding' 
              ? 'ঘোষণা: গ্রাহকের গচ্ছিত আমানতটি আমাদের ডিজিটাল সিস্টেমে নিবন্ধিত আছে। পরবর্তী নির্দেশনা মোতাবেক আমানতের টাকা সফলভাবে পাঠিয়ে বা পরিশোধ করে দেওয়া হবে।' 
              : 'ঘোষণা: গ্রাহকের পূর্বের গচ্ছিত রাখা আমানতটি যথাযথভাবে পরিশোধ/স্থানান্তর করা হয়েছে। বর্তমান আমানতের কোনো বকেয়া অবশিষ্ট নেই।'}
          </p>
        </div>

        <!-- Signature Lines -->
        <div style="display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
          <div style="text-align: center; width: 45%;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold;">গ্রাহকের স্বাক্ষর</p>
            <div style="height: 40px;"></div>
            <div style="border-top: 1px solid #e2e8f0; width: 80%; margin: 0 auto;"></div>
          </div>
          <div style="text-align: center; width: 45%;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold;">কর্তৃপক্ষের স্বাক্ষর</p>
            <div style="height: 40px;"></div>
            <div style="border-top: 1px solid #e2e8f0; width: 80%; margin: 0 auto;"></div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0;">এই রশিদটি ডিজিটাল আমানত খাতা অ্যাপ থেকে তৈরি ও প্রত্যয়িত করা হয়েছে।</p>
        </div>
      </div>
    `;

    document.body.appendChild(element);

    const opt = {
      margin: 10,
      filename: `amanat_receipt_${item.name}_${new Date(item.date).toLocaleDateString('it-IT').replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore - html2pdf is imported dynamically
      const html2pdf = (await import('html2pdf.js')).default;
      element.style.display = 'block';
      await new Promise(resolve => setTimeout(resolve, 500));
      await html2pdf().set(opt).from(element).save();
      element.style.display = 'none';
      document.body.removeChild(element);
    } catch (e) {
      console.error("PDF download failure:", e);
      alert("পিডিএফ ডাউনলোড করতে সমস্যা হয়েছে। html2pdf লাইব্রেরি চেক করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync toast notification */}
      {syncStatus && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#0f172a] text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            {syncStatus}
          </div>
        </div>
      )}

      {/* Holding Stats Card */}
      <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden select-none border border-slate-800">
        <div className="relative z-10">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">বর্তমানে জমা আছে</p>
              <p className="text-3xl font-black text-amber-400">€ {stats.totalActiveAmount.toLocaleString('it-IT')}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">পরিশোধিত/কমপ্লিট</p>
              <p className="text-3xl font-black text-emerald-400">€ {stats.totalCompletedAmount.toLocaleString('it-IT')}</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">মোট আমানতকারী</span>
              <span className="text-sm font-extrabold text-amber-300">{stats.uniqueDepositors} জন গ্রাহক</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">মোট লেনদেন ভলিউম</span>
              <span className="text-sm font-extrabold text-indigo-300">€ {(stats.totalActiveAmount + stats.totalCompletedAmount).toLocaleString('it-IT')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Search & Tabs */}
      <div className="space-y-4">
        {/* Toggle tabs for status */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('holding')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'holding' 
                ? 'bg-white text-amber-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            সক্রিয় আমানত ({holdings.filter(h => h.status === 'holding').length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'completed' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            পরিশোধিত আমানত ({holdings.filter(h => h.status === 'completed').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <input 
            type="text"
            placeholder="নাম বা নোট দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-xs"
          />
        </div>
      </div>

      {/* Holding Cards List */}
      <div className="space-y-3 pb-32">
        {filteredHoldings.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h4 className="text-slate-600 font-black text-sm mb-0.5">কোনো আমানত রেকর্ড নেই</h4>
            <p className="text-slate-400 text-xs font-bold">নতুন আমানত যোগ করতে নিচের বাটনটি চাপুন</p>
          </div>
        ) : (
          filteredHoldings.map(item => {
            const isExpanded = expandedId === item.id;
            return (
              <div 
                key={item.id}
                className={`bg-white border rounded-[2rem] transition-all overflow-hidden ${
                  isExpanded ? 'border-slate-800 shadow-md ring-1 ring-slate-800/5' : 'border-slate-100 shadow-sm hover:border-slate-200'
                }`}
              >
                {/* Header Summary Tab */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-black text-slate-800 truncate text-base">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      📅 {new Date(item.date).toLocaleDateString('it-IT')} {item.phone ? `• 📞 ${item.phone}` : ''}
                    </p>
                    {item.note && (
                      <p className="text-[10px] text-slate-500 mt-1 font-medium truncate italic max-w-[200px]">
                        # {item.note}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className={`text-lg font-black ${item.status === 'holding' ? 'text-amber-600' : 'text-slate-500 line-through'}`}>
                        € {item.amount.toLocaleString('it-IT')}
                      </p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.status === 'holding' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.status === 'holding' ? 'জমা আছে' : 'পরিশোধিত'}
                      </span>
                    </div>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#94a3b8" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                </div>

                {/* Expanded Action Section */}
                {isExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Notes Detail if present */}
                    {item.note && (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed font-bold">
                        <span className="text-[9px] text-slate-400 block mb-1">বিশেষ বিবরণ (Note):</span>
                        "{item.note}"
                      </div>
                    )}

                    {item.completedDate && (
                      <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/50 text-xs text-emerald-800 font-bold">
                        <span className="text-[9px] text-emerald-500 block mb-1">পরিশোধের তারিখ (Completed Date):</span>
                        ✅ {new Date(item.completedDate).toLocaleDateString('it-IT')} তারিখে পরিশোধ করা হয়েছে
                      </div>
                    )}

                    {/* Operation Bar */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2">
                      {item.status === 'holding' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPayItem(item);
                              setPayAmount(item.amount.toString());
                              setPayNote('');
                              setIsPayModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 px-3 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 sm:flex-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            পরিশোধ / রিলিজ
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAddMoneyItem(item);
                              setAddMoneyAmount('');
                              setAddMoneyNote('');
                              setIsAddMoneyModalOpen(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-3 px-3 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 sm:flex-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            আরও জমা করুন
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => sendWhatsApp(item)}
                        className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black py-3 px-3 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        মেসেজ পাঠান
                      </button>

                      <button
                        onClick={() => downloadReceiptPDF(item)}
                        disabled={loading}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-black py-3 px-3 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        রশিদ (PDF)
                      </button>

                      <button
                        onClick={() => {
                          setSelectedEditItem(item);
                          setEditName(item.name);
                          setEditPhone(item.phone || '');
                          setEditAmount(item.amount.toString());
                          setEditNote(item.note || '');
                          setIsEditModalOpen(true);
                        }}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-black py-3 px-3 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        এডিট
                      </button>

                      <button
                        onClick={() => handleDeleteHolding(item.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black py-3 px-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        মুছুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Holding Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-6 top-6 w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-2">নতুন আমানত যোগ করুন</h3>
            <p className="text-xs text-slate-400 font-bold mb-6">পরবর্তীতে মানি ট্রান্সফার বা ফেরত দেওয়ার আমানত রেকর্ড</p>

            <form onSubmit={handleAddHolding} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">আমানতকারীর নাম *</label>
                <input 
                  type="text" 
                  required
                  placeholder="যেমন: শরীফ হোসাইন"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input 
                  type="tel" 
                  placeholder="যেমন: +3932XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">আমানতের পরিমাণ (€) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">€</span>
                  <input 
                    type="number" 
                    required
                    min="1"
                    step="any"
                    placeholder="যেমন: 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">মন্তব্য / বিবরণ</label>
                <textarea 
                  placeholder="যেমন: বাংলাদেশ ১ মাস পরে পাঠাবে"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#0f172a] hover:bg-slate-800 text-white p-5 rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all mt-4"
              >
                আমানত জমা করুন 📥
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Release Payment / Partial Payment Modal */}
      {isPayModalOpen && selectedPayItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsPayModalOpen(false); setSelectedPayItem(null); }} />
          
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setIsPayModalOpen(false); setSelectedPayItem(null); }}
              className="absolute right-6 top-6 w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1">আমানত পরিশোধ / স্থানান্তর</h3>
            <p className="text-xs text-slate-400 font-bold mb-4">আংশিক বা সম্পূর্ণ টাকা পরিশোধ ও পাঠানোর হিসাব রাখুন</p>

            <div className="bg-amber-50 border border-amber-100/50 p-4 rounded-2xl mb-5 text-xs text-amber-800 font-bold">
              <span className="text-[10px] text-amber-600 block mb-0.5">আমানতকারী:</span>
              <span className="text-sm text-slate-800 font-black block mb-2">{selectedPayItem.name}</span>
              <div className="flex justify-between items-center text-slate-700">
                <span>বর্তমানে মোট জমা আছে:</span>
                <span className="text-base text-amber-700 font-black">€ {selectedPayItem.amount.toLocaleString('it-IT')}</span>
              </div>
            </div>

            <form onSubmit={handleReleasePayment} className="space-y-4">
              {/* Pay Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">পরিশোধের পরিমাণ (€) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">€</span>
                  <input 
                    type="number" 
                    required
                    min="0.01"
                    max={selectedPayItem.amount}
                    step="any"
                    placeholder={`যেমন: ${selectedPayItem.amount}`}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayAmount(selectedPayItem.amount.toString())}
                    className="text-[10px] text-indigo-600 font-black uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                  >
                    সম্পূর্ণ পরিশোধ (€ {selectedPayItem.amount})
                  </button>
                  {selectedPayItem.amount > 1 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount((selectedPayItem.amount / 2).toFixed(2).toString())}
                      className="text-[10px] text-amber-600 font-black uppercase tracking-wider bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md transition-colors"
                    >
                      অর্ধেক পরিশোধ (€ {(selectedPayItem.amount / 2).toFixed(2)})
                    </button>
                  )}
                </div>
              </div>

              {/* Pay Note */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">বিশেষ মন্তব্য (যেমন: বাংলাদেশ বিকাশ / ক্যাশ ফেরত)</label>
                <textarea 
                  placeholder="যেমন: শরীফের কাছে পাঠানো হলো"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all"
                >
                  {parseFloat(payAmount) === selectedPayItem.amount ? 'সম্পূর্ণ পরিশোধ সম্পন্ন করুন 💸' : 'আংশিক পরিশোধ নিশ্চিত করুন 💸'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {isEditModalOpen && selectedEditItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsEditModalOpen(false); setSelectedEditItem(null); }} />
          
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setIsEditModalOpen(false); setSelectedEditItem(null); }}
              className="absolute right-6 top-6 w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1">আমানত তথ্য এডিট করুন ✏️</h3>
            <p className="text-xs text-slate-400 font-bold mb-5">কোনো ভুল তথ্য থাকলে তা সংশোধন করে নিন</p>

            <form onSubmit={handleEditHolding} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">আমানতকারীর নাম *</label>
                <input 
                  type="text" 
                  required
                  placeholder="যেমন: শরীফ আহমেদ"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input 
                  type="tel" 
                  placeholder="যেমন: +393280000000"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">আমানতের পরিমাণ (€) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">€</span>
                  <input 
                    type="number" 
                    required
                    min="0.01"
                    step="any"
                    placeholder="যেমন: 500"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">বিশেষ মন্তব্য / বিবরণ</label>
                <textarea 
                  placeholder="যেমন: বাংলাদেশ ১ মাস পরে পাঠাবে"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-[#0f172a] hover:bg-slate-800 text-white p-5 rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all"
                >
                  পরিবর্তন সেভ করুন 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add More Money (Deposit More) Modal */}
      {isAddMoneyModalOpen && selectedAddMoneyItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsAddMoneyModalOpen(false); setSelectedAddMoneyItem(null); }} />
          
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setIsAddMoneyModalOpen(false); setSelectedAddMoneyItem(null); }}
              className="absolute right-6 top-6 w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1">অতিরিক্ত আমানত জমা করুন 💰</h3>
            <p className="text-xs text-slate-400 font-bold mb-4">বর্তমান আমানতকারীর হিসাবে আরও টাকা জমা করুন</p>

            <div className="bg-indigo-50 border border-indigo-100/50 p-4 rounded-2xl mb-5 text-xs text-indigo-800 font-bold">
              <span className="text-[10px] text-indigo-600 block mb-0.5">আমানতকারী:</span>
              <span className="text-sm text-slate-800 font-black block mb-2">{selectedAddMoneyItem.name}</span>
              <div className="flex justify-between items-center text-slate-700">
                <span>বর্তমানে মোট জমা আছে:</span>
                <span className="text-base text-indigo-700 font-black">€ {selectedAddMoneyItem.amount.toLocaleString('it-IT')}</span>
              </div>
            </div>

            <form onSubmit={handleAddMoreMoney} className="space-y-4">
              {/* Add Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">নতুন জমার পরিমাণ (€) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">€</span>
                  <input 
                    type="number" 
                    required
                    min="0.01"
                    step="any"
                    placeholder="যেমন: 500"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm"
                  />
                </div>
                {/* Shortcut quick additions */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {[50, 100, 200, 500, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAddMoneyAmount(val.toString())}
                      className="text-[10px] text-indigo-700 font-black bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all active:scale-95"
                    >
                      +€{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">বিশেষ মন্তব্য / বিবরণ (ঐচ্ছিক)</label>
                <textarea 
                  placeholder="যেমন: ক্যাশ জমা দিলেন"
                  value={addMoneyNote}
                  onChange={(e) => setAddMoneyNote(e.target.value)}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all font-bold text-sm resize-none"
                />
              </div>

              {/* New projected balance */}
              {addMoneyAmount && !isNaN(parseFloat(addMoneyAmount)) && parseFloat(addMoneyAmount) > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center text-xs text-slate-600 font-bold border border-slate-100">
                  <span>নতুন মোট ব্যালেন্স হবে:</span>
                  <span className="text-sm text-slate-800 font-black">€ {(selectedAddMoneyItem.amount + parseFloat(addMoneyAmount)).toLocaleString('it-IT')}</span>
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all"
                >
                  নতুন জমা যুক্ত করুন 💰
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Plus button on this tab */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] animate-in slide-in-from-bottom-12 duration-700">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full bg-slate-900 text-white p-1.5 pr-2 rounded-[2.8rem] shadow-xl flex items-center justify-between group active:scale-[0.96] transition-all border border-slate-800"
        >
          <div className="flex items-center gap-4 pl-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg group-hover:rotate-180 transition-transform duration-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </div>
            <div className="text-left">
              <span className="block font-black text-lg leading-none mb-0.5">নতুন আমানত রাখুন</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ডিপোজিট বা মানি ট্রান্সফার</span>
            </div>
          </div>
          <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center transition-colors group-hover:bg-white/20">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      </div>
    </div>
  );
};
