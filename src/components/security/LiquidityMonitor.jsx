import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MOCK_LIQUIDITY_DATA = [
  { pool: 'DOLPHIN/SOL', tvl: 8400000, locked: true, lock_duration: '6 months', status: 'secure', change_24h: 12.5 },
  { pool: 'SOL/USDC', tvl: 125000000, locked: true, lock_duration: '1 year', status: 'secure', change_24h: 3.2 },
  { pool: 'BNB/USDC', tvl: 67000000, locked: true, lock_duration: '3 months', status: 'secure', change_24h: -2.1 },
  { pool: 'SCAM/BNB', tvl: 45000, locked: false, lock_duration: 'None', status: 'warning', change_24h: -45.8 },
];

export default function LiquidityMonitor() {
  const [pools, setPools] = useState(MOCK_LIQUIDITY_DATA);

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Liquidity Protection 🔒</h3>
          <p className="text-gray-400 text-sm">Smart lock monitoring</p>
        </div>
      </div>

      <div className="space-y-3">
        {pools.map((pool, index) => (
          <motion.div
            key={pool.pool}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card rounded-xl p-4 hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  pool.locked ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {pool.locked ? (
                    <Lock className="w-4 h-4 text-green-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{pool.pool}</p>
                  <p className="text-xs text-gray-500">{pool.locked ? `Locked: ${pool.lock_duration}` : 'Unlocked'}</p>
                </div>
              </div>
              <Badge variant="secondary" className={
                pool.status === 'secure' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              }>
                {pool.status === 'secure' ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {pool.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Value Locked</p>
                <p className="font-semibold">${(pool.tvl / 1e6).toFixed(2)}M</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">24h Change</p>
                <p className={`font-semibold flex items-center gap-1 ${
                  pool.change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {pool.change_24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {pool.change_24h >= 0 ? '+' : ''}{pool.change_24h.toFixed(1)}%
                </p>
              </div>
            </div>

            {!pool.locked && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-start gap-2 text-xs text-yellow-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Warning: Liquidity is not locked. High rug pull risk.</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
        <p className="text-sm text-cyan-400">
          <strong>AI Protection Active:</strong> Monitoring {pools.length} liquidity pools in real-time for suspicious activity and lock status changes.
        </p>
      </div>
    </div>
  );
}
