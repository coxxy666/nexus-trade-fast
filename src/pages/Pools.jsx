import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Plus, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PoolCard from '@/components/pools/PoolCard';
import CreatePoolModal from '@/components/pools/CreatePoolModal';
import { fetchLivePrices } from '@/components/services/LivePriceService';
import { listLocalPools } from '@/lib/localPools';

export default function Pools() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: customPoolsRaw, error: poolsError, isLoading: poolsLoading } = useQuery({
    queryKey: ['liquidityPools'],
    queryFn: async () => listLocalPools()
  });
  const customPools = Array.isArray(customPoolsRaw) ? customPoolsRaw : [];

  // Fetch live prices for pool tokens
  const { data: livePrices = {} } = useQuery({
    queryKey: ['livePrices', 'pools'],
    queryFn: async () => {
      const symbols = [
        ...new Set(
          customPools
            .flatMap((p) => [p?.token_a, p?.token_b])
            .filter((s) => typeof s === 'string' && s.trim().length > 0)
        ),
      ];
      if (!symbols.length) return {};
      return await fetchLivePrices(symbols);
    },
    refetchInterval: 30000,
    enabled: customPools.length > 0,
  });

  // Calculate pools with live TVL and APR
  const allPools = customPools
    .filter((pool) => pool && typeof pool.token_a === 'string' && typeof pool.token_b === 'string')
    .map(pool => {
    const priceA = livePrices?.[pool.token_a]?.price || 0;
    const priceB = livePrices?.[pool.token_b]?.price || 0;
    const tvl = Number(pool.tvl) || ((Number(pool.token_a_amount) || 0) * priceA) + ((Number(pool.token_b_amount) || 0) * priceB);
    const dailyFees = (Number(pool.volume_24h) || 0) * ((Number(pool.fee_tier) || 0) / 100);
    const apr = Number(pool.apr) || (tvl > 0 ? (dailyFees * 365 / tvl) * 100 : 0);
    
    return {
      ...pool,
      tvl,
      apr,
    };
  });

  const filteredPools = allPools.filter(pool => {
    const tokenA = String(pool?.token_a || '').toLowerCase();
    const tokenB = String(pool?.token_b || '').toLowerCase();
    const matchesSearch = 
      tokenA.includes(search.toLowerCase()) ||
      tokenB.includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'stables') {
      const stables = ['USDC', 'USDT', 'DAI', 'FDUSD'];
      return stables.includes(pool.token_a) || stables.includes(pool.token_b);
    }
    if (activeTab === 'trending') {
      return Number(pool.volume_24h || 0) > 0;
    }

    return true;
  });

  const totalTVL = allPools.reduce((sum, pool) => sum + pool.tvl, 0);
  const avgAPR = allPools.length > 0
    ? allPools.reduce((sum, pool) => sum + pool.apr, 0) / allPools.length
    : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {poolsError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Failed to load pools: {String(poolsError?.message || poolsError)}
          </div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Liquidity <span className="gradient-text">Pools</span>
          </h1>
          <p className="text-gray-400 max-w-xl">
            Provide liquidity for only meme tokens listed on CoinMarketCap or CoinGecko to earn trading fees. The more you contribute, the more you earn.
          </p>
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mb-8 glow-purple"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Total Value Locked</p>
              <p className="text-2xl font-bold gradient-text">${(totalTVL / 1e6).toFixed(0)}M</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Average APR</p>
              <p className="text-2xl font-bold text-green-400">{avgAPR.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Pools</p>
              <p className="text-2xl font-bold">{customPools.length}</p>
            </div>
            <div className="flex items-center">
              <Button 
                onClick={() => {
                  setShowCreateModal(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pool
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-8"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search pools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 rounded-xl p-1">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white/10">
                All Pools
              </TabsTrigger>
              <TabsTrigger value="stables" className="rounded-lg data-[state=active]:bg-white/10">
                Stables
              </TabsTrigger>
              <TabsTrigger value="trending" className="rounded-lg data-[state=active]:bg-white/10">
                <TrendingUp className="w-4 h-4 mr-1" />
                Trending
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Pools Grid */}
        {poolsLoading ? (
          <div className="text-center py-20 text-gray-400">Loading pools...</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.map((pool, index) => (
            <PoolCard key={pool.id} pool={pool} index={index} />
          ))}
        </div>
        )}

        {filteredPools.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500">No pools found matching your search.</p>
          </div>
        )}

        <CreatePoolModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['liquidityPools'] })}
        />
      </div>
    </div>
  );
}

