import React, { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/apiUrl';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function TransactionMonitor({ txHash, chain, onStatusChange }) {
  const [status, setStatus] = useState('pending');
  const [confirmations, setConfirmations] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!txHash || !chain) return;

    const checkStatus = async () => {
      setIsChecking(true);
      try {
        const response = await fetch(apiUrl('/api/monitor'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain,
            txHash
          })
        });
        const data = await response.json();

        if (data?.success) {
          setStatus(data.status);
          setConfirmations(data.confirmations || 0);
          onStatusChange?.(data.status);
        }
      } catch (error) {
        console.error('Failed to check transaction status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 3 seconds if pending
    const interval = setInterval(() => {
      checkStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [txHash, chain, onStatusChange]);

  const getExplorerUrl = () => {
    const explorers = {
      'solana': `https://solscan.io/tx/${txHash}`,
      'bsc': `https://bscscan.com/tx/${txHash}`,
      'ethereum': `https://etherscan.io/tx/${txHash}`
    };
    return explorers[chain];
  };

  const getStatusColor = () => {
    if (status === 'confirmed') return 'bg-green-500/10 border-green-500/30 text-green-400';
    if (status === 'failed') return 'bg-red-500/10 border-red-500/30 text-red-400';
    return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
  };

  const getStatusIcon = () => {
    if (status === 'confirmed') return <CheckCircle2 className="w-5 h-5" />;
    if (status === 'failed') return <AlertCircle className="w-5 h-5" />;
    return <Loader2 className="w-5 h-5 animate-spin" />;
  };

  const getStatusText = () => {
    if (status === 'confirmed') return 'Transaction Confirmed';
    if (status === 'failed') return 'Transaction Failed';
    return confirmations > 0 ? `Confirming (${confirmations} confirmations)` : 'Transaction Pending';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`mt-4 p-4 rounded-xl border ${getStatusColor()}`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-semibold">{getStatusText()}</span>
          </div>
          {status !== 'pending' && (
            <div className="text-xs opacity-75">{status.toUpperCase()}</div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs bg-white/5 rounded px-2 py-1">
          <code className="flex-1 font-mono truncate">{txHash}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(txHash);
              toast.success('Copied!');
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                status === 'confirmed'
                  ? 'bg-green-400'
                  : status === 'failed'
                  ? 'bg-red-400'
                  : 'bg-blue-400'
              }`}
              initial={{ width: '0%' }}
              animate={{
                width: status === 'confirmed' ? '100%' : status === 'failed' ? '100%' : '50%'
              }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <a
            href={getExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs transition-colors"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

