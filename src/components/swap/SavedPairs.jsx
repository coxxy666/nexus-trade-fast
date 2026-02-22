import React, { useState, useEffect } from 'react';
import { Star, X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function SavedPairs({ fromToken, toToken, onSelectPair }) {
  const [savedPairs, setSavedPairs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved pairs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('savedTokenPairs');
    if (stored) {
      try {
        setSavedPairs(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load saved pairs:', e);
      }
    }
  }, []);

  const savePair = () => {
    if (!fromToken || !toToken) return;

    const newPair = {
      id: `${fromToken.symbol}-${toToken.symbol}`,
      fromToken,
      toToken,
      timestamp: Date.now()
    };

    // Check if pair already exists
    const exists = savedPairs.some(p => p.id === newPair.id);
    if (exists) return;

    const updated = [newPair, ...savedPairs].slice(0, 5); // Keep only 5 most recent
    setSavedPairs(updated);
    localStorage.setItem('savedTokenPairs', JSON.stringify(updated));
  };

  const removePair = (id) => {
    const updated = savedPairs.filter(p => p.id !== id);
    setSavedPairs(updated);
    localStorage.setItem('savedTokenPairs', JSON.stringify(updated));
  };

  const isPairSaved = savedPairs.some(p => p.id === `${fromToken?.symbol}-${toToken?.symbol}`);

  return (
    <div className="mt-4 space-y-2">
      {/* Save Current Pair Button */}
      {fromToken && toToken && (
        <Button
          onClick={savePair}
          disabled={isPairSaved}
          variant="outline"
          className={`w-full ${isPairSaved ? 'opacity-50' : ''}`}
        >
          <Star className="w-4 h-4 mr-2" fill={isPairSaved ? 'currentColor' : 'none'} />
          {isPairSaved ? 'Pair Saved' : 'Save Pair'}
        </Button>
      )}

      {/* Saved Pairs List */}
      {savedPairs.length > 0 && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-gray-300"
          >
            <div className="flex items-center justify-between">
              <span>Frequently Used ({savedPairs.length})</span>
              <span className={`text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </button>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2"
            >
              {savedPairs.map((pair) => (
                <motion.button
                  key={pair.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPair(pair.fromToken, pair.toToken)}
                  className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-1">
                        <img 
                          src={pair.fromToken.logo} 
                          alt={pair.fromToken.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-sm font-semibold text-white">{pair.fromToken.symbol}</span>
                      </div>
                      <span className="text-gray-500 text-xs">→</span>
                      <div className="flex items-center gap-1">
                        <img 
                          src={pair.toToken.logo} 
                          alt={pair.toToken.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-sm font-semibold text-white">{pair.toToken.symbol}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePair(pair.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
