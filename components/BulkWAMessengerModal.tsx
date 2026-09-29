import React, { useState, useMemo } from 'react';

export interface CustomerSummary {
  name: string;
  balance: number;
  lastDate: string;
  count: number;
  phone?: string;
}

interface BulkWAMessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerSummary[];
  shopName: string;
  onSavePhone: (customerName: string, phone: string) => void;
}

export const BulkWAMessengerModal: React.FC<BulkWAMessengerModalProps> = ({
  isOpen,
  onClose,
  customers,
  shopName,
  onSavePhone,
}) => {
  // Tabs: 'ready' (due + has phone), 'missing_phone' (due + no phone), 'paid' (balance <= 0)
  const [activeTab, setActiveTab] = useState<'ready' | 'missing_phone' | 'paid'>('ready');
  
  // Custom message template
  const [templateText, setTemplateText] = useState(
    'আসসালামু আলাইকুম {নাম},\nআপনার কাছে {দোকান}-এ বর্তমানে € {বাকি} বকেয়া পাওনা আছে। দয়া করে পরিশোধ করার জন্য বিনীত অনুরোধ করা হলো। ধন্যবাদ।\n— {দোকান}'
  );
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  // Quick phone input state by customer name
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({});
  const [editingPhoneFor, setEditingPhoneFor] = useState<string | null>(null);

  // Dispatch queue status
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});
  const [isDispatching, setIsDispatching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Group customers according to business rules:
  // 1. Only customers with balance > 0 (taka pai)
  // 2. Customers with balance <= 0 (paid off) -> excluded from messages
  // 3. Customers without phone -> excluded until phone added
  const dueCustomers = useMemo(() => {
    return customers.filter(c => c.balance > 0);
  }, [customers]);

  const paidCustomers = useMemo(() => {
    return customers.filter(c => c.balance <= 0);
  }, [customers]);

  const readyCustomers = useMemo(() => {
    return dueCustomers.filter(c => Boolean(c.phone && c.phone.trim().length >= 8));
  }, [dueCustomers]);

  const missingPhoneCustomers = useMemo(() => {
    return dueCustomers.filter(c => !c.phone || c.phone.trim().length < 8);
  }, [dueCustomers]);

  // Clean phone number for WhatsApp wa.me
  const formatPhoneForWA = (rawPhone: string) => {
    let cleaned = rawPhone.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    // If starts with 01 (BD standard format: 017...), prepend country code 88
    if (cleaned.startsWith('01') && cleaned.length === 11) {
      cleaned = '88' + cleaned;
    }
    return cleaned;
  };

  // Compile message for a specific customer
  const createMessageFor = (customer: CustomerSummary) => {
    const formattedBalance = Math.abs(customer.balance).toLocaleString('it-IT');
    return templateText
      .replace(/{নাম}/g, customer.name)
      .replace(/{বাকি}/g, formattedBalance)
      .replace(/{দোকান}/g, shopName || 'দোকানের খাতা');
  };

  // Send to single customer
  const sendToCustomer = (customer: CustomerSummary) => {
    if (!customer.phone) return;
    const phoneWA = formatPhoneForWA(customer.phone);
    const text = createMessageFor(customer);
    const url = `https://wa.me/${phoneWA}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setSentStatus(prev => ({ ...prev, [customer.name]: true }));
  };

  // Start 1-Click Auto Dispatcher
  const handleStartDispatch = () => {
    if (readyCustomers.length === 0) return;
    setIsDispatching(true);
    setCurrentIndex(0);
    // Send to first customer
    sendToCustomer(readyCustomers[0]);
  };

  // Move to next customer in dispatch
  const handleNextCustomer = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < readyCustomers.length) {
      setCurrentIndex(nextIdx);
      sendToCustomer(readyCustomers[nextIdx]);
    } else {
      setIsDispatching(false);
    }
  };

  // Open all ready customers' WhatsApp chats (multi-tab)
  const handleOpenAllTabs = () => {
    if (readyCustomers.length === 0) return;
    if (!confirm(`আপনি কি একসাথে ${readyCustomers.length} জনের হোয়াটসঅ্যাপ ওপেন করতে চান? (ব্রাউজার পপ-আপ অনুমতি দেওয়া থাকতে হবে)`)) {
      return;
    }

    readyCustomers.forEach((cust, idx) => {
      setTimeout(() => {
        sendToCustomer(cust);
      }, idx * 600); // 600ms stagger to prevent browser tab drop
    });
  };

  // Save phone number inline
  const handleSavePhoneInline = (customerName: string) => {
    const val = (phoneInputs[customerName] || '').trim();
    if (!val) {
      alert('সঠিক মোবাইল নম্বর লিখুন');
      return;
    }
    onSavePhone(customerName, val);
    setEditingPhoneFor(null);
  };

  if (!isOpen) return null;

  const currentDispatchCustomer = isDispatching ? readyCustomers[currentIndex] : null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5">
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" 
        onClick={() => {
          if (!isDispatching) onClose();
        }} 
      />

      <div className="relative bg-white w-full max-w-2xl max-h-[92vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/20">
                💬
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  এক ক্লিকে WhatsApp তাগাদা
                  <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/40 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    বাকি খাতা
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 font-bold mt-0.5 opacity-90">
                  শুধু বাকি থাকা কাস্টমারদের তালিকা • এক ক্লিকে মেসেজ পাঠান
                </p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-2xl transition-all"
              title="বন্ধ করুন"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => setActiveTab('ready')}
              className={`p-2.5 rounded-2xl text-left transition-all ${
                activeTab === 'ready' 
                  ? 'bg-white text-slate-800 shadow-lg scale-[1.02]' 
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-75">পাঠানোর জন্য রেডি</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-lg sm:text-xl font-black mt-0.5">
                {readyCustomers.length} <span className="text-xs font-bold opacity-75">জন</span>
              </p>
            </button>

            <button
              onClick={() => setActiveTab('missing_phone')}
              className={`p-2.5 rounded-2xl text-left transition-all ${
                activeTab === 'missing_phone' 
                  ? 'bg-amber-400 text-slate-900 shadow-lg scale-[1.02]' 
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-75">নম্বর যোগ বাকি</span>
                <span className="w-2 h-2 rounded-full bg-amber-300"></span>
              </div>
              <p className="text-lg sm:text-xl font-black mt-0.5">
                {missingPhoneCustomers.length} <span className="text-xs font-bold opacity-75">জন</span>
              </p>
            </button>

            <button
              onClick={() => setActiveTab('paid')}
              className={`p-2.5 rounded-2xl text-left transition-all ${
                activeTab === 'paid' 
                  ? 'bg-slate-700 text-white shadow-lg scale-[1.02]' 
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-75">পরিশোধিত (বাদ)</span>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              </div>
              <p className="text-lg sm:text-xl font-black mt-0.5">
                {paidCustomers.length} <span className="text-xs font-bold opacity-75">জন</span>
              </p>
            </button>
          </div>
        </div>

        {/* Dispatching Controller Overlay Banner */}
        {isDispatching && currentDispatchCustomer && (
          <div className="bg-emerald-50 border-b-2 border-emerald-200 p-4 sm:p-5 shrink-0 animate-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    অটো তাগাদা চলছে ({currentIndex + 1}/{readyCustomers.length})
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-800 mt-1">
                  {currentDispatchCustomer.name} • <span className="text-rose-600">€ {Math.abs(currentDispatchCustomer.balance).toLocaleString()}</span>
                </h4>
                <p className="text-xs text-slate-500 font-bold">
                  নম্বর: {currentDispatchCustomer.phone} | হোয়াটসঅ্যাপ চালু করা হয়েছে
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => sendToCustomer(currentDispatchCustomer)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  title="আবার খুলুন"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                  পুনরায় পাঠান
                </button>

                {currentIndex + 1 < readyCustomers.length ? (
                  <button
                    onClick={handleNextCustomer}
                    className="px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                  >
                    পরবর্তী কাস্টমার ({currentIndex + 2}/{readyCustomers.length}) ➡️
                  </button>
                ) : (
                  <button
                    onClick={() => setIsDispatching(false)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    সম্পন্ন হয়েছে 🎉
                  </button>
                )}

                <button
                  onClick={() => setIsDispatching(false)}
                  className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs"
                  title="বন্ধ করুন"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-emerald-200/60 rounded-full h-2 mt-3 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / readyCustomers.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Template Customizer Drawer (Expandable) */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
          <button 
            onClick={() => setShowTemplateEditor(!showTemplateEditor)}
            className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
          >
            <span>📝 মেসেজের লেখা দেখুন / এডিট করুন</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${showTemplateEditor ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
            ট্যাগ: {'{নাম}'}, {'{বাকি}'}, {'{দোকান}'}
          </span>
        </div>

        {showTemplateEditor && (
          <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 space-y-2 animate-in slide-in-from-top-2">
            <textarea
              rows={4}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-xl focus:border-emerald-600 focus:outline-none transition-all shadow-sm"
              placeholder="মেসেজ টেমপ্লেট..."
            />
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>কাস্টমারের নাম এবং বাকি টাকার পরিমাণ স্বয়ংক্রিয়ভাবে বসে যাবে</span>
              <button 
                onClick={() => setTemplateText('আসসালামু আলাইকুম {নাম},\nআপনার কাছে {দোকান}-এ বর্তমানে € {বাকি} বকেয়া পাওনা আছে। দয়া করে পরিশোধ করার জন্য বিনীত অনুরোধ করা হলো। ধন্যবাদ।\n— {দোকান}')}
                className="text-emerald-700 hover:underline font-bold"
              >
                ডিফল্ট লেখা ফিরিয়ে আনুন
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* TAB 1: READY TO SEND */}
          {activeTab === 'ready' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                    বাকি থাকা কাস্টমার (যাদের নম্বর যুক্ত আছে)
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-black">
                      {readyCustomers.length} জন
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    এক ক্লিকে হোয়াটসঅ্যাপে প্রি-ফিল্ড মেসেজ চলে যাবে
                  </p>
                </div>

                {readyCustomers.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleStartDispatch}
                      disabled={isDispatching}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                      ১-ক্লিকে পাঠানো শুরু করুন
                    </button>

                    <button
                      onClick={handleOpenAllTabs}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all"
                      title="সবগুলো ট্যাব একসাথে খোলার চেষ্টা করুন"
                    >
                      সব ট্যাব 📑
                    </button>
                  </div>
                )}
              </div>

              {readyCustomers.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-6">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
                    📱
                  </div>
                  <h4 className="font-black text-slate-700 text-base mb-1">
                    পাঠানোর মতো কোনো নম্বর যুক্ত কাস্টমার পাওয়া যায়নি
                  </h4>
                  <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto mb-4">
                    যাদের কাছে বাকি পান তাদের এখনো মোবাইল নম্বর দেওয়া হয়নি। পাশের &quot;নম্বর যোগ বাকি&quot; ট্যাবে গিয়ে ঝটপট নম্বর যোগ করুন।
                  </p>
                  {missingPhoneCustomers.length > 0 && (
                    <button
                      onClick={() => setActiveTab('missing_phone')}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all"
                    >
                      বাকিদের নম্বর যোগ করুন ({missingPhoneCustomers.length} জন) ✍️
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {readyCustomers.map((cust) => {
                    const isSent = Boolean(sentStatus[cust.name]);
                    const previewText = createMessageFor(cust);

                    return (
                      <div 
                        key={cust.name}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSent 
                            ? 'bg-emerald-50/60 border-emerald-200' 
                            : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                            isSent ? 'bg-emerald-600 text-white' : 'bg-[#0f172a] text-white'
                          }`}>
                            {isSent ? '✓' : cust.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-800 text-sm sm:text-base truncate">
                                {cust.name}
                              </h4>
                              {isSent && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                  পাঠানো হয়েছে ✅
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
                              <span className="font-bold text-slate-500 flex items-center gap-1">
                                📞 {cust.phone}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-black text-rose-600">
                                বাকি: € {Math.abs(cust.balance).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Change Phone inline button */}
                          <button
                            onClick={() => {
                              setEditingPhoneFor(cust.name);
                              setPhoneInputs(prev => ({ ...prev, [cust.name]: cust.phone || '' }));
                            }}
                            className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs transition-colors"
                            title="ফোন নম্বর এডিট করুন"
                          >
                            ✏️
                          </button>

                          {/* Direct WhatsApp Send */}
                          <button
                            onClick={() => sendToCustomer(cust)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                            title="হোয়াটসঅ্যাপে ওপেন করুন"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/></svg>
                            {isSent ? 'পুনরায় পাঠান' : 'মেসেজ পাঠান 💬'}
                          </button>
                        </div>

                        {/* Inline Phone Editor if opened */}
                        {editingPhoneFor === cust.name && (
                          <div className="w-full pt-3 mt-1 border-t border-slate-100 flex items-center gap-2">
                            <input
                              type="tel"
                              value={phoneInputs[cust.name] ?? cust.phone ?? ''}
                              onChange={(e) => setPhoneInputs(prev => ({ ...prev, [cust.name]: e.target.value }))}
                              placeholder="01700000000"
                              className="flex-1 p-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-600 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePhoneInline(cust.name)}
                              className="px-3.5 py-2 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-sm hover:bg-emerald-700"
                            >
                              সেভ
                            </button>
                            <button
                              onClick={() => setEditingPhoneFor(null)}
                              className="px-2.5 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200"
                            >
                              বাতিল
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MISSING PHONE NUMBERS */}
          {activeTab === 'missing_phone' && (
            <div>
              <div className="mb-4">
                <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  নম্বর ছাড়া বাকি কাস্টমার
                  <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-black">
                    {missingPhoneCustomers.length} জন
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  নিচে কাস্টমারের মোবাইল নম্বর লিখে &quot;সেভ করুন&quot; চাপলেই সাথে সাথে তিনি মেসেজ পাঠানোর তালিকায় যুক্ত হয়ে যাবেন।
                </p>
              </div>

              {missingPhoneCustomers.length === 0 ? (
                <div className="py-12 text-center bg-emerald-50/50 rounded-3xl border-2 border-dashed border-emerald-200 p-6">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
                    🎉
                  </div>
                  <h4 className="font-black text-emerald-900 text-base mb-1">
                    সব বাকি কাস্টমারের নম্বর যুক্ত আছে!
                  </h4>
                  <p className="text-xs text-emerald-700 font-bold max-w-sm mx-auto mb-4">
                    কোনো কাস্টমারের নম্বর বাকি নেই। আপনি এখনই সবাইকে একসাথে মেসেজ পাঠাতে পারবেন।
                  </p>
                  <button
                    onClick={() => setActiveTab('ready')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
                  >
                    মেসেজ পাঠানোর তালিকায় যান ➡️
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {missingPhoneCustomers.map((cust) => {
                    const currentVal = phoneInputs[cust.name] ?? '';

                    return (
                      <div 
                        key={cust.name}
                        className="p-4 rounded-2xl bg-amber-50/30 border-2 border-amber-100 hover:border-amber-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 text-sm sm:text-base truncate">
                              {cust.name}
                            </h4>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                              নম্বর নেই
                            </span>
                          </div>
                          <p className="text-xs font-black text-rose-600 mt-0.5">
                            বাকি পরিমাণ: € {Math.abs(cust.balance).toLocaleString()}
                          </p>
                        </div>

                        {/* Inline Phone Input Form */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="tel"
                            value={currentVal}
                            onChange={(e) => setPhoneInputs(prev => ({ ...prev, [cust.name]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSavePhoneInline(cust.name);
                              }
                            }}
                            placeholder="যেমন: 01700000000"
                            className="flex-1 sm:w-44 p-2.5 text-xs font-bold bg-white border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition-all shadow-sm"
                          />
                          <button
                            onClick={() => handleSavePhoneInline(cust.name)}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1"
                          >
                            <span>সেভ</span>
                            <span>💾</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAID OFF CUSTOMERS (EXCLUDED BY DESIGN) */}
          {activeTab === 'paid' && (
            <div>
              <div className="mb-4">
                <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  পরিশোধ সম্পন্ন কাস্টমার (স্বয়ংক্রিয়ভাবে বাদ)
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-black">
                    {paidCustomers.length} জন
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  আপনার নিয়ম অনুযায়ী: যারা সব টাকা পরিশোধ করে দিয়েছেন বা যাদের কোনো বাকি নেই, তাদের কাছে তাগাদা মেসেজ যাবে না।
                </p>
              </div>

              {paidCustomers.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-6">
                  <p className="text-xs text-slate-400 font-bold">
                    কোনো পরিশোধিত কাস্টমার নেই
                  </p>
                </div>
              ) : (
                <div className="space-y-2 opacity-80">
                  {paidCustomers.map((cust) => (
                    <div 
                      key={cust.name}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm">{cust.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          {cust.phone ? `ফোন: ${cust.phone}` : 'নম্বর নেই'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                          পরিশোধিত (€ {cust.balance})
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">মেসেজ পাঠানো হবে না 🚫</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-bold text-center sm:text-left">
            <span>💡 নিয়ম: শুধু বাকিদের মেসেজ যাবে • নম্বর না থাকলে যাবে না • পরিশোধিতরা বাদ</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 rounded-2xl font-black text-xs transition-all"
            >
              বন্ধ করুন
            </button>
            {activeTab !== 'ready' && readyCustomers.length > 0 && (
              <button
                onClick={() => setActiveTab('ready')}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-black text-xs transition-all shadow-md"
              >
                মেসেজ তালিকায় যান ({readyCustomers.length}) 💬
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
