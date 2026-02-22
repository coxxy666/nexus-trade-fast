import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, FileCheck, TrendingUp, Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import RiskBadge from './RiskBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenAnalysis } from './RiskAnalysisService';
import { cn } from '@/lib/utils';

export default function RiskAnalysisCard({ token, tokenData }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const result = await getTokenAnalysis(token.symbol, tokenData);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnalysis();
    }
  }, [token?.symbol]);

  if (!token) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl p-6 border border-white/10"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src={token.logo} alt={token.symbol} className="w-10 h-10 rounded-full" />
          <div>
            <h3 className="text-xl font-bold">{token.symbol} Risk Analysis</h3>
            <p className="text-sm text-gray-400">Powered by MemeAI</p>
          </div>
        </div>
        <Button
          onClick={fetchAnalysis}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
            <p className="text-gray-400">Analyzing token security...</p>
          </motion.div>
        ) : analysis ? (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Risk Level */}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Overall Risk</span>
              <RiskBadge level={analysis.risk_level} score={analysis.risk_score} />
            </div>

            {/* Rug Pull Probability */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Rug Pull Probability
                </span>
                <span className={cn(
                  "font-bold",
                  analysis.rug_pull_probability < 30 ? "text-green-400" :
                  analysis.rug_pull_probability < 60 ? "text-yellow-400" : "text-red-400"
                )}>
                  {analysis.rug_pull_probability.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={analysis.rug_pull_probability} 
                className="h-2"
              />
            </div>

            {/* Liquidity Lock Status */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <Lock className={cn(
                  "w-5 h-5",
                  analysis.liquidity_locked ? "text-green-400" : "text-red-400"
                )} />
                <span className="font-medium">Liquidity Lock</span>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-bold",
                  analysis.liquidity_locked ? "text-green-400" : "text-red-400"
                )}>
                  {analysis.liquidity_locked ? "Locked" : "Unlocked"}
                </p>
                {analysis.liquidity_locked && analysis.liquidity_lock_days > 0 && (
                  <p className="text-xs text-gray-400">
                    {analysis.liquidity_lock_days} days remaining
                  </p>
                )}
              </div>
            </div>

            {/* Contract Verification */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <FileCheck className={cn(
                  "w-5 h-5",
                  analysis.contract_verified ? "text-green-400" : "text-yellow-400"
                )} />
                <span className="font-medium">Contract Verified</span>
              </div>
              <span className={cn(
                "font-bold",
                analysis.contract_verified ? "text-green-400" : "text-yellow-400"
              )}>
                {analysis.contract_verified ? "Yes" : "No"}
              </span>
            </div>

            {/* Holder Distribution */}
            {analysis.holder_distribution && (
              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium">Holder Distribution</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Top 10 Holders</span>
                    <span className="font-medium">{analysis.holder_distribution.top_10_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Whale Count</span>
                    <span className="font-medium">{analysis.holder_distribution.whale_count}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Vulnerabilities */}
            {analysis.vulnerabilities && analysis.vulnerabilities.length > 0 && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Detected Vulnerabilities
                </h4>
                <ul className="space-y-2">
                  {analysis.vulnerabilities.map((vuln, idx) => (
                    <li key={idx} className="text-sm text-red-300 flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {vuln}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analysis Details */}
            {analysis.analysis_details && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <h4 className="font-semibold mb-2">Detailed Analysis</h4>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                  {analysis.analysis_details}
                </p>
              </div>
            )}

            {/* Last Updated */}
            <p className="text-xs text-gray-500 text-center">
              Last updated: {new Date(analysis.last_updated).toLocaleString()}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <p className="text-gray-400">No analysis available</p>
            <Button onClick={fetchAnalysis} className="mt-4">
              Analyze Token
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
