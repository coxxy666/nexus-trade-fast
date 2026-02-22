import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { Progress } from '@/components/ui/progress';

export default function RiskAnalyzer() {
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeToken = async () => {
    if (!tokenSymbol) return;

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await appClient.integrations.Core.InvokeLLM({
        prompt: `Perform comprehensive risk analysis for cryptocurrency token: ${tokenSymbol}
        
        Analyze:
        1. Market volatility and price stability
        2. Liquidity depth and trading volume
        3. Team transparency and project legitimacy
        4. Community sentiment and social metrics
        5. Technical indicators and chart patterns
        
        Provide detailed risk metrics and investment safety score.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            safety_score: { type: "number" },
            volatility_risk: { type: "number" },
            liquidity_risk: { type: "number" },
            legitimacy_score: { type: "number" },
            overall_rating: { type: "string" },
            key_risks: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } },
            advice: { type: "string" }
          }
        }
      });

      setAnalysis(response);
    } catch (error) {
      setAnalysis({
        overall_rating: 'Unable to analyze',
        key_risks: ['Analysis failed. Please try again with a valid token symbol.']
      });
    }

    setIsAnalyzing(false);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Real-Time Risk Analysis 🛡️</h3>
          <p className="text-gray-400 text-sm">Live market intelligence</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter token symbol (e.g., ETH, BTC)"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
            className="bg-white/5 border-white/10 rounded-xl"
            disabled={isAnalyzing}
          />
          <Button
            onClick={analyzeToken}
            disabled={isAnalyzing || !tokenSymbol}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 rounded-xl whitespace-nowrap"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing
              </>
            ) : (
              'Analyze Risk'
            )}
          </Button>
        </div>

        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Overall Rating */}
            <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
              <p className="text-sm text-gray-400 mb-2">Overall Rating</p>
              <p className="text-2xl font-bold gradient-text">{analysis.overall_rating}</p>
            </div>

            {/* Metrics */}
            {analysis.safety_score !== undefined && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Safety Score</span>
                    <span className="font-semibold">{analysis.safety_score}/100</span>
                  </div>
                  <Progress value={analysis.safety_score} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Legitimacy Score</span>
                    <span className="font-semibold">{analysis.legitimacy_score}/100</span>
                  </div>
                  <Progress value={analysis.legitimacy_score} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Volatility Risk</span>
                    <span className="font-semibold text-yellow-400">{analysis.volatility_risk}/100</span>
                  </div>
                  <Progress value={analysis.volatility_risk} className="h-2 bg-yellow-500/20" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Liquidity Risk</span>
                    <span className="font-semibold text-orange-400">{analysis.liquidity_risk}/100</span>
                  </div>
                  <Progress value={analysis.liquidity_risk} className="h-2 bg-orange-500/20" />
                </div>
              </div>
            )}

            {/* Key Risks */}
            {analysis.key_risks && analysis.key_risks.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <h4 className="font-semibold text-red-400">Key Risks</h4>
                </div>
                <ul className="space-y-1">
                  {analysis.key_risks.map((risk, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <h4 className="font-semibold text-green-400">Strengths</h4>
                </div>
                <ul className="space-y-1">
                  {analysis.strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span>✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advice */}
            {analysis.advice && (
              <div className="glass-card rounded-xl p-4 border border-cyan-500/30">
                <p className="text-sm font-semibold text-cyan-400 mb-2">Investment Advice</p>
                <p className="text-sm text-gray-300">{analysis.advice}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
