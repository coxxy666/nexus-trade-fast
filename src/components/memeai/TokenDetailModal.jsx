import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Shield, 
  Activity, Sparkles, ExternalLink, Loader2, X,
  ThumbsUp, ThumbsDown, DollarSign, Droplets, Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeMemeToken, getTokenSentiment, detectRugPullRisks, calculateMemeScore } from './MemeTokenAnalyzer';
import RiskScoreRadarChart from './RiskScoreRadarChart';

export default function TokenDetailModal({ token, isOpen, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      analyzeToken();
    }
  }, [isOpen, token]);

  const analyzeToken = async () => {
    setLoading(true);
    try {
      const [aiAnalysis, sentimentData] = await Promise.all([
        analyzeMemeToken(token),
        getTokenSentiment(token.symbol, token.name)
      ]);

      const rugPullData = detectRugPullRisks(token, aiAnalysis);
      const memeScore = calculateMemeScore(token, sentimentData);

      setAnalysis({
        ...aiAnalysis,
        ...rugPullData,
        memeScore
      });
      setSentiment(sentimentData);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'high': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment?.includes('positive')) return 'text-green-400';
    if (sentiment?.includes('negative')) return 'text-red-400';
    return 'text-gray-400';
  };

  const handleTradeClick = () => {
    try {
      sessionStorage.setItem('nexus_swap_target_token', JSON.stringify({
        symbol: token?.symbol || '',
        name: token?.name || '',
        logo: token?.logo_url || token?.logo || '',
        logo_url: token?.logo_url || token?.logo || '',
        address: token?.address || '',
        price_usd: Number(token?.price_usd || 0),
        network: token?.network || '',
      }));
    } catch {
      // ignore storage failures
    }
    window.location.href = '/Swap';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img src={token.logo_url} alt={token.symbol} className="w-12 h-12 rounded-full" />
              <div className="min-w-0">
                <DialogTitle className="text-2xl font-bold break-words leading-tight">{token.name}</DialogTitle>
                <p className="text-gray-400 break-all">{token.symbol}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
            <p className="text-gray-400">Analyzing token with AI...</p>
          </div>
        ) : analysis ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mt-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Price</p>
                <p className="text-xl font-bold">${token.price_usd?.toFixed(8)}</p>
                <p className={cn("text-sm flex items-center gap-1", 
                  token.price_change_24h >= 0 ? "text-green-400" : "text-red-400")}>
                  {token.price_change_24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(token.price_change_24h).toFixed(2)}%
                </p>
              </div>

              <div className="glass-card p-4 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Market Cap</p>
                <p className="text-xl font-bold">${(token.market_cap / 1e6).toFixed(2)}M</p>
              </div>

              <div className="glass-card p-4 rounded-xl">
                <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                  <Droplets className="w-4 h-4" /> Liquidity
                </p>
                <p className="text-xl font-bold">${(token.liquidity / 1e3).toFixed(0)}K</p>
              </div>

              <div className="glass-card p-4 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">24h Volume</p>
                <p className="text-xl font-bold">${(token.volume_24h / 1e3).toFixed(0)}K</p>
              </div>
            </div>

            {/* Confidence Score */}
            {analysis.confidence_score !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-gray-300">AI Analysis Confidence</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-400">{Math.round(analysis.confidence_score)}%</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {analysis.confidence_score >= 80 ? 'Very High' : analysis.confidence_score >= 60 ? 'High' : analysis.confidence_score >= 40 ? 'Moderate' : 'Low'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Risk Assessment */}
            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Risk Assessment
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Overall Risk</span>
                    <Badge className={cn("px-3 py-1", getRiskColor(analysis.risk_level))}>
                      {analysis.risk_level?.toUpperCase()}
                    </Badge>
                  </div>
                  <Progress value={analysis.risk_score} className="h-2 mb-4" />

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Rug Pull Risk</span>
                    <span className="text-white font-semibold">{analysis.rugPullScore}%</span>
                  </div>
                  <Progress value={analysis.rugPullScore} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      Meme Score
                    </span>
                    <span className="text-white font-semibold">{analysis.memeScore}/100</span>
                  </div>
                  <Progress value={analysis.memeScore} className="h-2 mb-4" />

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Sentiment</span>
                    <span className={cn("font-semibold", getSentimentColor(analysis.sentiment))}>
                      {analysis.sentiment?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Breakdown Radar Chart */}
            {analysis.risk_breakdown && (
              <div className="glass-card p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-6">Risk Score Breakdown</h3>
                <div className="mb-6">
                  <RiskScoreRadarChart riskBreakdown={analysis.risk_breakdown} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                  {Object.entries(analysis.risk_breakdown).map(([key, value]) => (
                    <div key={key} className="glass-card p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400 capitalize mb-1">{key.replace('_', ' ')}</p>
                      <p className="text-sm font-bold text-cyan-400">{Math.round(100 - value)}/100</p>
                      <p className="text-xs text-gray-500">safety</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tokenomics Analysis */}
            {analysis.tokenomics && (
              <div className="glass-card p-6 rounded-xl border border-purple-500/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Tokenomics Analysis
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Distribution Score</p>
                    <p className="text-xl font-bold">{analysis.tokenomics.distribution_score}/100</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Burn Mechanism</p>
                    <Badge className={cn("mt-1", analysis.tokenomics.has_burn_mechanism ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400")}>
                      {analysis.tokenomics.has_burn_mechanism ? "Active" : "None"}
                    </Badge>
                  </div>
                  {analysis.tokenomics.transaction_tax && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Transaction Tax</p>
                      <p className="text-white">{analysis.tokenomics.transaction_tax}</p>
                    </div>
                  )}
                  {analysis.tokenomics.holder_concentration && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Holder Concentration</p>
                      <p className="text-white">{analysis.tokenomics.holder_concentration}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pump & Dump Detection */}
            {analysis.pump_dump_score !== undefined && (
              <div className="glass-card p-6 rounded-xl border border-orange-500/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Pump & Dump Detection
                </h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Likelihood Score</span>
                    <span className="text-xl font-bold text-orange-400">{analysis.pump_dump_score}/100</span>
                  </div>
                  <Progress value={analysis.pump_dump_score} className="h-2" />
                </div>
                {analysis.pump_dump_indicators?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Detected Indicators:</p>
                    <ul className="space-y-1">
                      {analysis.pump_dump_indicators.map((indicator, idx) => (
                        <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-orange-400">⚠</span>
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Moonshot Prediction */}
            {analysis.moonshot_potential && (
              <div className="glass-card p-6 rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    Moonshot Potential (SPECULATIVE)
                  </h3>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {analysis.moonshot_potential.confidence?.toUpperCase()} CONFIDENCE
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Potential Score</span>
                    <span className="text-2xl font-bold text-yellow-400">{analysis.moonshot_potential.score}/100</span>
                  </div>
                  <Progress value={analysis.moonshot_potential.score} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">AI Reasoning:</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{analysis.moonshot_potential.reasoning}</p>
                  </div>
                  
                  {analysis.moonshot_potential.speculative_price_target && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Speculative Price Target:</p>
                      <p className="text-xl font-bold text-yellow-400">{analysis.moonshot_potential.speculative_price_target}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="text-xs text-orange-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warning: This is highly speculative AI prediction. DYOR and invest responsibly.
                  </p>
                </div>
              </div>
            )}

            {/* AI Analysis Summary */}
            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-3">AI Analysis</h3>
              <p className="text-gray-300 leading-relaxed">{analysis.analysis_summary}</p>
            </div>

            {/* Detailed Analysis */}
            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-3">Detailed Outlook</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">{analysis.detailed_analysis}</p>
            </div>

            {/* Risks & Strengths */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.risks?.length > 0 && (
                <div className="glass-card p-6 rounded-xl border-red-500/20">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    Key Risks
                  </h3>
                  <ul className="space-y-2">
                    {analysis.risks.map((risk, idx) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <ThumbsDown className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.strengths?.length > 0 && (
                <div className="glass-card p-6 rounded-xl border-green-500/20">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-400">
                    <ThumbsUp className="w-5 h-5" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Social Sentiment */}
            {sentiment && (
              <div className="glass-card p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Social Sentiment & Buzz
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Sentiment Score</p>
                    <p className="text-2xl font-bold">{sentiment.sentiment_score}/100</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Buzz Level</p>
                    <Badge className="text-purple-400 bg-purple-500/10">
                      {sentiment.buzz_level?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {sentiment.news_highlights?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-2">Recent Highlights:</p>
                    <ul className="space-y-2">
                      {sentiment.news_highlights.map((highlight, idx) => (
                        <li key={idx} className="text-gray-300 text-sm break-words">• {highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sentiment.news_quotes?.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-gray-400 text-sm mb-3 font-semibold">Direct Quotes from News & Social Media</p>
                    <div className="space-y-3">
                      {sentiment.news_quotes.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={cn(
                            "p-3 rounded-lg border-l-4 bg-white/5",
                            item.sentiment_type?.includes('positive') ? 'border-green-500/50 bg-green-500/5' : 
                            item.sentiment_type?.includes('negative') ? 'border-red-500/50 bg-red-500/5' : 
                            'border-gray-500/50 bg-gray-500/5'
                          )}
                        >
                          <p className="text-sm text-gray-300 italic mb-2 break-words leading-relaxed">"{item.quote}"</p>
                          <p className="text-xs text-gray-500 break-all">— {item.source || 'Social Media'}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
             <div className="flex gap-3">
               <Button
                 onClick={handleTradeClick}
                 className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
               >
                 <DollarSign className="w-4 h-4 mr-2" />
                 Trade {token.symbol}
               </Button>
              <Button
                variant="outline"
                className="border-white/20 bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            Failed to load analysis. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
