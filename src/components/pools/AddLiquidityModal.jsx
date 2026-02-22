import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Info, ArrowDownUp, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TOKEN_LOGOS = {
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  DOLPHIN: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=100&h=100&fit=crop',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  ARB: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
};

export default function AddLiquidityModal({ isOpen, onClose, pool }) {
  const [step, setStep] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [amounts, setAmounts] = useState({
    token_a: '',
    token_b: ''
  });

  const handleAmountAChange = (value) => {
    setAmounts({ token_a: value, token_b: value ? (parseFloat(value) * 1.5).toFixed(6) : '' });
  };

  const handleAmountBChange = (value) => {
    setAmounts({ token_b: value, token_a: value ? (parseFloat(value) / 1.5).toFixed(6) : '' });
  };

  const handleAddLiquidity = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAdding(false);
    setStep(2);
  };

  const handleClose = () => {
    setStep(1);
    setAmounts({ token_a: '', token_b: '' });
    onClose();
  };

  const estimatedLP = amounts.token_a && amounts.token_b 
    ? (parseFloat(amounts.token_a) + parseFloat(amounts.token_b)) * 0.45 
    : 0;

  const shareOfPool = amounts.token_a && pool 
    ? ((parseFloat(amounts.token_a) * 2000) / pool.tvl * 100).toFixed(4)
    : 0;

  if (!pool) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Liquidity</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 mt-4"
          >
            {/* Pool Info */}
            <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src={TOKEN_LOGOS[pool.token_a]} alt={pool.token_a} className="w-8 h-8 rounded-full" />
                  <span className="font-bold text-lg">{pool.token_a}</span>
                  <Plus className="w-4 h-4 text-gray-500" />
                  <img src={TOKEN_LOGOS[pool.token_b]} alt={pool.token_b} className="w-8 h-8 rounded-full" />
                  <span className="font-bold text-lg">{pool.token_b}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">APR</p>
                  <p className="text-lg font-bold text-green-400">{pool.apr.toFixed(1)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">TVL</p>
                  <p className="font-semibold">${(pool.tvl / 1e6).toFixed(2)}M</p>
                </div>
                <div>
                  <p className="text-gray-400">Fee Tier</p>
                  <p className="font-semibold">{pool.fee_tier}%</p>
                </div>
              </div>
            </div>

            {/* Input Amounts */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Deposit {pool.token_a}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amounts.token_a}
                    onChange={(e) => handleAmountAChange(e.target.value)}
                    className="bg-white/5 border-white/10 h-14 pr-24 text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={TOKEN_LOGOS[pool.token_a]} alt={pool.token_a} className="w-6 h-6 rounded-full" />
                    <span className="font-semibold">{pool.token_a}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Balance: 100.00 {pool.token_a}</p>
              </div>

              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-cyan-400" />
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Deposit {pool.token_b}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amounts.token_b}
                    onChange={(e) => handleAmountBChange(e.target.value)}
                    className="bg-white/5 border-white/10 h-14 pr-24 text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={TOKEN_LOGOS[pool.token_b]} alt={pool.token_b} className="w-6 h-6 rounded-full" />
                    <span className="font-semibold">{pool.token_b}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Balance: 5000.00 {pool.token_b}</p>
              </div>
            </div>

            {/* Estimates */}
            {amounts.token_a && amounts.token_b && (
              <div className="glass-card rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">LP Tokens</span>
                  <span className="font-semibold">{estimatedLP.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Share of Pool</span>
                  <span className="font-semibold">{shareOfPool}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rate</span>
                  <span className="font-semibold">1 {pool.token_a} = 1.5 {pool.token_b}</span>
                </div>
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300">
                  <p className="font-semibold text-blue-400 mb-1">Balanced Deposits</p>
                  <p>Amounts are automatically balanced to match the pool ratio. You'll earn fees proportional to your share.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-white/20">
                Cancel
              </Button>
              <Button
                onClick={handleAddLiquidity}
                disabled={!amounts.token_a || !amounts.token_b || isAdding}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                {isAdding ? 'Adding Liquidity...' : 'Add Liquidity'}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Liquidity Added!</h3>
            <p className="text-gray-400 mb-6">
              Your tokens have been deposited to the {pool.token_a}/{pool.token_b} pool
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Deposited {pool.token_a}</span>
                <span className="font-semibold">{amounts.token_a}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposited {pool.token_b}</span>
                <span className="font-semibold">{amounts.token_b}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-gray-400">LP Tokens Received</span>
                <span className="font-semibold text-cyan-400">{estimatedLP.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Pool Share</span>
                <span className="font-semibold">{shareOfPool}%</span>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600">
              Done
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
