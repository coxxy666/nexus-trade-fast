import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_STEPS = {
  'pending': { label: 'Initiating', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'submitted': { label: 'Transaction Submitted', icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'bridging': { label: 'Bridging Assets', icon: Loader2, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'confirmed': { label: 'Bridge Confirmed', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  'completed': { label: 'Completed', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  'failed': { label: 'Failed', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' }
};

export default function CrossChainSwapStatus({ isOpen, onClose, swapData, txHash }) {
  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const statusSequence = ['pending', 'submitted', 'bridging', 'confirmed', 'completed'];
    let currentStep = 0;
    let timeElapsed = 0;

    const statusInterval = setInterval(() => {
      if (currentStep < statusSequence.length) {
        setStatus(statusSequence[currentStep]);
        setProgress((currentStep + 1) / statusSequence.length * 100);
        currentStep++;
      }
    }, 3000); // Change status every 3 seconds

    const timeInterval = setInterval(() => {
      timeElapsed++;
      setElapsedTime(timeElapsed);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(timeInterval);
    };
  }, [isOpen]);

  const currentStatusConfig = STATUS_STEPS[status];
  const StatusIcon = currentStatusConfig?.icon || Clock;
  const formattedTime = `${Math.floor(elapsedTime / 60)}:${String(elapsedTime % 60).padStart(2, '0')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Cross-Chain Swap Status</DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
              />
            </div>
            <p className="text-xs text-gray-400 text-center">{Math.round(progress)}% Complete</p>
          </div>

          {/* Current Status */}
          <motion.div
            key={status}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-4 rounded-xl ${currentStatusConfig.bg} border border-white/10`}
          >
            <div className="flex items-center gap-3">
              <motion.div animate={{ rotate: status === 'submitted' || status === 'bridging' ? 360 : 0 }} transition={{ duration: 2, repeat: Infinity }}>
                <StatusIcon className={`w-6 h-6 ${currentStatusConfig.color}`} />
              </motion.div>
              <div>
                <p className="font-semibold text-white">{currentStatusConfig.label}</p>
                <p className="text-xs text-gray-400 mt-1">Time elapsed: {formattedTime}</p>
              </div>
            </div>
          </motion.div>

          {/* Swap Details */}
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">From</span>
              <span className="text-white font-semibold">{swapData?.fromChain?.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">To</span>
              <span className="text-white font-semibold">{swapData?.toChain?.toUpperCase()}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex items-center justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <span className="text-white font-semibold">{swapData?.amount} {swapData?.fromToken?.symbol}</span>
            </div>
          </div>

          {/* Transaction Hash */}
          {txHash && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">Transaction Hash</p>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs font-mono text-gray-300 break-all">{txHash?.slice(0, 20)}...{txHash?.slice(-10)}</p>
            </div>
          )}

          {/* Status Timeline */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-semibold">Steps</p>
            <div className="space-y-2">
              {Object.entries(STATUS_STEPS).slice(0, 5).map(([stepStatus, config], idx) => {
                const isCompleted = ['pending', 'submitted', 'bridging', 'confirmed', 'completed'].indexOf(stepStatus) <= ['pending', 'submitted', 'bridging', 'confirmed', 'completed'].indexOf(status);
                const StepIcon = config.icon;
                return (
                  <div key={stepStatus} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500/20 border-green-500/50' : 'bg-white/10 border-white/20'} border`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <span className={`text-xs ${isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-white/10 mt-4"
            disabled={status !== 'completed' && status !== 'failed'}
          >
            {status === 'completed' ? 'Close' : 'Background Monitor'}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
