import React, { useState, useMemo } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowRightLeft, ExternalLink, ChevronDown, Copy, Check } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { toast } from 'sonner';
import { listLocalTransactions } from '@/lib/localTransactions';

export default function SwapHistory() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedTx, setExpandedTx] = useState(null);

  // Fetch all swap transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['swapHistory'],
    queryFn: async () => {
      const localTx = listLocalTransactions(200);
      let baseTx = [];
      try {
        baseTx = await appClient.entities.Transaction.filter({ type: 'swap' }, '-created_date', 200);
      } catch {
        baseTx = [];
      }
      const merged = [...localTx, ...baseTx];
      const deduped = new Map();
      for (const tx of merged) {
        const key = tx.tx_hash || tx.id;
        if (!deduped.has(key)) deduped.set(key, tx);
      }
      return Array.from(deduped.values()).sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );
    },
    refetchInterval: 30000,
  });

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      const matchesSearch =
        tx.token_from.toLowerCase().includes(search.toLowerCase()) ||
        tx.token_to.toLowerCase().includes(search.toLowerCase()) ||
        tx.tx_hash?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' || tx.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort
    if (sortBy === 'date-desc') {
      return filtered.sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );
    } else if (sortBy === 'date-asc') {
      return filtered.sort(
        (a, b) => new Date(a.created_date) - new Date(b.created_date)
      );
    } else if (sortBy === 'amount-desc') {
      return filtered.sort((a, b) => (b.amount_from || 0) - (a.amount_from || 0));
    } else if (sortBy === 'amount-asc') {
      return filtered.sort((a, b) => (a.amount_from || 0) - (b.amount_from || 0));
    }

    return filtered;
  }, [transactions, search, sortBy, filterStatus]);

  const [copiedHash, setCopiedHash] = useState(null);

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

  const calculateExchangeRate = (tx) => {
    if (!tx.amount_from || !tx.amount_to || tx.amount_from === 0) return 0;
    return (tx.amount_to / tx.amount_from).toFixed(6);
  };

  const getExplorerUrl = (txHash, chain = 'solana') => {
    const explorers = {
      solana: `https://solscan.io/tx/${txHash}`,
      ethereum: `https://etherscan.io/tx/${txHash}`,
      bsc: `https://bscscan.com/tx/${txHash}`,
      polygon: `https://polygonscan.com/tx/${txHash}`,
    };
    return explorers[chain] || explorers.solana;
  };

  const copyToClipboard = (text, hash) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(hash);
    toast.success('Hash copied!');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Swap History</h1>
          <p className="text-gray-400">View all your past swap transactions</p>
        </div>

        {/* Filters & Search */}
        <div className="glass-card rounded-xl p-6 mb-6 border border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search token, hash..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 rounded-lg h-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/5 border-white/10 rounded-lg h-10">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent className="bg-[#12121a] border-white/10 text-white">
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 rounded-lg h-10">
                <SelectValue placeholder="Filter status..." />
              </SelectTrigger>
              <SelectContent className="bg-[#12121a] border-white/10 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              Loading swap history...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No swap transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/5 bg-white/2">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 w-12">
                      -
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                      Swap Pair
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                      You Paid / Received
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                      Exchange Rate
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransactions.map((tx) => (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}>
                        <td className="px-6 py-4">
                          <button className="p-1 hover:bg-white/10 rounded transition-colors">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedTx === tx.id ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{tx.token_from}</span>
                            <ArrowRightLeft className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold text-sm">{tx.token_to}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-300">
                              {tx.amount_from?.toFixed(6)} {tx.token_from}
                            </div>
                            <div className="text-xs text-gray-500">
                              ↓ {tx.amount_to?.toFixed(6)} {tx.token_to}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-cyan-400 font-medium">
                            1 {tx.token_from} = {calculateExchangeRate(tx)} {tx.token_to}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-300">
                              {format(new Date(tx.created_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(tx.created_date), 'HH:mm:ss')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                              tx.status
                            )}`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                      {expandedTx === tx.id && (
                        <tr className="bg-white/2 border-t-2 border-white/5">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Transaction Hash</p>
                                  {tx.tx_hash ? (
                                    <div className="flex items-center gap-2">
                                      <code className="text-cyan-400 text-xs font-mono bg-white/5 px-2 py-1 rounded flex-1 break-all">
                                        {tx.tx_hash}
                                      </code>
                                      <button
                                        onClick={() => copyToClipboard(tx.tx_hash, tx.id)}
                                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                        title="Copy hash"
                                      >
                                        {copiedHash === tx.id ? (
                                          <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                          <Copy className="w-4 h-4 text-gray-400" />
                                        )}
                                      </button>
                                      <a
                                        href={getExplorerUrl(tx.tx_hash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                        title="View on explorer"
                                      >
                                        <ExternalLink className="w-4 h-4 text-cyan-400 hover:text-cyan-300" />
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Time Since</p>
                                  <p className="text-sm text-gray-300">
                                    {formatDistance(new Date(tx.created_date), new Date(), { addSuffix: true })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Amount From</p>
                                  <p className="text-sm text-gray-300 font-mono">{tx.amount_from?.toFixed(8) || '-'} {tx.token_from}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Amount To</p>
                                  <p className="text-sm text-gray-300 font-mono">{tx.amount_to?.toFixed(8) || '-'} {tx.token_to}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Info */}
          {filteredTransactions.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5 text-sm text-gray-400">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

