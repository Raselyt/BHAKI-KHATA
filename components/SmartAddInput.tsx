
import React, { useState } from 'react';
import { parseTransactionPrompt } from '../services/geminiService';
import { TransactionType } from '../types';

interface SmartAddInputProps {
  onParsed: (data: { name: string; amount: number; type: TransactionType }) => void;
}

export const SmartAddInput: React.FC<SmartAddInputProps> = ({ onParsed }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSmartAdd = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await parseTransactionPrompt(input);
      if (result && result.name && result.amount) {
        onParsed({
          name: result.name,
          amount: result.amount,
          type: result.type as TransactionType
        });
        setInput('');
      } else {
        alert("দুঃখিত, আমি বুঝতে পারিনি। দয়া করে স্পষ্ট করে লিখুন (যেমন: রহিম ২০০ টাকা বাকি)");
      }
    } catch (error) {
      alert("AI লোড হতে সমস্যা হচ্ছে। সাধারণ উপায়ে যোগ করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-emerald-50 p-4 rounded-xl mb-6 border border-emerald-100 shadow-inner">
      <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
        ম্যাজিক ইনপুট (বলেও লিখতে পারেন)
      </p>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="যেমন: রহিম ৫০০ টাকা বিকাশ বাকি..."
          className="flex-1 p-2 rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          onKeyPress={(e) => e.key === 'Enter' && handleSmartAdd()}
        />
        <button 
          onClick={handleSmartAdd}
          disabled={loading}
          className={`bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'}`}
        >
          {loading ? '...' : 'যোগ করুন'}
        </button>
      </div>
    </div>
  );
};
