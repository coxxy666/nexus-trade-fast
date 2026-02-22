import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SwapCard from '@/components/swap/SwapCard';
import RecentTransactions from '@/components/swap/RecentTransactions';
import { Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { estimateGasFee, calculateSlippage } from '@/components/services/LivePriceService';

export default function Swap() {
  const [swapData, setSwapData] = useState({ volume: 0, liquidity: 0, network: 'ethereum' });

  // Fetch live gas estimate
  const { data: gasEstimate = '2.50' } = useQuery({
    queryKey: ['gasEstimate', swapData.network],
    queryFn: () => estimateGasFee(swapData.network),
    refetchInterval: 60000,
  });

  const slippage = calculateSlippage(swapData.volume, swapData.liquidity);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">Best rates guaranteed</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Swap MemeTokens <span className="gradient-text">Instantly</span>
          </h1>
          <p className="text-gray-400 max-w-md mx-auto">
            Trade any meme token listed on CoinMarketCap or CoinGecko with the best rates aggregated from multiple DEXs
          </p>
        </motion.div>

        {/* Swap Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <SwapCard onSwapDataChange={setSwapData} />
          <RecentTransactions />
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-3xl mx-auto"
        >
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-gray-500 text-sm">Slippage</p>
            <p className="text-white font-semibold mt-1">{slippage.toFixed(2)}%</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-gray-500 text-sm">Gas Estimate</p>
            <p className="text-white font-semibold mt-1">~${gasEstimate}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-gray-500 text-sm">Route</p>
            <p className="text-white font-semibold mt-1">Direct</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
