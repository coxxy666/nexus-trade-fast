import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, change, icon: Icon, delay = 0 }) {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card rounded-2xl p-6 hover:border-white/20 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl md:text-3xl font-bold mt-2 gradient-text">{value}</p>
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
            <Icon className="w-6 h-6 text-cyan-400" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-4 text-sm font-medium",
          isPositive ? "text-green-400" : "text-red-400"
        )}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
          <span className="text-gray-500 ml-1">24h</span>
        </div>
      )}
    </motion.div>
  );
}
