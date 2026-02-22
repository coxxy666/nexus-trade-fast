import React from 'react';
import { CheckCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VerifiedBadge({ verified = false, score, size = 'md', showScore = false, className }) {
  if (!verified && !showScore) return null;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  if (!verified) {
    return showScore ? (
      <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-500/10 border border-gray-500/30", className)}>
        <Shield className={cn(sizeClasses[size], "text-gray-400")} />
        <span className={cn(textSizes[size], "text-gray-400 font-medium")}>
          Unverified
        </span>
      </div>
    ) : null;
  }
  
  return (
    <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30", className)}>
      <CheckCircle className={cn(sizeClasses[size], "text-cyan-400")} />
      <span className={cn(textSizes[size], "text-cyan-400 font-medium")}>
        Verified
      </span>
      {showScore && score !== undefined && (
        <span className={cn(textSizes[size], "text-cyan-300 font-bold")}>
          {score}/100
        </span>
      )}
    </div>
  );
}
