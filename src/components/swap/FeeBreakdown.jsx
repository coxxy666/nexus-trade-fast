import React from 'react';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeeBreakdown({ 
  fromAmount, 
  toAmount, 
  networkFee = 0, 
  priceImpact = 0, 
  fromToken, 
  toToken,
  selectedNetwork 
}) {
  const swapFeePercent = 0.5; // Typical 0.5% swap fee
  const swapFee = (parseFloat(fromAmount || 0) * (swapFeePercent / 100));
  const totalFeeUSD = networkFee + (swapFee * (fromToken?.price_usd || 1));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">Fee Breakdown</h3>
        <Info className="w-4 h-4 text-gray-500" />
      </div>

      <div className="space-y-2 text-sm">
        {/* Swap Fee */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Swap Fee ({swapFeePercent}%)</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{swapFee.toFixed(6)} {fromToken?.symbol}</span>
            <span className="text-gray-500 text-xs">${(swapFee * (fromToken?.price_usd || 1)).toFixed(2)}</span>
          </div>
        </div>

        {/* Network Fee */}
        {networkFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Network Fee ({selectedNetwork})</span>
            <span className="text-white font-medium">${networkFee.toFixed(2)}</span>
          </div>
        )}

        {/* Price Impact */}
        {priceImpact > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Price Impact</span>
            <span className={priceImpact > 5 ? 'text-red-400' : priceImpact > 1 ? 'text-yellow-400' : 'text-green-400'}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-white/10 my-2" />

        {/* Total Fee & Output */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-gray-300 font-medium">Total Fee</span>
          <span className="text-white font-semibold">${totalFeeUSD.toFixed(2)}</span>
        </div>

        {/* Final Output */}
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg p-2 mt-2">
          <span className="text-green-300 font-medium">You receive (approx)</span>
          <div className="text-right">
            <div className="text-white font-semibold">{parseFloat(toAmount || 0).toFixed(6)} {toToken?.symbol}</div>
            <div className="text-gray-400 text-xs">${(parseFloat(toAmount || 0) * (toToken?.price_usd || 1)).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
