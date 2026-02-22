import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const NETWORKS = {
  bsc: { id: '0x38', chainId: 56, name: 'BNB Smart Chain', icon: 'BSC', rpc: 'https://bsc-dataseed.binance.org/' },
  solana: { id: 'solana', chainId: null, name: 'Solana', icon: 'SOL', rpc: null },
  ethereum: { id: '0x1', chainId: 1, name: 'Ethereum', icon: 'ETH', rpc: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' }
};

export default function CrossChainNetworkSelector({ selectedNetwork, onNetworkChange }) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 font-semibold">Receive on</label>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(NETWORKS).map(([key, network]) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNetworkChange(key)}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all duration-200',
              selectedNetwork === key
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            )}
          >
            <span className="text-xs font-semibold">{network.icon}</span>
            <span className="hidden sm:inline">{network.name.split(' ')[0]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
