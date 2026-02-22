import React, { useState } from 'react';
import { Brain, Search, TrendingUp, Shield, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TokenDetailModal from '@/components/memeai/TokenDetailModal';
import { motion } from 'framer-motion';
import { useMemeTokens } from '@/components/services/useMemeTokens';

export default function MemeAI() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenDetail, setShowTokenDetail] = useState(false);

  const { data: memeTokens = [], isLoading } = useMemeTokens();

  const filteredTokens = memeTokens.filter(token =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTokenClick = (token) => {
    setSelectedToken(token);
    setShowTokenDetail(true);
  };
  const getChainMeta = (network) => {
    const key = String(network || '').toLowerCase();
    if (key === 'solana') return { label: 'Solana', logo: '◎' };
    if (key === 'bsc' || key === 'binance-smart-chain') return { label: 'BSC', logo: '◆' };
    if (key === 'ethereum' || key === 'eth') return { label: 'Ethereum', logo: '◇' };
    return { label: 'Multi', logo: '◈' };
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">MemeAI</span> Risk Analysis
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            AI-powered risk assessment engine for memecoin security analysis
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search meme tokens to analyze..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg bg-white/5 border-white/10"
              />
            </div>
            {searchTerm && filteredTokens.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {filteredTokens.map((token, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleTokenClick(token);
                      setSearchTerm('');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <img src={token.logo_url} alt={token.symbol} className="w-8 h-8 rounded-full" />
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-semibold truncate">{token.symbol}</p>
                      <p className="text-xs text-gray-400 truncate">{token.name}</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {getChainMeta(token.network).logo} {getChainMeta(token.network).label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTokenClick(token);
                        setSearchTerm('');
                      }}
                      className="px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-colors shrink-0"
                    >
                      Analyze
                    </button>
                    <div className="text-right shrink-0">
                      <p className="font-medium">${token.price_usd?.toFixed(8)}</p>
                      <p className={`text-xs ${token.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h?.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6 border border-white/10"
          >
            <Shield className="w-10 h-10 text-cyan-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">Smart Contract Analysis</h3>
            <p className="text-sm text-gray-400">
              Advanced vulnerability scanning and security assessment
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6 border border-white/10"
          >
            <TrendingUp className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">Rug Pull Detection</h3>
            <p className="text-sm text-gray-400">
              Real-time monitoring for suspicious activity patterns
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6 border border-white/10"
          >
            <Brain className="w-10 h-10 text-pink-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">AI Risk Scoring</h3>
            <p className="text-sm text-gray-400">
              Machine learning-powered comprehensive risk evaluation
            </p>
          </motion.div>
        </div>

        {/* All Meme Tokens Grid */}
        {!searchTerm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-6">All Meme Tokens</h2>
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Loading meme tokens...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memeTokens.map((token, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleTokenClick(token)}
                    className="glass-card rounded-2xl p-6 border border-white/10 hover:border-cyan-500/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img src={token.logo_url} alt={token.symbol} className="w-12 h-12 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{token.symbol}</p>
                        <p className="text-xs text-gray-400 truncate">{token.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTokenClick(token);
                        }}
                        className="px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-colors shrink-0"
                      >
                        Analyze
                      </button>
                      <div className="px-2 py-1 rounded-md bg-white/10 text-xs text-gray-200 shrink-0">
                        {getChainMeta(token.network).logo} {getChainMeta(token.network).label}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Price</span>
                        <span className="font-semibold">${token.price_usd?.toFixed(8)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">24h Change</span>
                        <span className={`font-semibold flex items-center gap-1 ${
                          token.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {token.price_change_24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h?.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Market Cap</span>
                        <span className="font-semibold">
                          ${token.market_cap >= 1e9 ? `${(token.market_cap / 1e9).toFixed(2)}B` : 
                             token.market_cap >= 1e6 ? `${(token.market_cap / 1e6).toFixed(1)}M` : 
                             `${(token.market_cap / 1e3).toFixed(0)}K`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTokenClick(token);
                        }}
                        className="w-full mt-2 px-3 py-2 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 transition-colors text-sm font-medium"
                      >
                        Analyze {token.symbol}
                      </button>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Token Detail Modal with AI Analysis */}
        <TokenDetailModal 
          token={selectedToken}
          isOpen={showTokenDetail}
          onClose={() => setShowTokenDetail(false)}
        />
      </div>
    </div>
  );
}

