import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { fetchRealTimeMemeData, fetchGlobalMemeStats } from '../services/RealTimeMemeDataService';

function formatPrice(price) {
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function formatVolume(volume) {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(2)}`;
}

export default function RealTimeMemeMarket() {
  const { data: memeCoins = [], isLoading } = useQuery({
    queryKey: ['realTimeMemeData'],
    queryFn: fetchRealTimeMemeData,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    staleTime: 5000
  });

  const { data: globalStats } = useQuery({
    queryKey: ['globalMemeStats'],
    queryFn: fetchGlobalMemeStats,
    refetchInterval: 10000,
    staleTime: 5000
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 glass-card rounded-xl mb-4"></div>
          <div className="h-64 glass-card rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      {globalStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Market Cap</p>
                <p className="text-lg font-bold text-white">
                  {formatVolume(globalStats.total_market_cap)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">24h Volume</p>
                <p className="text-lg font-bold text-white">
                  {formatVolume(globalStats.total_volume_24h)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${globalStats.average_change_24h >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {globalStats.average_change_24h >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg 24h Change</p>
                <p className={`text-lg font-bold ${globalStats.average_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {globalStats.average_change_24h >= 0 ? '+' : ''}{globalStats.average_change_24h.toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Activity className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Coins Tracked</p>
                <p className="text-lg font-bold text-white">
                  {globalStats.coins_tracked}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Meme Coins Table */}
      <Card className="glass-card border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold gradient-text">Live Meme Market</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              Live • Updates every 10s
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-400">#</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400">Coin</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-400">Price</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-400">24h Change</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-400">24h Volume</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-400">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {memeCoins.map((coin, index) => (
                <tr key={coin.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-400 text-sm">{index + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-semibold text-white">{coin.name}</p>
                        <p className="text-xs text-gray-400">{coin.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-white">
                    {formatPrice(coin.current_price)}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`flex items-center justify-end gap-1 font-semibold ${
                      coin.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {coin.price_change_24h >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {coin.price_change_24h >= 0 ? '+' : ''}{coin.price_change_24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-gray-300">
                    {formatVolume(coin.total_volume)}
                  </td>
                  <td className="p-4 text-right font-mono text-gray-300">
                    {formatVolume(coin.market_cap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
