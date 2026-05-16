import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Search, Send, TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMemeTokens } from '@/components/services/useMemeTokens';
import TokenDetailModal from '@/components/memeai/TokenDetailModal';
import MemeTokenChat from '@/components/memeai/MemeTokenChat';
import { resolveTokensFromMarketSources } from '@/components/memeai/technicalIndicators';

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!amount) return '$0';
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

function formatPrice(value) {
  const amount = Number(value || 0);
  if (!amount) return '$0.00';
  return amount >= 1 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(8)}`;
}

function getChainMeta(network) {
  const key = String(network || '').toLowerCase();
  if (key === 'solana') return { label: 'Solana', logo: 'S' };
  if (key === 'bsc' || key === 'binance-smart-chain') return { label: 'BSC', logo: 'B' };
  if (key === 'ethereum' || key === 'eth') return { label: 'Ethereum', logo: 'E' };
  return { label: 'Multi', logo: 'M' };
}

function getTokenKey(token) {
  return String(token?.address || token?.symbol || token?.name || '').toLowerCase();
}

function formatTokenSource(token) {
  const source = String(token?.source || '').toLowerCase();
  if (source === 'coingecko') return 'CoinGecko';
  if (source === 'coinmarketcap') return 'CoinMarketCap';
  return 'Board';
}

function getTokenImage(token) {
  return String(token?.logo_url || token?.logo || '').trim();
}

function TokenImage({ token, className = 'h-11 w-11' }) {
  const image = getTokenImage(token);
  if (image) {
    return <img src={image} alt={token?.symbol || token?.name || 'token'} className={`${className} rounded-full object-cover`} />;
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-slate-200`}>
      {String(token?.symbol || token?.name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

function normalizeTokenText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractTokenSearchTerms(value) {
  const stopWords = new Set([
    'what', 'whats', 'is', 'the', 'a', 'an', 'about', 'show', 'me', 'tell', 'give', 'for', 'on', 'of', 'to', 'from',
    'token', 'coin', 'meme', 'chat', 'risk', 'risky', 'price', 'setup', 'technical', 'technicals', 'address', 'contract',
    'smart', 'mint', 'holders', 'holder', 'tax', 'lock', 'locked', 'honeypot', 'sentiment', 'news', 'analysis', 'check',
    'social', 'socials', 'media', 'community', 'website', 'site', 'link', 'links', 'explorer', 'explorers',
    'prediction', 'predict', 'forecast', 'outlook', 'target', 'targets', 'bullish', 'bearish', 'momentum', 'entry', 'buy',
    'trade', 'trading', 'long', 'short', 'view', 'summary', 'overview', 'how', 'does', 'look', 'like', 'this', 'that', 'it', 'please'
  ]);
  return normalizeTokenText(value)
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word) && word.length >= 2);
}

function isHeroAddressQuestion(value) {
  const normalized = normalizeTokenText(value);
  return ['address', 'contract', 'mint', 'smart', 'ca'].some((word) => normalized.split(/\s+/).includes(word));
}

function extractAddressFromPrompt(value) {
  const raw = String(value || '').trim();
  const evmMatch = raw.match(/0x[a-fA-F0-9]{40}/);
  if (evmMatch) return evmMatch[0];
  const solanaMatch = raw.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  if (solanaMatch) return solanaMatch[0];
  return '';
}

function isDirectAddressLookup(value) {
  const raw = String(value || '').trim();
  const extracted = extractAddressFromPrompt(raw);
  if (!extracted) return false;
  const normalized = normalizeTokenText(raw);
  const normalizedExtracted = normalizeTokenText(extracted);
  return normalized === normalizedExtracted;
}

function getHeroEntityQuery(prompt) {
  const extractedAddress = extractAddressFromPrompt(prompt);
  if (extractedAddress) return normalizeTokenText(extractedAddress);
  const terms = extractTokenSearchTerms(prompt);
  return terms.join(' ').trim();
}

function findExactHeroTokenMatches(prompt, tokens) {
  const entityQuery = getHeroEntityQuery(prompt);
  if (!entityQuery) return [];

  return [...(Array.isArray(tokens) ? tokens : [])].filter((token) => {
    const symbol = normalizeTokenText(token?.symbol);
    const name = normalizeTokenText(token?.name);
    const address = normalizeTokenText(token?.address);
    return entityQuery === symbol || entityQuery === name || (address && entityQuery === address);
  });
}

