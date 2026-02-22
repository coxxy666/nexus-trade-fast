import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ExternalLink, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllMemeTokens } from '@/components/memeai/GeckoTerminalService';
import { cn } from '@/lib/utils';

export default function TrendingSmartContracts() {
  const { data: allTokens = [] } = useQuery({
    queryKey: ['allMemeTokensForTrending'],
    queryFn: fetchAllMemeTokens,
    refetchInterval: 120000,
  });

  const trendingTokens = React.useMemo(() => {
    return [...allTokens]
      .sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0))
      .slice(0, 5);
  }, [allTokens]);

  const totalTokens = allTokens.length;
  const coingeckoCount = allTokens.filter(t => t.network === 'multi-chain' || t.network === 'ethereum').length;
  const coinmarketcapCount = allTokens.filter(t => t.network !== 'multi-chain' && t.network !== 'ethereum').length;

  const formatNumber = (num) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getExplorerUrl = (token) => {
    if (token.network === 'solana') {
      return `https://solscan.io/token/${token.address}`;
    } else if (token.network === 'bsc') {
      return `https://bscscan.com/token/${token.address}`;
    } else if (token.network === 'ethereum' || token.network === 'multi-chain') {
      return `https://etherscan.io/token/${token.address}`;
    }
    return '#';
  };

  return (
    <section className="max-w-7xl mx-auto mb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-card rounded-3xl p-6 md:p-8"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl font-bold">Trending by Volume</h2>
          </div>

          {/* Token Sources Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Memecoins</p>
              <p className="text-2xl font-bold text-cyan-400">{totalTokens}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-gray-400 text-sm mb-1">From CoinGecko</p>
              <p className="text-2xl font-bold text-purple-400">{coingeckoCount}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-gray-400 text-sm mb-1">From CoinMarketCap</p>
              <p className="text-2xl font-bold text-pink-400">{coinmarketcapCount}</p>
            </div>
          </div>
        </div>

        {/* Trending Tokens */}
        <div className="space-y-3">
          {trendingTokens.map((token, index) => (
            <motion.a
              key={token.symbol}
              href={getExplorerUrl(token)}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 font-bold text-sm group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <img 
                    src={token.logo_url || `https://ui-avatars.com/api/?name=${token.symbol}&background=random`}
                    alt={token.symbol}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{token.symbol}</p>
                    <p className="text-xs text-gray-500">{token.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-400">24h Volume</p>
                  <p className="font-bold text-green-400">{formatNumber(token.volume_24h || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Market Cap</p>
                  <p className="font-bold">{formatNumber(token.market_cap || 0)}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
              </div>
            </motion.a>
          ))}
        </div>

        {trendingTokens.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            Loading trending tokens...
          </div>
        )}
      </motion.div>
    </section>
  );
}
