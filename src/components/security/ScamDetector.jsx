import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { cn } from '@/lib/utils';

export default function ScamDetector() {
  const [contractAddress, setContractAddress] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);

  const scanContract = async () => {
    if (!contractAddress) return;
    
    setIsScanning(true);
    setResult(null);

    try {
      const response = await appClient.integrations.Core.InvokeLLM({
        prompt: `Analyze this crypto contract address for potential scam indicators: ${contractAddress}
        
        Evaluate:
        1. Contract code legitimacy patterns
        2. Ownership and liquidity lock status
        3. Honeypot or rug pull indicators
        4. Token distribution fairness
        5. Historical transaction patterns
        
        Provide a risk score (0-100) and specific findings.`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_score: { type: "number" },
            risk_level: { type: "string", enum: ["safe", "low", "medium", "high", "critical"] },
            findings: {
              type: "array",
              items: { type: "string" }
            },
            recommendation: { type: "string" }
          }
        }
      });

      setResult(response);
    } catch (error) {
      setResult({
        risk_level: 'error',
        findings: ['Unable to analyze contract. Please verify the address.']
      });
    }

    setIsScanning(false);
  };

  const getRiskColor = (level) => {
    const colors = {
      safe: 'text-green-400 border-green-400 bg-green-400/10',
      low: 'text-blue-400 border-blue-400 bg-blue-400/10',
      medium: 'text-yellow-400 border-yellow-400 bg-yellow-400/10',
      high: 'text-orange-400 border-orange-400 bg-orange-400/10',
      critical: 'text-red-400 border-red-400 bg-red-400/10',
      error: 'text-gray-400 border-gray-400 bg-gray-400/10'
    };
    return colors[level] || colors.medium;
  };

  const getRiskIcon = (level) => {
    if (level === 'safe') return CheckCircle;
    if (level === 'critical' || level === 'high') return XCircle;
    return AlertTriangle;
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Scam Detection 🎯</h3>
          <p className="text-gray-400 text-sm">AI-powered contract analysis</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter contract address (0x...)"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="bg-white/5 border-white/10 rounded-xl"
            disabled={isScanning}
          />
          <Button
            onClick={scanContract}
            disabled={isScanning || !contractAddress}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl whitespace-nowrap"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning
              </>
            ) : (
              'Scan Contract'
            )}
          </Button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl p-6 border-2",
              getRiskColor(result.risk_level)
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              {React.createElement(getRiskIcon(result.risk_level), {
                className: "w-8 h-8"
              })}
              <div>
                <h4 className="font-bold text-lg capitalize">
                  {result.risk_level} Risk
                </h4>
                {result.risk_score !== undefined && (
                  <p className="text-sm opacity-80">Risk Score: {result.risk_score}/100</p>
                )}
              </div>
            </div>

            {result.findings && result.findings.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="font-semibold text-sm">Findings:</p>
                <ul className="space-y-1">
                  {result.findings.map((finding, i) => (
                    <li key={i} className="text-sm opacity-90 flex items-start gap-2">
                      <span>•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendation && (
              <div className="pt-4 border-t border-current/20">
                <p className="font-semibold text-sm mb-1">Recommendation:</p>
                <p className="text-sm opacity-90">{result.recommendation}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
