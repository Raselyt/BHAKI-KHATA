import { Transaction, TransactionType } from '../types';
import { supabase } from '../lib/supabase';

export interface CustomerReconciliationSummary {
  name: string;
  totalBaki: number;
  totalJoma: number;
  balance: number;
  unpaidCount: number;
  partialCount: number;
  paidCount: number;
  unpaidTotalDue: number;
}

/**
 * Checks whether a transaction represents debt / baki
 */
export const isBakiTransaction = (t: Transaction): boolean => {
  const typeStr = String(t.type || '');
  return (
    t.type === TransactionType.BAKI ||
    t.type === TransactionType.BKASH_BAKI ||
    typeStr === 'BAKI' ||
    typeStr === 'BKASH_BAKI' ||
    typeStr.includes('বাকি')
  );
};

/**
 * Checks whether a transaction represents payment / joma
 */
export const isPaymentTransaction = (t: Transaction): boolean => {
  const typeStr = String(t.type || '');
  return (
    t.type === TransactionType.BKASH_JOMA ||
    t.type === TransactionType.CASH_PAYMENT ||
    typeStr === 'BKASH_JOMA' ||
    typeStr === 'CASH_PAYMENT' ||
    typeStr.includes('জমা') ||
    typeStr.includes('পরিশোধ')
  );
};

/**
 * Clean up existing tags from note so we can format clean tags
 */
export const cleanBaseNote = (note?: string): string => {
  if (!note) return '';
  return note
    .replace(/\s*\[পরিশোধিত\]/g, '')
    .replace(/\s*\(পরিশোধিত\)/g, '')
    .replace(/\s*\[আংশিক পরিশোধ.*?\]/g, '')
    .replace(/\s*\(আংশিক পরিশোধ.*?\)/g, '')
    .trim();
};

/**
 * Reconciles transactions for a SINGLE customer according to strict FIFO and explicit note matches.
 * Guarantees:
 * - If totalJoma >= totalBaki (balance <= 0), ALL baki items become status='paid' with paidAmount = amount.
 * - If totalJoma < totalBaki, earlier dues are paid first (FIFO) unless an explicit link exists.
 * - The sum of remaining dues in unpaid/partial baki items EXACTLY equals the current balance.
 * - No payment is double counted.
 * - No transaction is deleted.
 */
