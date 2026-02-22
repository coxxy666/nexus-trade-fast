import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, DollarSign, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CrossChainSwapDetails({ estimate, fromChain, toChain, isLoading }) {
  if (!estimate) return null;

  const feePercentage = parseFloat(estimate.fees?.percentage || 0);
  const priceImpact = parseFloat(estimate.priceImpact || 0);
  const totalCost = feePercentage + priceImpact;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/10 space-y-3"
    >
      {/* Route Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Zap className="w-4 h-4" />
          <span>Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-semibold">{fromChain.toUpperCase()}</span>
          <ArrowRight className="w-3 h-3 text-cyan-400" />
          <span className="text-white text-xs font-semibold">{toChain.toUpperCase()}</span>
        </div>
      </div>

      {/* Bridge Provider */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Bridge Provider</span>
        <span className="text-white font-semibold text-xs">{estimate.bridgeProvider}</span>
      </div>

      {/* Estimated Time */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Estimated Time</span>
        </div>
        <span className="text-white font-semibold">{estimate.estimatedTime?.display}</span>
      </div>

      {/* Fees Breakdown */}
      <div className="p-3 rounded-lg bg-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Bridge Fee</span>
          <span className="text-white">
            ${estimate.fees?.bridge?.toFixed(4) || '0.0000'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Gas Fee</span>
          <span className="text-white">
            ${estimate.fees?.gas?.toFixed(4) || '0.0000'}
          </span>
        </div>
        <div className="border-t border-white/10 pt-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <DollarSign className="w-4 h-4" />
            <span>Total Cost</span>
          </div>
          <span className="text-white font-semibold">
            ${estimate.fees?.total?.toFixed(4) || '0.0000'} ({estimate.fees?.percentage}%)
          </span>
        </div>
      </div>

      {/* Price Impact Warning */}
      {totalCost > 5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30"
        >
          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-400">
            High cost ({totalCost.toFixed(2)}%) - consider larger amount or different route
          </p>
        </motion.div>
      )}

      {/* Slippage Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Max Slippage</span>
        <span className={cn(
          "font-semibold",
          estimate.slippage > 5 ? "text-red-400" : estimate.slippage > 2 ? "text-yellow-400" : "text-green-400"
        )}>
          {estimate.slippage?.toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
}
