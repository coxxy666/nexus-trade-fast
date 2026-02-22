import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function SwapPathOptimizer({ route, fromChain, toChain, isCrossChain }) {
  if (!route || !isCrossChain) return null;

  const steps = route.split(' → ');

  return (
    <div className="glass-card rounded-2xl p-4 border border-purple-500/30 bg-purple-500/5 mt-4">
      <p className="text-xs text-gray-400 mb-3">Recommended Swap Path</p>
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-sm font-semibold text-purple-400 whitespace-nowrap">{fromChain}</span>
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-xs bg-purple-500/20 px-2 py-1 rounded whitespace-nowrap text-purple-300">
              {step}
            </span>
          </React.Fragment>
        ))}
        <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-purple-400 whitespace-nowrap">{toChain}</span>
      </div>
    </div>
  );
}
