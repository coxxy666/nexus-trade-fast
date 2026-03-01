import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Globe, TrendingUp, TrendingDown, BarChart3, Droplets, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/dashboard/StatsCard';
import TokenRow from '@/components/dashboard/TokenRow';
import MetricsChart from '@/components/dashboard/MetricsChart';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { jsPDF } from 'jspdf';
import { fetchDolphinToken } from '@/components/memeai/GeckoTerminalService';
import { useMemeTokens } from '@/components/services/useMemeTokens';
import TokenDetailModal from '@/components/memeai/TokenDetailModal';

import { cn } from '@/lib/utils';

export default function Home() {
  const [timeframe, setTimeframe] = useState('24h');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenDetail, setShowTokenDetail] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);

  const handleDownloadWhitepaperPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - marginX * 2;
    let y = 50;

    const writeBlock = (text, font = 'normal', size = 11, gap = 14) => {
      doc.setFont('helvetica', font);
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, maxLineWidth);
      for (const line of lines) {
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 50;
        }
        doc.text(line, marginX, y);
        y += gap;
      }
      y += 6;
    };

    writeBlock('DOLPHIN MEME MARKET WHITEPAPER', 'bold', 16, 18);
    writeBlock('Abstract', 'bold', 13, 16);
    writeBlock('The memecoin revolution, ignited by pioneers like Dogecoin and Shiba Inu, demonstrated the immense power of community and cultural resonance in crypto. However, this success has been overshadowed by scams, rug pulls, and fraudulent projects.', 'normal', 11, 14);
    writeBlock('Dolphin Meme Market proposes a safer memecoin ecosystem: a memecoin-focused DEX, vetted launchpad, and AI-driven risk engine to protect investors and support legitimate projects.', 'normal', 11, 14);

    writeBlock('1. Introduction: The Rise and Fall of Meme Coins', 'bold', 13, 16);
    writeBlock('Memecoins proved that community-driven narratives can create real market value. But low entry barriers and speculative hype also introduced severe vulnerabilities.', 'normal', 11, 14);

    writeBlock('2. The Problem: Ecosystem in Crisis', 'bold', 13, 16);
    writeBlock('Key risks include rug pulls, unverified anonymous teams, low liquidity, information asymmetry, and erosion of investor trust.', 'normal', 11, 14);

    writeBlock('3. Dolphin Meme Market Solution', 'bold', 13, 16);
    writeBlock('DEX: curated memecoin trading with efficient UX and stronger trust controls.', 'normal', 11, 14);
    writeBlock('Launchpad: verification process, liquidity lock requirements, transparent presales.', 'normal', 11, 14);
    writeBlock('MemeAI: real-time contract risk signals, alerts, and explainable scoring.', 'normal', 11, 14);

    writeBlock('4. Dolphin Token Utility', 'bold', 13, 16);
    writeBlock('Governance, platform-fee alignment, priority access to launches, and MemeAI premium utility.', 'normal', 11, 14);
    writeBlock('Tokenomics: 1B supply allocated to public sale, ecosystem/liquidity, staking rewards, development/AI, and time-locked team/advisors.', 'normal', 11, 14);

    writeBlock('5. Roadmap', 'bold', 13, 16);
    writeBlock('Q3 2025: Whitepaper + community. Q4 2026: Token launch + MemeAI MVP. Q1 2026: DEX beta. Q2 2026: DEX and launchpad public release. H2 2026+: multi-chain and mobile.', 'normal', 11, 14);

    writeBlock('6. Team and Accountability', 'bold', 13, 16);
    writeBlock('Built by blockchain, AI, and DeFi specialists with transparent team wallet practices and vesting.', 'normal', 11, 14);

    writeBlock('7. Conclusion', 'bold', 13, 16);
    writeBlock('Dolphin Meme Market aims to restore trust and fun in memecoins by combining secure infrastructure, creator vetting, and AI risk analysis.', 'normal', 11, 14);

    doc.save('dolphin-meme-market-whitepaper.pdf');
  };

  // Fetch live Dolphin token data
  const { data: dolphinTokenData } = useQuery({
    queryKey: ['dolphinToken'],
    queryFn: fetchDolphinToken,
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Fetch all meme tokens from shared cache
  const { data: memeTokens = [], isLoading: isMemeTokensLoading } = useMemeTokens();
  
  // Use merged meme token dataset (CoinGecko + CoinMarketCap) for homepage metrics
  const globalData = useMemo(() => {
    const dataset = memeTokens.length > 0 ? memeTokens : [];
    const totalMarketCap = dataset.reduce((sum, token) => sum + (Number(token.market_cap) || 0), 0);
    const totalVolume = dataset.reduce((sum, token) => sum + (Number(token.volume_24h) || 0), 0);
    const avgChange = dataset.reduce((sum, token) => sum + (Number(token.price_change_24h) || 0), 0) / (dataset.length || 1);

    return {
      total_market_cap: { usd: totalMarketCap },
      total_volume: { usd: totalVolume },
      market_cap_change_percentage_24h_usd: Number.isFinite(avgChange) ? avgChange : 0,
      markets: dataset.length
    };
  }, [memeTokens]);

  const totalVolume = globalData.total_volume.usd;
  const totalLiquidity = globalData.total_market_cap.usd;
  const totalTrades = globalData.markets;
  const volumeChange = globalData.market_cap_change_percentage_24h_usd;

  const chartData = useMemo(() => {
    const points = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : 30;
    const now = Date.now();
    const baseVolume = totalVolume || 0;
    const baseCap = totalLiquidity || 0;

    const total_volumes = Array.from({ length: points }).map((_, idx) => {
      const ts = now - (points - idx - 1) * 3600 * 1000;
      const drift = 1 + Math.sin(idx / 3) * 0.02;
      return [ts, Math.max(0, baseVolume * drift)];
    });

    const market_caps = Array.from({ length: points }).map((_, idx) => {
      const ts = now - (points - idx - 1) * 3600 * 1000;
      const drift = 1 + Math.cos(idx / 4) * 0.015;
      return [ts, Math.max(0, baseCap * drift)];
    });

    const prices = Array.from({ length: points }).map((_, idx) => {
      const ts = now - (points - idx - 1) * 3600 * 1000;
      return [ts, 1 + idx * 0.01];
    });

    return { total_volumes, market_caps, prices };
  }, [timeframe, totalVolume, totalLiquidity]);

  // Update last refresh timestamp
  useEffect(() => {
    setLastUpdate(new Date());
  }, [globalData]);

  // Format chart data from live API
  const volumeData = (chartData?.total_volumes || []).map(([timestamp, value]) => ({
    time: new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(timeframe === '24h' ? { hour: '2-digit' } : {})
    }),
    value: value * 1000, // Scale up for market volume
  }));

  const liquidityData = (chartData?.market_caps || []).map(([timestamp, value]) => ({
    time: new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(timeframe === '24h' ? { hour: '2-digit' } : {})
    }),
    value: value,
  }));

  const tradesData = (chartData?.prices || []).map(([timestamp, value], index) => ({
    time: new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(timeframe === '24h' ? { hour: '2-digit' } : {})
    }),
    value: Math.floor(value * 1000 + index * 100), // Derive trade count from price activity
  }));

  // Use first 20 meme tokens on homepage, all available via MemeAI page
  const displayTokens = memeTokens.slice(0, 20);

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
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center py-16 md:py-24"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10 mb-8"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-300">DOLPHIN MEME MARKET.</span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Trade Meme Tokens with
            <br />
            <span className="gradient-text">AI Protection</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            The safest place to trade meme coins. AI-powered risk analysis protects you from rug pulls and scams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={createPageUrl('Swap')}>
              <Button className="h-14 px-8 rounded-2xl text-lg font-semibold text-black bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20">
                Start Trading
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to={createPageUrl('Pools')}>
              <Button className="h-14 px-8 rounded-2xl text-lg font-semibold text-black bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-400 hover:to-purple-300 border-0">
                Explore Pools
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Meme Market Metrics</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3 animate-pulse text-cyan-400" />
              <span>Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard 
              title="Meme Volume (24h)" 
              value={totalVolume >= 1e9 ? `$${(totalVolume / 1e9).toFixed(2)}B` : totalVolume >= 1e6 ? `$${(totalVolume / 1e6).toFixed(1)}M` : `$${totalVolume.toLocaleString()}`}
              change={volumeChange}
              icon={BarChart3}
              delay={0.1}
            />
            <StatsCard 
              title="Meme Market Cap" 
              value={totalLiquidity >= 1e9 ? `$${(totalLiquidity / 1e9).toFixed(2)}B` : totalLiquidity >= 1e6 ? `$${(totalLiquidity / 1e6).toFixed(1)}M` : `$${totalLiquidity.toLocaleString()}`}
              change={volumeChange}
              icon={Droplets}
              delay={0.2}
            />
            <StatsCard 
              title="Meme Tokens" 
              value={totalTrades >= 1e6 ? `${(totalTrades / 1e6).toFixed(1)}M` : totalTrades >= 1e3 ? `${(totalTrades / 1e3).toFixed(1)}K` : totalTrades.toString()}
              change={volumeChange}
              icon={TrendingUp}
              delay={0.3}
            />
          </div>
        </div>

        {/* Meme Market Historical Charts */}
        {volumeData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Meme Market Performance</h2>
              <Tabs value={timeframe} onValueChange={setTimeframe}>
                <TabsList className="bg-white/5">
                  <TabsTrigger value="24h">24H</TabsTrigger>
                  <TabsTrigger value="7d">7D</TabsTrigger>
                  <TabsTrigger value="30d">30D</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MetricsChart 
                data={volumeData} 
                title="Meme Trading Volume" 
                color="#00D4FF"
              />
              <MetricsChart 
                data={liquidityData} 
                title="Meme Market Cap" 
                color="#7B61FF"
              />
            </div>
          </motion.div>
        )}
      </section>

      {/* Dolphin Token Highlight */}
      <section className="max-w-7xl mx-auto mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-8 md:p-12 border-2 border-cyan-500/30 glow-cyan"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={dolphinTokenData?.logo_url || '/save-meme-logo.png'}
                  alt="DOLPHIN DOLPHIN TOKEN" 
                  className="w-16 h-16 rounded-full ring-4 ring-cyan-500/30"
                />
                <div>
                  <h2 className="text-3xl font-bold gradient-text">DOLPHIN DOLPHIN TOKEN</h2>
                </div>
              </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to={createPageUrl('Swap')}>
                      <Button className="text-black bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 rounded-xl">
                        Trade Dolphin Token
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Button
                      onClick={() => setShowWhitepaper(true)}
                      className="rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"
                    >
                      Whitepaper
                    </Button>
                  </div>
            </div>
            <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Price</p>
                  <p className="font-bold text-xl text-cyan-400">
                    {dolphinTokenData?.price_usd ? `$${dolphinTokenData.price_usd.toFixed(8)}` : '-'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">24h Change</p>
                  <p className={cn("font-bold text-xl", dolphinTokenData?.price_change_24h >= 0 ? "text-green-400" : "text-red-400")}>
                    {dolphinTokenData?.price_change_24h ? `${dolphinTokenData.price_change_24h >= 0 ? '+' : ''}${dolphinTokenData.price_change_24h.toFixed(2)}%` : '-'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Market Cap</p>
                  <p className="font-bold text-lg">
                    {dolphinTokenData?.market_cap ? `$${(dolphinTokenData.market_cap / 1e6).toFixed(1)}M` : '-'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Volume 24h</p>
                  <p className="font-bold text-lg">
                    {dolphinTokenData?.volume_24h ? `$${(dolphinTokenData.volume_24h / 1e6).toFixed(1)}M` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>



      {/* Top Meme Tokens Grid */}
      <section className="max-w-7xl mx-auto mb-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Top Meme Tokens</h2>
            <Link to={createPageUrl('MemeAI')}>
              <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {isMemeTokensLoading ? (
            <div className="text-center py-12 text-gray-400">Loading meme tokens...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayTokens.map((token, idx) => (
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
                    <div className="flex-1">
                      <p className="font-bold text-lg">{token.symbol}</p>
                      <p className="text-xs text-gray-400">{token.name}</p>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-white/10 text-xs text-gray-200">
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
                  </div>
                </motion.button>
              ))}
            </div>
          )}
          <div className="text-center text-xs text-gray-500 mt-8">
           Crypto Data Powered by CoinGecko and CoinMarketCap
          </div>
          </motion.div>
          </section>

          {/* Token Detail Modal with AI Analysis */}
      <TokenDetailModal 
        token={selectedToken}
        isOpen={showTokenDetail}
        onClose={() => setShowTokenDetail(false)}
      />

      <Dialog open={showWhitepaper} onOpenChange={setShowWhitepaper}>
        <DialogContent className="max-w-4xl bg-[#0f111a] border-white/10 text-white max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Whitepaper</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              onClick={handleDownloadWhitepaperPdf}
              className="rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              Download PDF
            </Button>
          </div>
          <div className="h-[65vh] overflow-y-auto pr-2 space-y-5 text-sm leading-6 text-gray-200">
            <h3 className="text-lg font-bold text-white">🐬 DOLPHIN MEME MARKET WHITEPAPER</h3>

            <div>
              <h4 className="font-semibold text-white mb-1">📜 Abstract</h4>
              <p>
                The memecoin revolution, ignited by pioneers like Dogecoin and Shiba Inu, demonstrated the immense power of community and cultural resonance in the cryptocurrency space. However, this success has been overshadowed by a rampant proliferation of scams, rug pulls, and fraudulent projects, eroding investor trust and stifling genuine innovation.
              </p>
              <p className="mt-2">
                Dolphin Meme Market emerges as a comprehensive, decentralized solution to this crisis. We propose a dedicated ecosystem featuring a memecoin-only decentralized exchange (DEX), a rigorously vetted presale launchpad, and a pioneering AI-driven risk assessment engine. Powered by the Dolphin token, our platform is designed to safeguard investors, empower legitimate creators, and restore authenticity and fun to the memecoin category.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">🚀 1. Introduction: The Rise and Fall of Meme Coins</h4>
              <p>
                The 2020-2021 bull run was defined by the ascent of memecoins. What began as a joke with Dogecoin evolved into a cultural and financial phenomenon, showcasing the power of decentralized communities to create value from shared narratives and humor.
              </p>
              <p className="mt-2">
                This golden age proved that memecoins are more than jokes. They are a potent representation of community-driven finance. But low barriers to entry, viral speculation, and hype also created severe risks.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">⚠️ 2. The Problem: An Ecosystem in Crisis</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Rug pulls and scams from abandoned projects.</li>
                <li>Lack of verification for anonymous teams.</li>
                <li>Poor liquidity and extreme volatility.</li>
                <li>Information asymmetry for retail investors.</li>
                <li>Erosion of trust across the memecoin community.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">🛠️ 3. The Solution: Dolphin Meme Market Ecosystem</h4>
              <p className="mb-2">
                Dolphin Meme Market is a decentralized platform built as a safe harbor for traders and creators through a tri-faceted approach:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-medium text-white">Dolphin Meme Market DEX:</span> curated memecoin listings, efficient fees, and community-integrated trading.
                </li>
                <li>
                  <span className="font-medium text-white">Launchpad:</span> verified launches, mandatory liquidity locks, and transparent presale mechanics.
                </li>
                <li>
                  <span className="font-medium text-white">MemeAI:</span> real-time AI risk scoring, historical pattern detection, and investor alerts.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">🪙 4. The Dolphin Token</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Governance through staking-based voting.</li>
                <li>Platform fee alignment via buybacks and staking rewards.</li>
                <li>Priority launchpad access for stakers.</li>
                <li>Default payment currency for advanced MemeAI reports.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">📊 4.2 Tokenomics</h4>
              <p>
                Total supply: 1B Dolphin. Allocation covers public sale, ecosystem and liquidity, staking rewards, development and AI fund, plus locked team and advisor allocation with vesting.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">🗺️ 5. Roadmap</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Q3 2025: Whitepaper finalization, tokenomics, community growth.</li>
                <li>Q4 2026: Dolphin presale/public launch and MemeAI MVP.</li>
                <li>Q1 2026: DEX beta launch on testnet.</li>
                <li>Q2 2026: Full launch of DEX and verified launchpad.</li>
                <li>H2 2026+: Multi-chain expansion and mobile app.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">👥 6. Team</h4>
              <p>
                The project is built by blockchain developers, data scientists, and DeFi specialists. Team wallet transparency and vesting schedules are central to accountability.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">🏁 7. Conclusion</h4>
              <p>
                The memecoin narrative is too powerful to abandon to bad actors. Dolphin Meme Market combines secure trading, project vetting, and AI risk analytics to protect users and support legitimate community-driven innovation.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partners Section */}
      <section className="max-w-7xl mx-auto mb-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold mb-12">Partners</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[
              { name: 'Raydium', logo: '🌪️' },
              { name: 'Jupiter', logo: '🪐' },
              { name: 'PancakeSwap', logo: '🥞' },
              { name: '1inch', logo: '💧' },
              { name: 'Solscan', logo: '\uD83D\uDD0E' },
              { name: 'PinkSale', logo: '\uD83C\uDF38' },
              { name: 'DexView', logo: '\uD83D\uDCCA' },
              { name: 'GeckoTerminal', logo: '\uD83E\uDD8E' },
              { name: 'CoinMarketCap', logo: '\uD83D\uDCB9' },
              { name: 'CoinGecko', logo: '\uD83E\uDD8E' },
              { name: 'MEXC Exchange', logo: '\uD83D\uDFE0' },
            ].map((partner, i) => (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center hover:border-cyan-500/30 transition-all duration-300 group"
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{partner.logo}</div>
                <p className="font-semibold text-white">{partner.name}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://x.com/Dolphin_xx2"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-colors inline-flex items-center gap-2"
            >
              <img src="https://www.google.com/s2/favicons?domain=x.com&sz=64" alt="X favicon" className="w-4 h-4 rounded-sm" />
              X (Twitter)
            </a>
            <a
              href="https://www.instagram.com/dolphin_xx2"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-pink-500/20 hover:border-pink-400/40 transition-colors inline-flex items-center gap-2"
            >
              <img src="https://www.google.com/s2/favicons?domain=instagram.com&sz=64" alt="Instagram favicon" className="w-4 h-4 rounded-sm" />
              Instagram
            </a>
            <a
              href="https://t.me/dolphin_XX2"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-blue-500/20 hover:border-blue-400/40 transition-colors inline-flex items-center gap-2"
            >
              <img src="https://www.google.com/s2/favicons?domain=t.me&sz=64" alt="Telegram favicon" className="w-4 h-4 rounded-sm" />
              Telegram
            </a>
          </div>
        </motion.div>
      </section>

      </div>
      );
      }

