import React from 'react';
import { Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RiskBadge({ level, score, size = 'md' }) {
  const config = {
    low: {
      icon: Shield,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      label: 'Low Risk'
    },
    medium: {
      icon: ShieldAlert,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      label: 'Medium Risk'
    },
    high: {
      icon: ShieldX,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      label: 'High Risk'
    }
  };

  const { icon: Icon, color, bg, border, label } = config[level] || config.medium;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2'
  };

  return (
    <div className={cn(
      "inline-flex items-center rounded-full border font-medium",
      bg, border, sizeClasses[size]
    )}>
      <Icon className={cn("w-4 h-4", color)} />
      <span className={color}>{label}</span>
      {score !== undefined && (
        <span className={cn("font-bold", color)}>({score}/100)</span>
      )}
    </div>
  );
}
