import React, { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/apiUrl';
import { Loader2, CheckCircle2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function RateComparison({ 
  fromChain, 
  toChain, 
  fromToken, 
  toToken, 
  amount,
  onSelectRoute,
  isOpen 
}) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    if (!isOpen || !amount || !fromToken?.address || !toToken?.address) return;

    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl('/api/rate-comparison'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          fromChain,
          toChain,
          fromToken: fromToken.address || fromToken.symbol,
          toToken: toToken.address || toToken.symbol,
          amount: (parseFloat(amount) * 1e6).toString(),
          }),
        });
        const data = await response.json();

        if (data?.allQuotes) {
          setQuotes(data.allQuotes);
          setSelectedProvider(data.best.provider);
        }
      } catch (error) {
        console.error('Failed to fetch rate comparison:', error);
        toast.error('Failed to fetch rates');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [isOpen, amount, fromToken?.address, toToken?.address, fromChain, toChain]);

  if (!isOpen) return null;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 mt-4">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyan-400" />
        Best Swap Rates
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : quotes.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">No quotes available</p>
      ) : (
        <div className="space-y-2">
          {quotes.map((quote, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedProvider(quote.provider);
                onSelectRoute?.(quote);
              }}
              className={`w-full p-4 rounded-xl border transition-all text-left ${
                selectedProvider === quote.provider
                  ? 'bg-cyan-500/20 border-cyan-500/50'
                  : 'bg-white/5 border-white/10 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {selectedProvider === quote.provider && (
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  )}
                  <span className="font-semibold">{quote.provider}</span>
                </div>
                <span className="text-cyan-400 font-bold">
                  {(parseFloat(quote.outputAmount) / 1e6).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{quote.route}</span>
                <span>~{Math.ceil(quote.estimatedTime / 60)}min</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

