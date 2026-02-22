import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import VerifiedBadge from '@/components/verification/VerifiedBadge';

export default function TokenRow({ token, index, verification, onTokenClick }) {
  const isPositive = (token.change_24h || token.price_change_24h) >= 0;
  const change = token.change_24h || token.price_change_24h || 0;
  const volume = token.volume_24h || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => onTokenClick && onTokenClick(token)}
      className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 hover:border hover:border-cyan-500/30 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <span className="text-gray-500 w-6 text-sm">{index + 1}</span>
        <img 
          src={token.logo_url} 
          alt={token.symbol} 
          className="w-10 h-10 rounded-full"
        />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold group-hover:text-cyan-400 transition-colors">
              {token.name}
            </p>
            {verification?.is_verified && (
              <VerifiedBadge verified={true} size="sm" />
            )}
            <Sparkles className="w-3 h-3 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-gray-500 text-sm">{token.symbol}</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="text-right hidden sm:block">
          <p className="font-semibold">${token.price_usd?.toFixed(8)}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1 w-24 justify-end",
          isPositive ? "text-green-400" : "text-red-400"
        )}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="font-medium">
            {isPositive ? '+' : ''}{change?.toFixed(2)}%
          </span>
        </div>
        <div className="text-right hidden md:block w-32">
          <p className="text-gray-400">
            ${volume >= 1e9 ? (volume / 1e9).toFixed(2) + 'B' : 
              volume >= 1e6 ? (volume / 1e6).toFixed(2) + 'M' :
              volume >= 1e3 ? (volume / 1e3).toFixed(2) + 'K' :
              volume.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
