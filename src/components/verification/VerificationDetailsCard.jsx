import React from 'react';
import { Lock, FileCheck, Users, Award, ExternalLink } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function VerificationDetailsCard({ verification }) {
  if (!verification) return null;
  
  const { liquidity_lock, contract_audit, community_metrics, verification_score } = verification;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 border border-white/10 space-y-6"
    >
      {/* Overall Score */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Verification Score</span>
          <span className={cn(
            "font-bold text-lg",
            verification_score >= 70 ? "text-green-400" :
            verification_score >= 50 ? "text-yellow-400" : "text-red-400"
          )}>
            {verification_score}/100
          </span>
        </div>
        <Progress value={verification_score} className="h-2" />
      </div>
      
      {/* Liquidity Lock */}
      <div className="p-4 rounded-xl bg-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className={cn(
            "w-5 h-5",
            liquidity_lock?.is_locked ? "text-green-400" : "text-red-400"
          )} />
          <h3 className="font-semibold">Liquidity Lock</h3>
        </div>
        {liquidity_lock?.is_locked ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Duration</span>
              <span className="font-medium text-green-400">
                {liquidity_lock.duration_days} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount Locked</span>
              <span className="font-medium text-green-400">
                {liquidity_lock.lock_percentage}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-400">No liquidity lock detected</p>
        )}
      </div>
      
      {/* Contract Audit */}
      <div className="p-4 rounded-xl bg-white/5">
        <div className="flex items-center gap-2 mb-3">
          <FileCheck className={cn(
            "w-5 h-5",
            contract_audit?.is_audited ? "text-green-400" : "text-yellow-400"
          )} />
          <h3 className="font-semibold">Contract Audit</h3>
        </div>
        {contract_audit?.is_audited ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Auditor</span>
              <span className="font-medium text-green-400">
                {contract_audit.auditor}
              </span>
            </div>
            {contract_audit.audit_date && (
              <div className="flex justify-between">
                <span className="text-gray-400">Audit Date</span>
                <span className="font-medium">
                  {new Date(contract_audit.audit_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {contract_audit.audit_report_url && (
              <a
                href={contract_audit.audit_report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View Report <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-yellow-400">Contract not audited</p>
        )}
      </div>
      
      {/* Community Metrics */}
      <div className="p-4 rounded-xl bg-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold">Community Engagement</h3>
        </div>
        {community_metrics && (
          <div className="space-y-2 text-sm">
            {community_metrics.holder_count > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Holders</span>
                <span className="font-medium">
                  {community_metrics.holder_count.toLocaleString()}
                </span>
              </div>
            )}
            {community_metrics.telegram_members > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Telegram</span>
                <span className="font-medium">
                  {community_metrics.telegram_members.toLocaleString()}
                </span>
              </div>
            )}
            {community_metrics.twitter_followers > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Twitter</span>
                <span className="font-medium">
                  {community_metrics.twitter_followers.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Chain Info */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
        <span className="text-sm text-gray-400">Blockchain</span>
        <span className="font-bold text-cyan-400">{verification.chain}</span>
      </div>
    </motion.div>
  );
}