function mergeHeroTokenRecords(baseToken, incomingToken) {
  const merged = { ...baseToken, ...incomingToken };
  merged.address = String(incomingToken?.address || '').trim() || String(baseToken?.address || '').trim();
  merged.contractAddress = String(incomingToken?.contractAddress || '').trim() || String(baseToken?.contractAddress || '').trim() || merged.address;
  merged.mintAddress = String(incomingToken?.mintAddress || '').trim() || String(baseToken?.mintAddress || '').trim() || merged.address;
  merged.network = String(incomingToken?.network || '').trim() || String(baseToken?.network || '').trim();
  merged.chain = String(incomingToken?.chain || '').trim() || String(baseToken?.chain || '').trim() || merged.network;
  merged.logo_url = String(incomingToken?.logo_url || '').trim() || String(baseToken?.logo_url || '').trim();
  merged.logo = String(incomingToken?.logo || '').trim() || String(baseToken?.logo || '').trim() || merged.logo_url;
  return merged;
}

function rankHeroTokenForSelection(token, options = {}) {
  let score = 0;
  const preferAddress = Boolean(options?.preferAddress);
  if (String(token?.address || '').trim()) score += preferAddress ? 40 : 20;
  if (String(token?.source || '').toLowerCase() === 'coingecko') score += 8;
  if (String(token?.source || '').toLowerCase() === 'coinmarketcap') score += 6;
  score += Math.log10(Math.max(1, Number(token?.market_cap || 0) + 1)) * 10;
  score += Math.log10(Math.max(1, Number(token?.volume_24h || 0) + 1)) * 4;
  return score;
}

function dedupeHeroMatches(tokens = [], options = {}) {
  const byIdentity = new Map();
  for (const token of tokens) {
    const identityKey = `${normalizeTokenText(token?.symbol)}::${normalizeTokenText(token?.name)}`;
    const current = byIdentity.get(identityKey);
    if (!current || rankHeroTokenForSelection(token, options) > rankHeroTokenForSelection(current, options)) {
      byIdentity.set(identityKey, current ? mergeHeroTokenRecords(current, token) : token);
    }
  }
  return [...byIdentity.values()];
}

function pickBestExactHeroToken(prompt, tokens = [], options = {}) {
  const entityQuery = getHeroEntityQuery(prompt);
  if (!entityQuery) return null;
  const deduped = dedupeHeroMatches(tokens, options);
  const exactSymbolMatches = deduped.filter((token) => normalizeTokenText(token?.symbol) === entityQuery);
  if (exactSymbolMatches.length) {
    return [...exactSymbolMatches].sort((a, b) => rankHeroTokenForSelection(b, options) - rankHeroTokenForSelection(a, options))[0];
  }
  const exactNameMatches = deduped.filter((token) => normalizeTokenText(token?.name) === entityQuery);
  if (exactNameMatches.length === 1) return exactNameMatches[0];
  return null;
}

function buildHeroPromptForToken(prompt, token) {
  const raw = String(prompt || '').trim();
  const normalizedPrompt = normalizeTokenText(raw);
  const normalizedSymbol = normalizeTokenText(token?.symbol);
  const normalizedName = normalizeTokenText(token?.name);
  const normalizedAddress = normalizeTokenText(token?.address);
  const intentWords = ['address', 'contract', 'mint', 'ca', 'risk', 'risky', 'setup', 'technical', 'technicals', 'sentiment', 'holders', 'holder', 'tax', 'lock', 'locked', 'honeypot', 'price', 'buy', 'entry', 'trade', 'overview', 'summary', 'social', 'socials', 'media', 'community', 'website', 'site', 'link', 'links', 'explorer', 'explorers'];
  const hasExplicitIntent = intentWords.some((word) => normalizedPrompt.split(/\s+/).includes(word));

  if (hasExplicitIntent) {
    return raw;
  }

  if (
    normalizedPrompt &&
    [normalizedSymbol, normalizedName, normalizedAddress].filter(Boolean).includes(normalizedPrompt)
  ) {
    return `Give me a quick overview of ${token.symbol}.`;
  }

  const searchTerms = extractTokenSearchTerms(raw);
  const tokenWords = new Set(`${normalizedSymbol} ${normalizedName}`.split(/\s+/).filter(Boolean));
  if (searchTerms.length && searchTerms.every((term) => tokenWords.has(term))) {
    return `Give me a quick overview of ${token.symbol}.`;
  }

  return raw;
}

