import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function SwapMetricsCard({ label, value, subtext, highlight }) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-2">{label}</p>
          <p className={`text-3xl font-bold ${highlight ? 'text-green-400' : 'text-cyan-400'}`}>
            {value}
          </p>
          {subtext && <p className="text-gray-500 text-sm mt-2">{subtext}</p>}
        </div>
        <TrendingUp className={`w-5 h-5 ${highlight ? 'text-green-400' : 'text-cyan-400'} opacity-50`} />
      </div>
    </div>
  );
}
