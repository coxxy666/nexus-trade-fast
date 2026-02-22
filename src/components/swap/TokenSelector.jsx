import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import VerifiedBadge from '@/components/verification/VerifiedBadge';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';

export default function TokenSelector({ isOpen, onClose, onSelect, selectedToken }) {
  const [search, setSearch] = useState('');
  const [verifications, setVerifications] = useState({});

  // Fetch listed tokens from database
  const { data: listedTokens = [] } = useQuery({
    queryKey: ['listedTokens'],
    queryFn: async () => {
      const allTokens = await appClient.entities.Token.list();
      return allTokens.filter(t => t.is_listed).map(t => ({
        symbol: t.symbol,
        name: t.name,
        logo: t.logo_url || `https://ui-avatars.com/api/?name=${t.symbol}&background=random`,
      }));
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      fetchVerifications();
    }
  }, [isOpen]);

  const fetchVerifications = async () => {
    try {
      const allVerifications = await appClient.entities.TokenVerification.list();
      const verificationMap = {};
      allVerifications.forEach(v => {
        verificationMap[v.token_symbol] = v;
      });
      setVerifications(verificationMap);
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
    }
  };

  const filteredTokens = listedTokens.filter(
    token =>
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Select Token</DialogTitle>
        </DialogHeader>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search by name or symbol"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl h-12"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {listedTokens.slice(0, 4).map((token) => (
            <button
              key={token.symbol}
              onClick={() => {
                onSelect(token);
                onClose();
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                selectedToken?.symbol === token.symbol
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              )}
            >
              <img src={token.logo} alt={token.symbol} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-medium">{token.symbol}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-1 max-h-64 overflow-y-auto">
          {filteredTokens.map((token) => {
            const verification = verifications[token.symbol];
            return (
              <button
                key={token.symbol}
                onClick={() => {
                  onSelect(token);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all",
                  selectedToken?.symbol === token.symbol
                    ? "bg-cyan-500/10 border border-cyan-500/30"
                    : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <img src={token.logo} alt={token.symbol} className="w-10 h-10 rounded-full" />
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{token.symbol}</p>
                      {verification?.is_verified && (
                        <VerifiedBadge verified={true} size="sm" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{token.name}</p>
                  </div>
                </div>
                {selectedToken?.symbol === token.symbol && (
                  <Check className="w-5 h-5 text-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
