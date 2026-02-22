import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Copy } from 'lucide-react';
import AddLiquidityModal from './AddLiquidityModal';
import { formatNumber } from '@/components/utils/formatNumber';
import { toast } from 'sonner';
import { useMemeTokens, DEFAULT_TOKENS } from '@/components/services/useMemeTokens';

const TOKEN_LOGOS = {
  DOLPHIN: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=100&h=100&fit=crop',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
};

export default function PoolCard({ pool, index }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: memeTokens = [] } = useMemeTokens();
  if (!pool) return null;

  const tokenA = String(pool.token_a || 'TOKENA');
  const tokenB = String(pool.token_b || 'TOKENB');
  const logoA = pool.token_a_logo || TOKEN_LOGOS[tokenA] || TOKEN_LOGOS.SOL;
  const logoB = pool.token_b_logo || TOKEN_LOGOS[tokenB] || TOKEN_LOGOS.USDC;
  const resolveAddressBySymbol = (symbol) => {
    const key = String(symbol || '').toUpperCase();
    const fromLive = memeTokens.find(
      (t) => String(t?.symbol || '').toUpperCase() === key && String(t?.address || '').trim().length > 0
    )?.address;
    if (fromLive) return String(fromLive);
    const fromDefault = DEFAULT_TOKENS.find((t) => String(t?.symbol || '').toUpperCase() === key)?.address;
    return String(fromDefault || '');
  };
  const tokenAAddress = String(pool.token_a_address || resolveAddressBySymbol(tokenA) || '');
  const tokenBAddress = String(pool.token_b_address || resolveAddressBySymbol(tokenB) || '');

  return (
    <>
    <AddLiquidityModal
      isOpen={showAddModal}
      onClose={() => setShowAddModal(false)}
      pool={pool}
    />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300 group"
    >
      {/* Token Pair */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={logoA} alt={tokenA} className="w-10 h-10 rounded-full" />
            <img 
              src={logoB} 
              alt={tokenB} 
              className="w-10 h-10 rounded-full absolute -right-3 top-0 border-2 border-[#0a0a0f]" 
            />
          </div>
          <div className="ml-2">
            <h3 className="font-bold text-lg text-white">
              {tokenA}/{tokenB}
            </h3>
            <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
              {Number(pool.fee_tier || 0)}% fee
            </span>
            <div className="mt-2 space-y-1 rounded-xl bg-white/10 p-2 border border-white/10">
              <div className="text-xs text-gray-400 font-medium">Contract Addresses</div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="font-medium">{tokenA}:</span>
                <span className="font-mono text-gray-500">
                  {tokenAAddress ? `${tokenAAddress.slice(0, 6)}...${tokenAAddress.slice(-4)}` : 'No address'}
                </span>
                {tokenAAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tokenAAddress);
                      toast.success(`${tokenA} address copied`);
                    }}
                    className="text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="font-medium">{tokenB}:</span>
                <span className="font-mono text-gray-500">
                  {tokenBAddress ? `${tokenBAddress.slice(0, 6)}...${tokenBAddress.slice(-4)}` : 'No address'}
                </span>
                {tokenBAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tokenBAddress);
                      toast.success(`${tokenB} address copied`);
                    }}
                    className="text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span className="font-bold">{pool.apr?.toFixed(1)}%</span>
          </div>
          <span className="text-xs text-gray-500">APR</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-gray-400 text-xs mb-1">TVL</p>
          <p className="font-semibold">{formatNumber(pool.tvl)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">Volume 24h</p>
          <p className="font-semibold">{formatNumber(Number(pool.volume_24h) || 0)}</p>
        </div>
      </div>

      {/* Action Button */}
      <Button 
        onClick={() => setShowAddModal(true)}
        className="w-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-white border border-white/10 rounded-xl group-hover:border-cyan-500/30 transition-all"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Liquidity
      </Button>
    </motion.div>
    </>
  );
}

