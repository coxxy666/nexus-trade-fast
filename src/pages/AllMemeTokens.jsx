import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TokenRow from '@/components/dashboard/TokenRow';
import TokenDetailModal from '@/components/memeai/TokenDetailModal';
import { fetchAllMemeTokens } from '@/components/memeai/GeckoTerminalService';

export default function AllMemeTokens() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenDetail, setShowTokenDetail] = useState(false);

  // Fetch all meme tokens from backend proxy
  const { data: memeTokens = [], isLoading } = useQuery({
    queryKey: ['allMemeTokens', sortBy],
    queryFn: fetchAllMemeTokens,
    refetchInterval: 120000,
  });

  // Filter tokens
  const filteredTokens = memeTokens.filter(token =>
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTokenClick = (token) => {
    setSelectedToken(token);
    setShowTokenDetail(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            All <span className="gradient-text">Meme Tokens</span>
          </h1>
          <p className="text-gray-400">
            Complete list of meme tokens tracked by CoinGecko
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Tokens</p>
                <p className="text-2xl font-bold">{memeTokens.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Market Cap</p>
                <p className="text-2xl font-bold">
                  ${(memeTokens.reduce((sum, t) => sum + (t.market_cap || 0), 0) / 1e9).toFixed(2)}B
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Last Updated</p>
                <p className="text-lg font-semibold">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-8"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search meme tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
            />
          </div>

          <Tabs value={sortBy} onValueChange={setSortBy}>
            <TabsList className="bg-white/5 rounded-xl p-1">
              <TabsTrigger value="market_cap" className="rounded-lg data-[state=active]:bg-white/10">
                Market Cap
              </TabsTrigger>
              <TabsTrigger value="volume" className="rounded-lg data-[state=active]:bg-white/10">
                Volume
              </TabsTrigger>
              <TabsTrigger value="price_change_percentage_24h" className="rounded-lg data-[state=active]:bg-white/10">
                Trending
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Tokens Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-6 md:p-8"
        >
          {/* Table Header */}
          <div className="hidden sm:flex items-center justify-between px-4 py-3 text-sm text-gray-500 border-b border-white/5 mb-2">
            <div className="flex items-center gap-4">
              <span className="w-6">#</span>
              <span>Token</span>
            </div>
            <div className="flex items-center gap-8">
              <span className="w-24 text-right">Price</span>
              <span className="w-24 text-right">24h Change</span>
              <span className="w-32 text-right hidden md:block">Market Cap</span>
              <span className="w-32 text-right hidden lg:block">Volume</span>
            </div>
          </div>

          {/* Token List */}
          {isLoading ? (
            <div className="text-center py-20">
              <p className="text-gray-400">Loading meme tokens...</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No tokens found.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTokens.map((token, index) => (
                <TokenRow
                  key={token.address || index}
                  token={token}
                  index={index}
                  onTokenClick={handleTokenClick}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Token Detail Modal */}
        <TokenDetailModal
          token={selectedToken}
          isOpen={showTokenDetail}
          onClose={() => setShowTokenDetail(false)}
        />
      </div>
    </div>
  );
}

