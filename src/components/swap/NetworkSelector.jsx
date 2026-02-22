import React from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/components/WalletContext';
import { cn } from '@/lib/utils';

export default function NetworkSelector() {
  const { selectedNetwork, switchNetwork, networks } = useWallet();

  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(networks).map(([key, network]) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => switchNetwork(key)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            selectedNetwork === key
              ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-black"
              : "bg-white/10 text-gray-300 hover:bg-white/20"
          )}
        >
          <span>{network.icon}</span>
          <span className="hidden sm:inline">{network.name.split(' ')[0]}</span>
        </motion.button>
      ))}
    </div>
  );
}