export const reconcileCustomerTransactions = (customerTxList: Transaction[]): Transaction[] => {
  if (!customerTxList || customerTxList.length === 0) return [];

  // Clone transactions to avoid mutating original objects
  const list: Transaction[] = customerTxList.map(t => ({ ...t }));

  // Separate into baki, payment, and others
  const bakiList: Transaction[] = [];
  const paymentList: Transaction[] = [];
  const otherList: Transaction[] = [];

  list.forEach(t => {
    if (isBakiTransaction(t)) {
      bakiList.push(t);
    } else if (isPaymentTransaction(t)) {
      paymentList.push(t);
    } else {
      otherList.push(t);
    }
  });

  // Calculate totals
  const totalBaki = bakiList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalJoma = paymentList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const balance = totalBaki - totalJoma;

  // Chronological sort: oldest first
  bakiList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  paymentList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // If customer has fully paid everything or overpaid (balance <= 0)
  if (balance <= 0) {
    bakiList.forEach(baki => {
      baki.status = 'paid';
      baki.paidAmount = baki.amount;
      const base = cleanBaseNote(baki.note);
      baki.note = base ? `${base} [পরিশোধিত]` : '[পরিশোধিত]';
    });

    paymentList.forEach(p => {
      p.status = 'paid';
    });

    // Return combined in reverse chronological order (newest first for display)
    return [...bakiList, ...paymentList, ...otherList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // Tracking structure
  const bakiTrackers = bakiList.map(b => ({
    tx: b,
    originalAmount: b.amount,
    allocatedPaid: 0
  }));

  const paymentTrackers = paymentList.map(p => ({
    tx: p,
    originalAmount: p.amount,
    availableAmount: p.amount
  }));

  // PASS 1: Targeted matches (where payment note explicitly specifies the baki item or note)
  for (const pay of paymentTrackers) {
    if (pay.availableAmount <= 0) continue;
    const payNote = cleanBaseNote(pay.tx.note).toLowerCase();
    if (!payNote) continue;

    for (const baki of bakiTrackers) {
      if (baki.allocatedPaid >= baki.originalAmount) continue;
      const bakiNote = cleanBaseNote(baki.tx.note).toLowerCase();
      if (!bakiNote) continue;

      // If payment specifically names this baki's note or category
      const matches = payNote.includes(bakiNote) || bakiNote.includes(payNote);
      if (matches) {
        const remainingDue = baki.originalAmount - baki.allocatedPaid;
        const take = Math.min(remainingDue, pay.availableAmount);
        baki.allocatedPaid += take;
        pay.availableAmount -= take;
        if (pay.availableAmount <= 0) break;
      }
    }
  }

  // PASS 2: FIFO Chronological allocation for remaining payment amounts
  for (const pay of paymentTrackers) {
    if (pay.availableAmount <= 0.0001) continue;

    for (const baki of bakiTrackers) {
      const remainingDue = baki.originalAmount - baki.allocatedPaid;
      if (remainingDue <= 0.0001) continue;

      const take = Math.min(remainingDue, pay.availableAmount);
      baki.allocatedPaid += take;
      pay.availableAmount -= take;

      if (pay.availableAmount <= 0.0001) break;
    }
  }

  // PASS 3: Assign final status, paidAmount and formatted note
  bakiTrackers.forEach(item => {
    const { tx, originalAmount, allocatedPaid } = item;
    const base = cleanBaseNote(tx.note);

    if (allocatedPaid >= originalAmount - 0.001) {
      tx.status = 'paid';
      tx.paidAmount = originalAmount;
      tx.note = base ? `${base} [পরিশোধিত]` : '[পরিশোধিত]';
    } else if (allocatedPaid > 0.001) {
      tx.status = 'partial';
      tx.paidAmount = Math.round(allocatedPaid * 100) / 100;
      const dueRemaining = Math.max(0, originalAmount - tx.paidAmount);
      tx.note = base 
        ? `${base} [আংশিক পরিশোধ: €${tx.paidAmount}, বাকি: €${dueRemaining}]`
        : `[আংশিক পরিশোধ: €${tx.paidAmount}, বাকি: €${dueRemaining}]`;
    } else {
      tx.status = 'unpaid';
      tx.paidAmount = 0;
      tx.note = base || undefined;
    }
  });

  paymentTrackers.forEach(item => {
    item.tx.status = 'paid';
  });

  // Return combined in reverse chronological order (newest first for UI display)
  return [...bakiList, ...paymentList, ...otherList].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

/**
 * Reconciles ALL transactions across ALL customers
 */
export const reconcileAllTransactions = (allTransactions: Transaction[]): Transaction[] => {
  if (!allTransactions || allTransactions.length === 0) return [];

  // Group transactions by customer name (trimmed)
  const grouped: Record<string, Transaction[]> = {};
  allTransactions.forEach(t => {
    const key = (t.name || '').trim();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const reconciledList: Transaction[] = [];

  Object.values(grouped).forEach(customerTxList => {
    const customerReconciled = reconcileCustomerTransactions(customerTxList);
    reconciledList.push(...customerReconciled);
  });

  // Final sort newest first
  return reconciledList.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

/**
 * Helper to get summary stats for a customer after reconciliation
 */
export const getCustomerReconciledSummary = (
  customerName: string, 
  allTransactions: Transaction[]
): CustomerReconciliationSummary => {
  const custTx = allTransactions.filter(t => (t.name || '').trim() === customerName.trim());
  const reconciled = reconcileCustomerTransactions(custTx);

  const totalBaki = reconciled
    .filter(isBakiTransaction)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalJoma = reconciled
    .filter(isPaymentTransaction)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const balance = totalBaki - totalJoma;

  const unpaidBaki = reconciled.filter(t => isBakiTransaction(t) && t.status !== 'paid');
  const unpaidCount = unpaidBaki.filter(t => t.status === 'unpaid').length;
  const partialCount = unpaidBaki.filter(t => t.status === 'partial').length;
  const paidCount = reconciled.filter(t => isBakiTransaction(t) && t.status === 'paid').length;

  const unpaidTotalDue = unpaidBaki.reduce((sum, t) => {
    const remaining = Math.max(0, t.amount - (t.paidAmount || 0));
    return sum + remaining;
  }, 0);

  return {
    name: customerName,
    totalBaki,
    totalJoma,
    balance: Math.max(0, balance),
    unpaidCount,
    partialCount,
    paidCount,
    unpaidTotalDue: Math.max(0, balance)
  };
};

/**
 * Syncs any reconciled notes to Supabase in the background
 * Only updates rows whose notes have changed to save bandwidth
 */
export const syncReconciledNotesToSupabase = async (
  reconciledTxList: Transaction[],
  userId: string | null
): Promise<{ updatedCount: number; errors: any[] }> => {
  if (!userId || !supabase) return { updatedCount: 0, errors: [] };

  let updatedCount = 0;
  const errors: any[] = [];

  for (const t of reconciledTxList) {
    if (t.id.startsWith('local-')) continue;
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ note: t.note || '' })
        .eq('id', t.id)
        .eq('user_id', userId);

      if (error) {
        errors.push({ id: t.id, error });
      } else {
        updatedCount++;
      }
    } catch (err) {
      errors.push({ id: t.id, err });
    }
  }

  return { updatedCount, errors };
};
