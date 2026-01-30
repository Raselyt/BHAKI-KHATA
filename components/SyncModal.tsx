
import React, { useRef, useState } from 'react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
  onImportData: (data: any) => void;
}

type ModalView = 'main' | 'export' | 'import';

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onImportData
}) => {
  const [view, setView] = useState<ModalView>('main');
  const [importText, setImportText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const exportCode = () => {
    try {
      const dataStr = JSON.stringify(transactions);
      return btoa(unescape(encodeURIComponent(dataStr)));
    } catch (e) {
      return "কোড তৈরি করা সম্ভব হয়নি।";
    }
  };

  const handleCopy = () => {
    const code = exportCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {
      alert("অটোমেটিক কপি কাজ করছে না, নিচের বক্স থেকে ম্যানুয়ালি কপি করুন।");
    });
  };

  const handleImport = async () => {
    const text = importText.trim();
    if (!text) return;
    
    setIsProcessing(true);
    try {
      // Decode with support for UTF-8
      const decoded = decodeURIComponent(escape(atob(text)));
      const data = JSON.parse(decoded);
      await onImportData(data);
      setImportText('');
    } catch (e) {
      console.error("Decode Error:", e);
      alert("ভুল কোড! কোডটি কি সম্পূর্ণ কপি করেছেন? আবার চেষ্টা করুন।");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDownload = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baki_khata_backup_${new Date().toLocaleDateString('bn-BD').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        await onImportData(data);
      } catch (err) {
        alert("ফাইলটি সঠিক নয় বা এর ভেতরে লেনদেনের ডাটা নেই।");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 flex flex-col items-center text-center">
          
          {isProcessing ? (
            <div className="py-20 flex flex-col items-center">
               <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="font-black text-slate-600">ডাটা প্রসেস হচ্ছে...</p>
            </div>
          ) : view === 'main' ? (
            <>
              <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">ডাটা সিঙ্কিং</h2>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">অন্য ডিভাইসে আপনার সব হিসাব ট্রান্সফার করার জন্য নিচের অপশনগুলো ব্যবহার করুন।</p>

              <div className="w-full space-y-3 mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">অপশন ১: কোড ব্যবহার করুন</p>
                <button onClick={() => setView('export')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">
                  কোড কপি করুন (Export)
                </button>
                <button onClick={() => setView('import')} className="w-full bg-indigo-50 text-indigo-700 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">
                  কোড পেস্ট করুন (Import)
                </button>
              </div>

              <div className="w-full space-y-3 mb-4">
                <div className="h-px bg-slate-100 w-full mb-6"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">অপশন ২: ফাইল ব্যাকআপ</p>
                <button onClick={handleFileDownload} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                  ফাইল ডাউনলোড করুন
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-50 text-emerald-700 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">
                  ফাইল আপলোড করুন
                </button>
              </div>
            </>
          ) : view === 'export' ? (
            <div className="w-full">
              <h3 className="text-xl font-black text-slate-800 mb-4">আপনার ব্যাকআপ কোড</h3>
              <textarea 
                readOnly 
                value={exportCode()}
                className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-mono focus:outline-none"
              />
              <button onClick={handleCopy} className={`w-full py-4 rounded-2xl font-black text-sm mt-4 mb-3 transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white'}`}>
                {copySuccess ? 'কপি হয়েছে!' : 'কোড কপি করুন'}
              </button>
              <button onClick={() => setView('main')} className="text-slate-400 font-bold text-xs uppercase tracking-widest">পিছনে যান</button>
            </div>
          ) : (
            <div className="w-full">
              <h3 className="text-xl font-black text-slate-800 mb-4">কোড পেস্ট করুন</h3>
              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="পুরনো অ্যাপের ব্যাকআপ কোডটি এখানে পেস্ট করুন..."
                className="w-full h-40 p-4 bg-slate-50 border-2 border-indigo-100 rounded-2xl text-[10px] font-mono mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button onClick={handleImport} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm mb-3 active:scale-95 transition-all">
                ডাটা ইম্পোর্ট করুন
              </button>
              <button onClick={() => setView('main')} className="text-slate-400 font-bold text-xs uppercase tracking-widest">পিছনে যান</button>
            </div>
          )}

          {!isProcessing && view === 'main' && (
            <button onClick={onClose} className="mt-4 text-slate-400 font-bold text-sm uppercase tracking-widest">বন্ধ করুন</button>
          )}
        </div>
      </div>
    </div>
  );
};
