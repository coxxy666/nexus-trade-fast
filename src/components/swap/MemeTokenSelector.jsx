import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllMemeTokens } from '@/components/memeai/GeckoTerminalService';
import { toast } from 'sonner';

export default function MemeTokenSelector({ isOpen, onClose, onSelect, selectedToken, selectedNetwork = 'bsc' }) {
  const [search, setSearch] = useState('');
  const DOLPHIN_PRIORITY_ADDRESS = 'D4cEQyPyc6idbmsgmv4dycFxygyK2DzdUamfWmUuJmt9'.toLowerCase();
  const PRIORITY_TOKENS = ['SOL', 'BNB', 'ETH'];

  // Fetch all 5000+ meme tokens from CoinGecko & CoinMarketCap
  const { data: memeTokens = [], isLoading, refetch } = useQuery({
    queryKey: ['memeTokensForSwap'],
    queryFn: fetchAllMemeTokens,
    refetchInterval: 60000, // Auto-refresh every 1 minute
    refetchOnWindowFocus: true,
    retry: 3, // Retry up to 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    enabled: isOpen,
  });

  // Filter by search and pin SOL/BNB/ETH first because meme pairs are commonly against them
  const filteredTokens = useMemo(() => {
    const searchTerm = search.toLowerCase();
    const filtered = memeTokens.filter((token) => {
      if (!token?.symbol) return false;
      const symbol = token.symbol.toLowerCase();
      const name = (token.name || '').toLowerCase();
      const searchableAddress = (token.address || '').toLowerCase();
      return (
        symbol.includes(searchTerm) ||
        name.includes(searchTerm) ||
        searchableAddress.includes(searchTerm)
      );
    });

    return filtered.sort((a, b) => {
      const aAddr = String(a?.address || '').toLowerCase();
      const bAddr = String(b?.address || '').toLowerCase();
      if (aAddr === DOLPHIN_PRIORITY_ADDRESS && bAddr !== DOLPHIN_PRIORITY_ADDRESS) return -1;
      if (bAddr === DOLPHIN_PRIORITY_ADDRESS && aAddr !== DOLPHIN_PRIORITY_ADDRESS) return 1;

      const aIdx = PRIORITY_TOKENS.indexOf((a.symbol || '').toUpperCase());
      const bIdx = PRIORITY_TOKENS.indexOf((b.symbol || '').toUpperCase());
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return (b.market_cap || 0) - (a.market_cap || 0);
    });
  }, [memeTokens, search]);

  const handleSelect = (token) => {
    onSelect({
      symbol: token.symbol,
      name: token.name,
      logo: token.logo_url,
      address: token.address,
      price: token.price_usd,
    });
    onClose();
    setSearch('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Meme Token</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search token or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 rounded-lg h-10"
          />
        </div>

        {/* Token List */}
        <div className="overflow-y-auto flex-1 space-y-2 mt-4">
          {isLoading ? (
            <p className="text-center text-gray-400 py-8">Loading meme tokens...</p>
          ) : filteredTokens.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No tokens found</p>
          ) : (
            filteredTokens.map((token) => (
              <button
                key={token.symbol + token.address}
                onClick={() => handleSelect(token)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors ${
                  selectedToken?.symbol === token.symbol ? 'bg-white/10 border border-cyan-500/30' : 'border border-white/5'
                }`}
              >
                <img
                  src={token.logo_url}
                  alt={token.symbol}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{token.symbol}</p>
                  <p className="text-xs text-gray-400">{token.name}</p>
                  {token.address && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <span className="font-mono bg-white/5 px-2 py-0.5 rounded">{token.address.slice(0, 8)}...{token.address.slice(-6)}</span>
                      <Copy 
                        className="w-3 h-3 cursor-pointer hover:text-cyan-400 transition-colors" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(token.address);
                          toast.success('Address copied');
                        }} 
                      />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${token.price_usd?.toFixed(6) || '-'}</p>
                  <p className={`text-xs ${token.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h?.toFixed(2) || 0}%
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

