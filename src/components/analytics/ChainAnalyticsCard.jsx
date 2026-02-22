import React from 'react';
import { Activity } from 'lucide-react';

const CHAIN_COLORS = {
  ethereum: 'bg-blue-500/10 border-blue-500/30',
  bsc: 'bg-yellow-500/10 border-yellow-500/30',
  polygon: 'bg-purple-500/10 border-purple-500/30',
  solana: 'bg-green-500/10 border-green-500/30',
  avalanche: 'bg-red-500/10 border-red-500/30',
  arbitrum: 'bg-cyan-500/10 border-cyan-500/30',
  optimism: 'bg-red-500/10 border-red-500/30',
};

const CHAIN_NAMES = {
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
  polygon: 'Polygon',
  solana: 'Solana',
  avalanche: 'Avalanche',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  unknown: 'Unknown',
};

export default function ChainAnalyticsCard({ stat }) {
  const colorClass = CHAIN_COLORS[stat.chain] || CHAIN_COLORS.ethereum;
  const displayName = CHAIN_NAMES[stat.chain] || CHAIN_NAMES.unknown;

  return (
    <div className={`glass-card rounded-2xl p-6 border ${colorClass} transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{displayName}</h3>
        <Activity className="w-5 h-5 opacity-50" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Total Swaps</span>
          <span className="font-semibold">{stat.count}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Volume</span>
          <span className="font-semibold">{stat.volume.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-gray-400 text-sm">Success Rate</span>
          <span className="font-semibold text-green-400">{stat.successRate}%</span>
        </div>
      </div>
    </div>
  );
}