function findHeroTokenMatches(prompt, tokens) {
  const raw = String(prompt || '').trim();
  const normalizedPrompt = normalizeTokenText(raw);
  const searchTerms = extractTokenSearchTerms(raw);
  const effectiveQuery = searchTerms.join(' ') || normalizedPrompt;

  if (!effectiveQuery) return [];

  return [...(Array.isArray(tokens) ? tokens : [])]
    .map((token) => {
      const symbol = normalizeTokenText(token?.symbol);
      const name = normalizeTokenText(token?.name);
      const address = normalizeTokenText(token?.address);
      const combined = `${symbol} ${name} ${address}`.trim();
      let score = 0;

      if (!combined) return null;
      if (effectiveQuery === symbol) score += 120;
      if (effectiveQuery === name) score += 110;
      if (effectiveQuery === address) score += 130;
      if (symbol.includes(effectiveQuery)) score += 80;
      if (name.includes(effectiveQuery)) score += 75;
      if (address && address.includes(effectiveQuery)) score += 90;

      if (searchTerms.length) {
        for (const term of searchTerms) {
          if (term === symbol) score += 70;
          else if (symbol.includes(term)) score += 45;
          if (name.split(/\s+/).includes(term)) score += 40;
          else if (name.includes(term)) score += 30;
          if (address && address.includes(term)) score += 35;
        }
      }

      return score > 0 ? { token, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.token?.market_cap || 0) - Number(a.token?.market_cap || 0);
    })
    .map((entry) => entry.token);
}

async function findHeroTokenMatchesWithMarketSources(prompt, tokens, selectedToken) {
  const exactLocalMatches = findExactHeroTokenMatches(prompt, tokens);
  const deduped = [];
  const seen = new Map();

  const getMergeKey = (token) => `${normalizeTokenText(token?.symbol)}::${normalizeTokenText(token?.name)}`;

  const scoreTokenRichness = (token) => rankHeroTokenForSelection(token);

  const pushUnique = (token) => {
    const key = getMergeKey(token);
    if (!key) return;
    const existingIndex = seen.get(key);
    if (existingIndex == null) {
      seen.set(key, deduped.length);
      deduped.push(token);
      return;
    }
    if (scoreTokenRichness(token) > scoreTokenRichness(deduped[existingIndex])) {
      deduped[existingIndex] = mergeHeroTokenRecords(deduped[existingIndex], token);
    }
  };

  exactLocalMatches.forEach(pushUnique);

  try {
    const liveMatches = await resolveTokensFromMarketSources(prompt, {
      preferredNetwork: selectedToken?.network || selectedToken?.chain || '',
      onlyMeme: true,
    });
    const exactLiveMatches = findExactHeroTokenMatches(prompt, liveMatches);
    if (exactLocalMatches.length || exactLiveMatches.length) {
      exactLiveMatches.forEach(pushUnique);
      return deduped;
    }

    findHeroTokenMatches(prompt, tokens).forEach(pushUnique);
    liveMatches.forEach(pushUnique);
  } catch {
    if (!exactLocalMatches.length) {
      findHeroTokenMatches(prompt, tokens).forEach(pushUnique);
    }
  }

  return deduped;
}

