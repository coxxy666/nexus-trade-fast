import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, Flame } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { fetchTrendingMemeCoins, fetchGainersMemeCoins, fetchLosersMemeCoins, fetchHighVolumeMemeCoins } from '@/components/services/TrendingMemeService';
import TokenRow from './TokenRow';
import { cn } from '@/lib/utils';

export default function TrendingSection({ onTokenClick }) {
  const [activeTab, setActiveTab] = useState('trending');

  const { data: trendingCoins = [] } = useQuery({
    queryKey: ['trendingMemeCoins'],
    queryFn: fetchTrendingMemeCoins,
    refetchInterval: 120000,
  });

  const { data: gainers = [] } = useQuery({
    queryKey: ['gainersMemeCoins'],
    queryFn: fetchGainersMemeCoins,
    refetchInterval: 120000,
  });

  const { data: losers = [] } = useQuery({
    queryKey: ['losersMemeCoins'],
    queryFn: fetchLosersMemeCoins,
    refetchInterval: 120000,
  });

  const { data: highVolume = [] } = useQuery({
    queryKey: ['highVolumeMemeCoins'],
    queryFn: fetchHighVolumeMemeCoins,
    refetchInterval: 120000,
  });

  const sections = [
    {
      id: 'trending',
      label: 'Trending',
      icon: Zap,
      data: trendingCoins,
      color: 'text-cyan-400',
    },
    {
      id: 'gainers',
      label: 'Top Gainers',
      icon: TrendingUp,
      data: gainers,
      color: 'text-green-400',
    },
    {
      id: 'losers',
      label: 'Top Losers',
      icon: TrendingDown,
      data: losers,
      color: 'text-red-400',
    },
    {
      id: 'volume',
      label: 'High Volume',
      icon: Flame,
      data: highVolume,
      color: 'text-orange-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-3xl p-6 md:p-8 mb-20"
    >
      <h2 className="text-2xl font-bold mb-6">Meme Coin Discovery</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-white/5 mb-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.label}</span>
                <span className="sm:hidden">{section.label.split(' ')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="mt-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {React.createElement(section.icon, {
                    className: cn('w-6 h-6', section.color),
                  })}
                  <div>
                    <h3 className="text-lg font-semibold">{section.label}</h3>
                    <p className="text-xs text-gray-400">
                      {section.id === 'trending' && 'Coins with rising social interest'}
                      {section.id === 'gainers' && 'Best performing meme coins (24h)'}
                      {section.id === 'losers' && 'Biggest declines (24h)'}
                      {section.id === 'volume' && 'Highest trading activity'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center justify-between px-4 py-3 text-sm text-gray-500 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <span className="w-6">#</span>
                  <span>Token</span>
                </div>
                <div className="flex items-center gap-8">
                  <span className="w-24 text-right">Price</span>
                  <span className="w-24 text-right">24h Change</span>
                  <span className="w-32 text-right hidden md:block">Volume</span>
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {section.data.length > 0 ? (
                  section.data.map((token, index) => (
                    <TokenRow
                      key={token.symbol || token.address}
                      token={token}
                      index={index}
                      onTokenClick={onTokenClick}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No tokens available for {section.label.toLowerCase()}
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-6 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400">
        <p>💡 Data updates every 2 minutes. Use trending data to discover emerging meme coin opportunities before they explode!</p>
      </div>
    </motion.div>
  );
}
