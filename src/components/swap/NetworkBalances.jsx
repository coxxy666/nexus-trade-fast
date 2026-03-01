import React from 'react';
import { useWallet } from '@/components/WalletContext';
import { motion } from 'framer-motion';
import { Wallet, Loader2 } from 'lucide-react';

const NATIVE_COINS = {
  'ethereum': { symbol: 'ETH', name: 'Ethereum' },
  'bsc': { symbol: 'BNB', name: 'BNB' },
  'polygon': { symbol: 'MATIC', name: 'Polygon' },
  'solana': { symbol: 'SOL', name: 'Solana' }
};

export default function NetworkBalances() {
  const { selectedNetwork, accountBalances, isConnected, account } = useWallet();
  const nativeCoin = NATIVE_COINS[selectedNetwork];

  if (!isConnected || !account) {
    return null;
  }

  const getNativeBalance = () => {
    const direct = accountBalances?.[nativeCoin.symbol];
    if (direct !== undefined && direct !== null) return Number(direct);
    const matchedKey = Object.keys(accountBalances || {}).find(
      (key) => String(key || '').toUpperCase() === String(nativeCoin.symbol || '').toUpperCase()
    );
    if (!matchedKey) return 0;
    return Number(accountBalances?.[matchedKey] || 0);
  };

  const balance = getNativeBalance();
  const topLevelCount = Object.entries(accountBalances || {}).filter(([key, value]) => {
    if (key === 'tokenByAddress') return false;
    return Number(value) > 0;
  }).length;
  const byAddressCount = Object.values(accountBalances?.tokenByAddress || {}).filter((value) => Number(value) > 0).length;
  const holdingsCount = byAddressCount > 0 ? byAddressCount + (balance > 0 ? 1 : 0) : topLevelCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-gray-400">Native Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">
            {Number.isFinite(balance) ? balance.toFixed(6) : '0.000000'} {nativeCoin.symbol}
          </span>
          {balance === 0 && (
            <span className="text-xs text-yellow-400 ml-1">Low balance</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <p>{isConnected ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</p>
        <p>Tokens held: {holdingsCount}</p>
      </div>
    </motion.div>
  );
}

