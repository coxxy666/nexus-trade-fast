import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MemeScoreBadge({ score, size = 'md' }) {
  if (!score) return null;

  const getScoreColor = () => {
    if (score >= 80) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
    if (score >= 60) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
    if (score >= 40) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    return 'bg-gray-500/20 text-gray-400';
  };

  const getScoreLabel = () => {
    if (score >= 80) return '🔥 HOT';
    if (score >= 60) return '⭐ STRONG';
    if (score >= 40) return '💎 DECENT';
    return '😴 WEAK';
  };

  return (
    <Badge 
      className={cn(
        "flex items-center gap-1 font-semibold",
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
        getScoreColor()
      )}
    >
      <Sparkles className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      {getScoreLabel()} {score}
    </Badge>
  );
}