export default function MemeAI() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenDetail, setShowTokenDetail] = useState(false);
  const [heroPrompt, setHeroPrompt] = useState('');
  const [queuedPrompt, setQueuedPrompt] = useState('');
  const [heroExchange, setHeroExchange] = useState({ question: '', answer: '' });
  const [heroReplying, setHeroReplying] = useState(false);
  const [heroMatches, setHeroMatches] = useState([]);
  const [heroMatchPrompt, setHeroMatchPrompt] = useState('');
  const [pendingHeroRequest, setPendingHeroRequest] = useState(null);
  const { data: memeTokens = [], isLoading } = useMemeTokens();

  const filteredTokens = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return memeTokens;
    return memeTokens.filter((token) =>
      String(token?.symbol || '').toLowerCase().includes(query) ||
      String(token?.name || '').toLowerCase().includes(query)
    );
  }, [memeTokens, searchTerm]);

  const searchPreviewToken = useMemo(() => {
    if (!searchTerm.trim()) return null;
    return filteredTokens[0] || null;
  }, [filteredTokens, searchTerm]);

  const heroPreviewToken = useMemo(() => {
    const prompt = String(heroPrompt || '').trim();
    if (!prompt) return null;
    const matches = findHeroTokenMatches(prompt, memeTokens);
    return matches[0] || null;
  }, [heroPrompt, memeTokens]);


  useEffect(() => {
    if (!memeTokens.length) return;
    if (!selectedToken) {
      setSelectedToken(memeTokens[0]);
      return;
    }
    const next = memeTokens.find((token) => getTokenKey(token) === getTokenKey(selectedToken));
    if (next) setSelectedToken(next);
  }, [memeTokens, selectedToken]);

  useEffect(() => {
    if (!pendingHeroRequest || !selectedToken) return;
    if (getTokenKey(selectedToken) !== pendingHeroRequest.tokenKey) return;
    setQueuedPrompt(pendingHeroRequest.prompt);
    setPendingHeroRequest(null);
  }, [pendingHeroRequest, selectedToken]);

  const topMovers = useMemo(() => {
    return [...memeTokens]
      .sort((a, b) => Math.abs(Number(b?.price_change_24h || 0)) - Math.abs(Number(a?.price_change_24h || 0)))
      .slice(0, 3);
  }, [memeTokens]);

  const starterPrompts = [
    selectedToken ? `What is the setup on ${selectedToken.symbol}?` : 'What is the setup here?',
    selectedToken ? `How risky is ${selectedToken.symbol}?` : 'How risky is this token?',
    selectedToken ? `Show me the address for ${selectedToken.symbol}` : 'Show me the token address',
  ];
  const openTokenOverview = (token) => {
    if (!token) return;
    setSelectedToken(token);
    setShowTokenDetail(true);
  };


  const startHeroConversation = (token, prompt) => {
    const nextPrompt = buildHeroPromptForToken(prompt, token);
    setHeroExchange({ question: String(prompt || '').trim(), answer: '' });
    setHeroReplying(true);
    setHeroMatches([]);
    setHeroMatchPrompt('');
    setHeroPrompt('');

    if (getTokenKey(selectedToken) === getTokenKey(token)) {
      setQueuedPrompt(nextPrompt);
      return;
    }

    setPendingHeroRequest({
      tokenKey: getTokenKey(token),
      prompt: nextPrompt,
    });
    setSelectedToken(token);
  };

  const sendPromptToChat = async (prompt) => {
    const nextPrompt = String(prompt || '').trim();
    if (!nextPrompt) return;

    setHeroExchange({ question: nextPrompt, answer: '' });
    setHeroReplying(true);
    setHeroMatches([]);
    setHeroMatchPrompt('');

    const addressQuestion = isHeroAddressQuestion(nextPrompt);
    const directAddressLookup = isDirectAddressLookup(nextPrompt);
    const matches = dedupeHeroMatches(
      await findHeroTokenMatchesWithMarketSources(nextPrompt, memeTokens, selectedToken),
      { preferAddress: addressQuestion || directAddressLookup }
    );
    const exactMatch = pickBestExactHeroToken(nextPrompt, matches, { preferAddress: addressQuestion || directAddressLookup });
    if (exactMatch) {
      startHeroConversation(exactMatch, nextPrompt);
      return;
    }

    if (matches.length > 1) {
      const exactMatches = dedupeHeroMatches(findExactHeroTokenMatches(nextPrompt, matches), { preferAddress: addressQuestion });
      const rankedMatches = exactMatches.length ? exactMatches : matches;
      const lead = rankedMatches[0];
      const leadLabel = lead ? `${lead.symbol} (${lead.name})` : 'that token';
      const leadSource = lead ? formatTokenSource(lead) : '';
      setHeroExchange({
        question: nextPrompt,
        answer: `I found a few close meme-token matches. Most likely you mean ${leadLabel}${leadSource ? ` from ${leadSource}` : ''}. Pick below and I will continue with that token.`,
      });
      setHeroReplying(false);
      setHeroMatches(rankedMatches.slice(0, 8));
      setHeroMatchPrompt(nextPrompt);
      return;
    }

    if (matches.length === 1) {
      startHeroConversation(matches[0], nextPrompt);
      return;
    }

    if (addressQuestion || directAddressLookup) {
      setHeroExchange({
        question: nextPrompt,
        answer: directAddressLookup
          ? 'I could not resolve that contract or mint address to one meme token yet.'
          : 'I could not find one exact meme-token match for that address question yet. Try the symbol exactly as listed on the board.',
      });
      setHeroReplying(false);
      setHeroMatches([]);
      setHeroMatchPrompt('');
      return;
    }

    if (!selectedToken) {
      setHeroExchange({
        question: nextPrompt,
        answer: 'I could not match that prompt to a token on the board or live market sources yet. Try a symbol or token name like TRUMP, BONK, or PEPE.',
      });
      setHeroReplying(false);
      setHeroMatches([]);
      setHeroMatchPrompt('');
      return;
    }

    startHeroConversation(selectedToken, nextPrompt);
  };

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,20,35,0.96),rgba(10,24,28,0.96))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 text-cyan-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-cyan-500/20">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <Badge className="border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">MemeAI</Badge>
            </div>

            <div className="w-full">
              <div className="rounded-[28px] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(14,24,39,0.94),rgba(9,16,29,0.94))] p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
                <div className="flex items-center gap-2 text-sm text-cyan-200">
                  <Brain className="h-4 w-4" />
                  <span className="font-semibold">Start chatting with MemeAI</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Type a token name, symbol, or paste a contract or mint address here. If there is one clear match, I will open it. If there are several, I will let you pick.
                </p>
                <div className="mt-5 flex gap-3">
                  <div className="flex-1 space-y-3">
                  <Input
                    value={heroPrompt}
                    onChange={(e) => setHeroPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendPromptToChat(heroPrompt);
                      }
                    }}
                    placeholder="Ask MemeAI about any token on the board..."
                    className="h-13 min-h-[56px] border-white/10 bg-white/5 text-base text-white placeholder:text-slate-500"
                  />
                  {heroPreviewToken && (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openTokenOverview(heroPreviewToken)}
                        className="rounded-full transition hover:scale-[1.03]"
                        aria-label={`Open ${heroPreviewToken.symbol} overview`}
                      >
                        <TokenImage token={heroPreviewToken} className="h-12 w-12" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{heroPreviewToken.symbol} - {heroPreviewToken.name}</p>
                        <p className="truncate text-xs text-slate-400">Best related match while typing</p>
                      </div>
                      <Badge className="border border-white/10 bg-white/5 text-slate-200">{getChainMeta(heroPreviewToken.network).label}</Badge>
                    </div>
                  )}
                </div>
                  <Button
                    type="button"
                    onClick={() => sendPromptToChat(heroPrompt)}
                    disabled={!heroPrompt.trim()}
                    className="h-13 min-h-[56px] px-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendPromptToChat(prompt)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                {(heroExchange.question || heroReplying) && (
                  <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">You</p>
                      <p className="mt-1 text-sm leading-6 text-white">{heroExchange.question}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">MemeAI</p>
                      <p className="mt-1 text-sm leading-6 text-slate-200">
                        {heroReplying ? 'Preparing a reply...' : (heroExchange.answer || 'No reply yet.')}
                      </p>
                    </div>
                  </div>
                )}
                {heroMatches.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">Pick a token</p>
                    <p className="mt-2 text-sm text-slate-200">
                      Matching tokens for <span className="font-semibold text-white">{heroMatchPrompt}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {heroMatches.map((token, index) => (
                        <button
                          key={`${getTokenKey(token)}-${index}`}
                          type="button"
                          onClick={() => startHeroConversation(token, heroMatchPrompt)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                        >
                          {token.symbol} - {token.name} - {formatTokenSource(token)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {topMovers.map((token, index) => (
            <motion.button
              key={`${token.symbol}-${token.address || index}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              type="button"
              onClick={() => setSelectedToken(token)}
              className="rounded-[26px] border border-white/10 bg-white/5 p-5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <TokenImage token={token} className="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{token.symbol}</p>
                    <p className="truncate text-xs text-slate-400">{token.name}</p>
                  </div>
                </div>
                <Badge className="border border-white/10 bg-white/5 text-slate-200">
                  {getChainMeta(token.network).label}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-400">24h move</span>
                <span className={`flex items-center gap-1 font-semibold ${Number(token.price_change_24h || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {Number(token.price_change_24h || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Number(token.price_change_24h || 0) >= 0 ? '+' : ''}{Number(token.price_change_24h || 0).toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Market cap</span>
                <span className="font-semibold text-white">{formatMoney(token.market_cap)}</span>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex h-full min-h-[960px] flex-col rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,23,0.96),rgba(10,17,32,0.96))] p-5"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <div className="space-y-3">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search meme tokens..."
                className="h-12 border-white/10 bg-white/5 pl-12 text-white placeholder:text-slate-500"
              />
              {searchPreviewToken && (
                <button
                  type="button"
                  onClick={() => setSelectedToken(searchPreviewToken)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTokenOverview(searchPreviewToken);
                    }}
                    className="rounded-full transition hover:scale-[1.03]"
                    aria-label={`Open ${searchPreviewToken.symbol} overview`}
                  >
                    <TokenImage token={searchPreviewToken} className="h-12 w-12" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{searchPreviewToken.symbol} - {searchPreviewToken.name}</p>
                    <p className="truncate text-xs text-slate-400">Top related result</p>
                  </div>
                  <Badge className="border border-white/10 bg-white/5 text-slate-200">{getChainMeta(searchPreviewToken.network).label}</Badge>
                </button>
              )}
            </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Tokens</p>
              <p className="text-xs text-slate-500">{filteredTokens.length} shown</p>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">Loading meme tokens...</div>
              ) : filteredTokens.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No tokens matched your search.</div>
              ) : (
                filteredTokens.map((token, idx) => {
                  const selected = getTokenKey(token) === getTokenKey(selectedToken);
                  return (
                    <button
                      key={`${token.symbol}-${token.address || idx}`}
                      type="button"
                      onClick={() => setSelectedToken(token)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${selected ? 'border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'}`}
                    >
                      <div className="flex items-center gap-3">
                        <TokenImage token={token} className="h-11 w-11" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-white">{token.symbol}</p>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                              {getChainMeta(token.network).logo}
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate-400">{token.name}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-500">Price</p>
                          <p className="mt-1 font-medium text-white">{formatPrice(token.price_usd)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">24h</p>
                          <p className={`mt-1 font-medium ${Number(token.price_change_24h || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                            {Number(token.price_change_24h || 0) >= 0 ? '+' : ''}{Number(token.price_change_24h || 0).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Liquidity</p>
                          <p className="mt-1 font-medium text-white">{formatMoney(token.liquidity)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Mcap</p>
                          <p className="mt-1 font-medium text-white">{formatMoney(token.market_cap)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <MemeTokenChat
              token={selectedToken}
              availableTokens={memeTokens}
              queuedPrompt={queuedPrompt}
              onQueuedPromptHandled={() => setQueuedPrompt('')}
              onQueuedPromptResult={(exchange) => {
                setHeroExchange(exchange || { question: '', answer: '' });
                setHeroReplying(false);
              }}
              onRequestTokenChange={(nextToken, prompt) => {
                if (!nextToken) return;
                setPendingHeroRequest({ tokenKey: getTokenKey(nextToken), prompt: String(prompt || '').trim() });
                setSelectedToken(nextToken);
              }}
              onOpenLegacyAnalysis={() => setShowTokenDetail(true)}
            />
          </motion.section>
        </div>

        <TokenDetailModal
          token={selectedToken}
          isOpen={showTokenDetail}
          onClose={() => setShowTokenDetail(false)}
        />
      </div>
    </div>
  );
}
