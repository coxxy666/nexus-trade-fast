import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, FileCheck } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { cn } from '@/lib/utils';

export default function ProjectVerifier() {
  const [projectUrl, setProjectUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState(null);

  const verifyProject = async () => {
    if (!projectUrl) return;

    setIsVerifying(true);
    setVerification(null);

    try {
      const response = await appClient.integrations.Core.InvokeLLM({
        prompt: `Verify the legitimacy of this crypto project/presale: ${projectUrl}
        
        Check for:
        1. Team transparency (LinkedIn profiles, public identities)
        2. Smart contract audit status
        3. Whitepaper quality and technical feasibility
        4. Community presence and engagement
        5. Red flags (anonymous teams, unrealistic promises, etc.)
        6. KYC/Audit badges from reputable firms
        
        Provide verification status and detailed assessment.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            is_legitimate: { type: "boolean" },
            verification_status: { type: "string", enum: ["verified", "unverified", "suspicious"] },
            trust_score: { type: "number" },
            checks: {
              type: "object",
              properties: {
                team_verified: { type: "boolean" },
                contract_audited: { type: "boolean" },
                kyc_completed: { type: "boolean" },
                whitepaper_exists: { type: "boolean" },
                community_active: { type: "boolean" }
              }
            },
            warnings: { type: "array", items: { type: "string" } },
            positives: { type: "array", items: { type: "string" } },
            verdict: { type: "string" }
          }
        }
      });

      setVerification(response);
    } catch (error) {
      setVerification({
        verification_status: 'error',
        warnings: ['Unable to verify project. Please check the URL and try again.']
      });
    }

    setIsVerifying(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      verified: 'bg-green-500/20 text-green-400 border-green-500/30',
      unverified: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      suspicious: 'bg-red-500/20 text-red-400 border-red-500/30',
      error: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[status] || colors.unverified;
  };

  const getStatusIcon = (status) => {
    if (status === 'verified') return CheckCircle2;
    if (status === 'suspicious' || status === 'error') return XCircle;
    return AlertTriangle;
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Project Verification ✅</h3>
          <p className="text-gray-400 text-sm">Verify presales and new projects</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter project website URL"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            className="bg-white/5 border-white/10 rounded-xl"
            disabled={isVerifying}
          />
          <Button
            onClick={verifyProject}
            disabled={isVerifying || !projectUrl}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl whitespace-nowrap"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying
              </>
            ) : (
              'Verify Project'
            )}
          </Button>
        </div>

        {verification && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Status Badge */}
            <div className={cn(
              "rounded-xl p-6 border-2 flex items-center gap-4",
              getStatusColor(verification.verification_status)
            )}>
              {React.createElement(getStatusIcon(verification.verification_status), {
                className: "w-10 h-10 flex-shrink-0"
              })}
              <div className="flex-1">
                <h4 className="font-bold text-xl capitalize mb-1">
                  {verification.verification_status}
                </h4>
                {verification.trust_score !== undefined && (
                  <p className="text-sm opacity-80">Trust Score: {verification.trust_score}/100</p>
                )}
              </div>
            </div>

            {/* Verification Checks */}
            {verification.checks && (
              <div className="glass-card rounded-xl p-4">
                <h4 className="font-semibold mb-3">Verification Checks</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    {verification.checks.team_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">Team Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {verification.checks.contract_audited ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">Contract Audited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {verification.checks.kyc_completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">KYC Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {verification.checks.whitepaper_exists ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">Whitepaper Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {verification.checks.community_active ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">Active Community</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {verification.warnings && verification.warnings.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-red-400 mb-2">⚠️ Warnings</h4>
                <ul className="space-y-1">
                  {verification.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-gray-300">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Positives */}
            {verification.positives && verification.positives.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-green-400 mb-2">✓ Positive Indicators</h4>
                <ul className="space-y-1">
                  {verification.positives.map((positive, i) => (
                    <li key={i} className="text-sm text-gray-300">• {positive}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verdict */}
            {verification.verdict && (
              <div className="glass-card rounded-xl p-4 border border-cyan-500/30">
                <h4 className="font-semibold text-cyan-400 mb-2">Final Verdict</h4>
                <p className="text-sm text-gray-300">{verification.verdict}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
