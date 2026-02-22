import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, TrendingUp, Users, Clock, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatNumber(num) {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatAge(timestamp) {
  if (!timestamp) return 'Unknown';
  const now = Date.now();
  const age = now - timestamp;
  const hours = Math.floor(age / (1000 * 60 * 60));
  const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
}

export default function TokenRiskCard({ token, riskAnalysis }) {
  const riskColors = {
    low: 'bg-green-500/10 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const riskLevel = riskAnalysis?.riskLevel || 'medium';
  const riskScore = riskAnalysis?.riskScore || 50;

  return (
    <Card className="glass-card border-white/10 p-6 hover:border-cyan-500/30 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={token.info?.imageUrl || 'https://via.placeholder.com/40'} 
            alt={token.baseToken?.symbol}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">{token.baseToken?.symbol || 'Unknown'}</h3>
              {riskAnalysis?.contractVerified && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400">{token.baseToken?.name || 'Unknown Token'}</p>
          </div>
        </div>
        
        {/* Risk Score Badge */}
        <div className={cn(
          "px-3 py-1.5 rounded-lg border flex items-center gap-2",
          riskColors[riskLevel]
        )}>
          {riskLevel === 'critical' || riskLevel === 'high' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          <span className="font-bold">{riskScore}/100</span>
        </div>
      </div>

      {/* Risk Flags */}
      {riskAnalysis?.flags && riskAnalysis.flags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {riskAnalysis.flags.map((flag, index) => (
              <Badge key={index} variant="outline" className="text-xs border-red-500/30 text-red-400">
                ⚠️ {flag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <BarChart3 className="w-3 h-3" />
            Liquidity
          </div>
          <p className="font-semibold text-white">
            {formatNumber(riskAnalysis?.liquidity || 0)}
          </p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            24h Volume
          </div>
          <p className="font-semibold text-white">
            {formatNumber(riskAnalysis?.volume24h || 0)}
          </p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Users className="w-3 h-3" />
            Transactions
          </div>
          <p className="font-semibold text-white">
            {riskAnalysis?.txCount || 0}
          </p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Clock className="w-3 h-3" />
            Age
          </div>
          <p className="font-semibold text-white">
            {formatAge(token.pairCreatedAt)}
          </p>
        </div>
      </div>

      {/* Price Info */}
      <div className="bg-white/5 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Current Price</span>
          <span className="font-mono text-white">{token.priceUsd ? `$${parseFloat(token.priceUsd).toFixed(8)}` : 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-400 text-sm">24h Change</span>
          <span className={cn(
            "font-semibold",
            (riskAnalysis?.priceChange24h || 0) >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {(riskAnalysis?.priceChange24h || 0) >= 0 ? '+' : ''}{(riskAnalysis?.priceChange24h || 0).toFixed(2)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
