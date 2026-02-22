import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles } from 'lucide-react';
import ScamDetector from '@/components/security/ScamDetector';
import RiskAnalyzer from '@/components/security/RiskAnalyzer';
import ProjectVerifier from '@/components/security/ProjectVerifier';
import LiquidityMonitor from '@/components/security/LiquidityMonitor';

export default function Security() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10 mb-6">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-300">AI-Powered Protection</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            AI Protection <span className="gradient-text">Ecosystem</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            🐬 Advanced AI echolocation technology to detect scams, analyze risks, verify projects, and secure liquidity
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              '🎯 Scam Detection',
              '🛡️ Risk Analysis',
              '✅ Project Verification',
              '🔒 Liquidity Protection'
            ].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="px-4 py-2 rounded-xl glass-card text-sm"
              >
                {feature}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ScamDetector />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <RiskAnalyzer />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ProjectVerifier />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <LiquidityMonitor />
          </motion.div>
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 glass-card rounded-2xl p-8 text-center border-2 border-cyan-500/30 glow-cyan"
        >
          <Sparkles className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-3">Protected by Dolphin AI</h3>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Our advanced AI continuously monitors the blockchain ecosystem, protecting investors from scams, analyzing market risks in real-time, verifying project legitimacy, and ensuring liquidity security across all pools.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
