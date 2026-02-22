import React, { useState } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, ExternalLink, Copy, Check, X } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { toast } from 'sonner';
import { listLocalTransactions, deleteLocalTransaction } from '@/lib/localTransactions';

export default function RecentTransactions() {
  const [copiedHash, setCopiedHash] = useState(null);

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['recentSwaps'],
    queryFn: async () => {
      const localTx = listLocalTransactions(50);
      let baseTx = [];
      try {
        baseTx = await appClient.entities.Transaction.filter({ type: 'swap' }, '-created_date', 50);
      } catch {
        baseTx = [];
      }
      const merged = [...localTx, ...baseTx];
      const deduped = new Map();
      for (const tx of merged) {
        const key = tx.tx_hash || tx.id;
        if (!deduped.has(key)) deduped.set(key, tx);
      }
      return Array.from(deduped.values())
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 12);
    },
    enabled: true,
    refetchInterval: 10000,
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getExplorerUrl = (txHash, chain = 'solana') => {
    if (chain === 'bsc') return `https://bscscan.com/tx/${txHash}`;
    if (chain === 'ethereum') return `https://etherscan.io/tx/${txHash}`;
    return `https://solscan.io/tx/${txHash}`;
  };

  const copyToClipboard = (text, hash) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(hash);
    toast.success('Hash copied!');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const deleteTransaction = async (txId) => {
    try {
      deleteLocalTransaction(txId);
      await appClient.entities.Transaction.delete(txId);
      toast.success('Transaction removed');
      refetch();
    } catch (error) {
      if (String(txId || '').startsWith('local_tx_')) {
        toast.success('Transaction removed');
        refetch();
        return;
      }
      toast.error('Failed to remove transaction');
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/5 mt-8">
        <h3 className="text-lg font-semibold mb-4">Recent Swaps</h3>
        <div className="text-gray-400 text-sm">Loading transaction history...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/5 mt-8">
        <h3 className="text-lg font-semibold mb-4">Recent Swaps</h3>
        <div className="text-gray-400 text-sm">No swap transactions yet</div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 mt-8">
      <h3 className="text-lg font-semibold mb-4">Recent Swaps</h3>
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-semibold text-cyan-400">{tx.token_from}</span>
                  <ArrowRightLeft className="w-3 h-3 text-gray-500" />
                  <span className="font-semibold text-cyan-400">{tx.token_to}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap">
                {formatDistance(new Date(tx.created_date), new Date(), { addSuffix: true })}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(tx.status)}`}>
                {tx.status}
              </span>

              {tx.tx_hash && (
                <>
                   <button
                    onClick={() => copyToClipboard(tx.tx_hash, tx.id)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Copy hash"
                  >
                    {copiedHash === tx.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                   <a
                    href={getExplorerUrl(tx.tx_hash, tx.chain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="View on Solscan"
                  >
                    <ExternalLink className="w-4 h-4 text-cyan-400 hover:text-cyan-300" />
                  </a>
                </>
              )}

              <button
                onClick={() => deleteTransaction(tx.id)}
                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                title="Remove from history"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

