import React, { useState, useEffect } from 'react';
import { ArrowDown, Settings, Info, Loader2, AlertCircle, ExternalLink, Copy, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import MemeTokenSelector from './MemeTokenSelector';
import SwapSettings from './SwapSettings';
import NetworkSelector from './NetworkSelector';
import NetworkBalances from './NetworkBalances';
import CrossChainNetworkSelector from './CrossChainNetworkSelector';
import CrossChainSwapDetails from './CrossChainSwapDetails';
import CrossChainSwapStatus from './CrossChainSwapStatus';
import TransactionMonitor from './TransactionMonitor';
import RateComparison from './RateComparison';
import SwapPathOptimizer from './SwapPathOptimizer';
import PriceChart from './PriceChart';
import FeeBreakdown from './FeeBreakdown';
import SavedPairs from './SavedPairs';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWallet } from '@/components/WalletContext';
import { useMemeTokens } from '@/components/services/useMemeTokens';
import { createLocalTransaction, updateLocalTransaction } from '@/lib/localTransactions';
import { listLocalPools, updateLocalPool } from '@/lib/localPools';
import { apiUrl } from '@/lib/apiUrl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function SwapCard({ onSwapDataChange }) {
   const PLATFORM_FEE_PERCENT = 0.5;
   const PLATFORM_FEE_RATE = PLATFORM_FEE_PERCENT / 100;
   const { selectedNetwork, accountBalances, account, walletType, connectWallet, isConnecting, wcProvider } = useWallet();
   const evmConnectType = 'bnb';
   const [fromToken, setFromToken] = useState(null);
   const [toToken, setToToken] = useState(null);
   const [fromAmount, setFromAmount] = useState('');
   const [toAmount, setToAmount] = useState('');
   const [selectingFor, setSelectingFor] = useState(null);
   const [isSwapping, setIsSwapping] = useState(false);
   const [exchangeRate, setExchangeRate] = useState(0);
   const [swapQuote, setSwapQuote] = useState(null);
   const [priceImpact, setPriceImpact] = useState(0);
   const [networkFee, setNetworkFee] = useState(0);
   const [showSettings, setShowSettings] = useState(false);
   const [settings, setSettings] = useState({ slippage: 0.5, gasSpeed: 'standard' });
   const [toNetwork, setToNetwork] = useState(selectedNetwork);
   const [crossChainEstimate, setCrossChainEstimate] = useState(null);
   const [showCrossChainStatus, setShowCrossChainStatus] = useState(false);
   const [crossChainTxHash, setCrossChainTxHash] = useState(null);
   const [txHash, setTxHash] = useState(null);
   const [txLoading, setTxLoading] = useState(null);
   const [showRateComparison, setShowRateComparison] = useState(false);
   const [selectedRoute, setSelectedRoute] = useState(null);
   const [swapError, setSwapError] = useState('');
   const [activeTxRecordId, setActiveTxRecordId] = useState(null);
   const [showConnectModal, setShowConnectModal] = useState(false);
   const queryClient = useQueryClient();
  
  const isCrossChain = selectedNetwork !== toNetwork;
  
  const networkMap = {
    'bsc': 'bsc',
    'solana': 'solana'
  };

  // Fetch all meme tokens from shared cache
  const { data: memeTokens = [] } = useMemeTokens();
  const DOLPHIN_PRIORITY_ADDRESS = 'D4cEQyPyc6idbmsgmv4dycFxygyK2DzdUamfWmUuJmt9'.toLowerCase();
  const PRIORITY_TOKENS = ['SOL', 'BNB', 'ETH'];
  const isEvmAddress = React.useCallback((address) => /^0x[a-fA-F0-9]{40}$/.test(address || ''), []);
  const isSolanaAddress = React.useCallback((address) => {
    if (!address || typeof address !== 'string') return false;
    if (address.startsWith('0x')) return false;
    return address.length >= 32 && address.length <= 44;
  }, []);
  const getSolanaTokenDecimals = React.useCallback((token) => {
    const symbol = (token?.symbol || '').toUpperCase();
    if (symbol === 'SOL') return 9;
    if (symbol === 'BONK') return 5;
    if (symbol === 'WIF') return 6;
    if (symbol === 'USDC' || symbol === 'USDT') return 6;
    return 6;
  }, []);
  const resolveAddressForChain = React.useCallback((token, chain) => {
    const address = token?.address || '';
    if (chain === 'solana' && isSolanaAddress(address)) return address;
    if ((chain === 'bsc' || chain === 'ethereum') && isEvmAddress(address)) return address;

    const symbol = (token?.symbol || '').toUpperCase();
    const name = (token?.name || '').toLowerCase().trim();
    if (!symbol) return '';
    const symbolMatches = memeTokens.filter((t) => (t?.symbol || '').toUpperCase() === symbol);
    const nameMatches = name
      ? memeTokens.filter((t) => (t?.name || '').toLowerCase().trim() === name)
      : [];
    const matches = [...symbolMatches, ...nameMatches];
    const byChain = matches.find((t) => {
      const addr = t?.address || '';
      return chain === 'solana' ? isSolanaAddress(addr) : isEvmAddress(addr);
    });
    return byChain?.address || '';
  }, [memeTokens, isEvmAddress, isSolanaAddress]);

  const swappableMemeTokens = React.useMemo(() => {
    const valid = memeTokens.filter((t) => t?.symbol && t?.address);

    return valid.sort((a, b) => {
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
  }, [memeTokens]);
  const normalizeToken = React.useCallback((token) => ({
    symbol: token.symbol,
    name: token.name,
    logo: token.logo || token.logo_url,
    address: token.address,
    price_usd: token.price_usd || token.price || 0,
    price: token.price_usd || token.price || 0,
  }), []);

  // Initialize tokens once data loads
  React.useEffect(() => {
    if (swappableMemeTokens.length > 0 && !fromToken) {
      let preferredToToken = null;
      try {
        const raw = sessionStorage.getItem('nexus_swap_target_token');
        if (raw) {
          const parsed = JSON.parse(raw);
          const preferredAddress = String(parsed?.address || '').toLowerCase();
          const preferredSymbol = String(parsed?.symbol || '').toUpperCase();

          preferredToToken = swappableMemeTokens.find((t) => {
            const addr = String(t?.address || '').toLowerCase();
            const sym = String(t?.symbol || '').toUpperCase();
            return (preferredAddress && addr === preferredAddress) || (preferredSymbol && sym === preferredSymbol);
          }) || null;

          sessionStorage.removeItem('nexus_swap_target_token');
        }
      } catch {
        // ignore malformed storage payload
      }

      const sol = swappableMemeTokens.find((t) => (t.symbol || '').toUpperCase() === 'SOL');
      const bnb = swappableMemeTokens.find((t) => (t.symbol || '').toUpperCase() === 'BNB');
      const eth = swappableMemeTokens.find((t) => (t.symbol || '').toUpperCase() === 'ETH');
      const dolphin = swappableMemeTokens.find((t) => String(t?.address || '').toLowerCase() === DOLPHIN_PRIORITY_ADDRESS);
      const defaultFrom = sol || bnb || eth || swappableMemeTokens[0];
      const first = preferredToToken && defaultFrom?.symbol === preferredToToken?.symbol
        ? (swappableMemeTokens.find((t) => (t.symbol || '').toUpperCase() !== (preferredToToken.symbol || '').toUpperCase()) || defaultFrom)
        : defaultFrom;
      const secondCandidate = preferredToToken || dolphin || bnb || eth || swappableMemeTokens[1] || swappableMemeTokens[0];
      const second = String(first?.address || '').toLowerCase() === String(secondCandidate?.address || '').toLowerCase()
        ? (swappableMemeTokens.find((t) => String(t?.address || '').toLowerCase() !== String(first?.address || '').toLowerCase()) || secondCandidate)
        : secondCandidate;
      setFromToken(normalizeToken(first));
      setToToken(normalizeToken(second));
    }
  }, [swappableMemeTokens, fromToken, normalizeToken]);

  // Fetch user's actual holdings
  const { data: userHoldings = [] } = useQuery({
    queryKey: ['userHoldings'],
    queryFn: async () => [],
    enabled: false,
    refetchInterval: false,
  });

  const { data: liquidityPools = [] } = useQuery({
    queryKey: ['liquidityPools'],
    queryFn: async () => {
      return listLocalPools();
    },
    refetchInterval: 30000,
  });

  const poolQuote = React.useMemo(() => {
    if (isCrossChain || !fromToken || !toToken || !fromAmount) return null;
    const amountIn = Number(fromAmount);
    if (!Number.isFinite(amountIn) || amountIn <= 0) return null;

    const fromSymbol = String(fromToken?.symbol || '').toUpperCase();
    const toSymbol = String(toToken?.symbol || '').toUpperCase();
    const fromAddress = String(fromToken?.address || '').toLowerCase();
    const toAddress = String(toToken?.address || '').toLowerCase();
    if (!fromSymbol || !toSymbol || fromSymbol === toSymbol) return null;

    const pool = liquidityPools.find((p) => {
      const a = String(p?.token_a || '').toUpperCase();
      const b = String(p?.token_b || '').toUpperCase();
      const aAddr = String(p?.token_a_address || '').toLowerCase();
      const bAddr = String(p?.token_b_address || '').toLowerCase();
      const addressMatch =
        fromAddress &&
        toAddress &&
        ((aAddr === fromAddress && bAddr === toAddress) || (aAddr === toAddress && bAddr === fromAddress));
      if (addressMatch) return true;
      return (a === fromSymbol && b === toSymbol) || (a === toSymbol && b === fromSymbol);
    });
    if (!pool) return null;

    const tokenA = String(pool.token_a || '').toUpperCase();
    const reserveA = Number(pool.token_a_amount || 0);
    const reserveB = Number(pool.token_b_amount || 0);
    const feeRate = Math.max(0, Number(pool.fee_tier || 0) / 100);

    const isAToB = tokenA === fromSymbol;
    const reserveIn = isAToB ? reserveA : reserveB;
    const reserveOut = isAToB ? reserveB : reserveA;
    if (!(reserveIn > 0) || !(reserveOut > 0)) return null;

    const amountInAfterFee = amountIn * (1 - feeRate);
    if (!(amountInAfterFee > 0)) return null;
    const amountOut = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);
    if (!(amountOut > 0)) return null;

    return {
      pool,
      amountOut,
      feeRate,
      route: `${String(pool.token_a || '').toUpperCase()}/${String(pool.token_b || '').toUpperCase()}`,
    };
  }, [liquidityPools, isCrossChain, fromToken, toToken, fromAmount]);

  // Fetch cross-chain swap estimate
  useEffect(() => {
    const fetchCrossChainEstimate = async () => {
      if (!isCrossChain || !fromAmount || !fromToken?.address || !toToken?.address) {
        setCrossChainEstimate(null);
        return;
      }

      try {
        setTxLoading('Getting bridge quote...');
        const response = await fetch(apiUrl('/api/cross-chain-swap'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromChain: selectedNetwork,
            toChain: toNetwork,
            fromToken: fromToken.address || fromToken.symbol,
            toToken: toToken.address || toToken.symbol,
            amount: (parseFloat(fromAmount) * 1e6).toString()
          })
        });
        const data = await response.json();

        if (data?.success) {
          setToAmount((parseFloat(data.toAmount) / 1e6).toFixed(6));
          setExchangeRate(parseFloat(data.exchangeRate || 0));
          setPriceImpact(parseFloat(data.priceImpact || 0));
          setCrossChainEstimate(data);
        }
      } catch (error) {
        console.error('Cross-chain estimate error:', error);
        // Fallback to simple calculation
        const rate = (fromToken.price_usd || 1) / (toToken.price_usd || 1);
        setToAmount((parseFloat(fromAmount) * rate).toFixed(6));
        setExchangeRate(rate);
      } finally {
        setTxLoading(null);
      }
    };

    if (!isCrossChain) return;
    const timeout = setTimeout(fetchCrossChainEstimate, 500);
    return () => clearTimeout(timeout);
  }, [isCrossChain, fromAmount, fromToken?.address, toToken?.address, selectedNetwork, toNetwork]);

  // Calculate swap quote based on token prices
  useEffect(() => {
    if (isCrossChain || !fromAmount || !fromToken || !toToken) {
      setSwapQuote(null);
      setToAmount('');
      return;
    }

    if (poolQuote) {
      const fromTokenPrice = fromToken.price_usd || fromToken.price || 0;
      const toTokenPrice = toToken.price_usd || toToken.price || 0;
      const outAmount = Number(poolQuote.amountOut);
      setToAmount(outAmount.toFixed(6));
      setExchangeRate(outAmount / Number(fromAmount || 1));
      setPriceImpact(0);
      setNetworkFee(0);
      setSwapQuote({
        success: true,
        protocols: [`Pool ${poolQuote.route}`],
        liquidity: 'Internal',
        fromUsd: Number(fromAmount || 0) * Number(fromTokenPrice || 0),
        toUsd: outAmount * Number(toTokenPrice || 0),
      });
      return;
    }

    // Get prices from either price_usd or price field
    const fromTokenPrice = fromToken.price_usd || fromToken.price || 1;
    const toTokenPrice = toToken.price_usd || toToken.price || 1;

    if (fromTokenPrice <= 0 || toTokenPrice <= 0) {
      setToAmount('');
      return;
    }

    const rate = fromTokenPrice / toTokenPrice;
    const calculated = (parseFloat(fromAmount) * rate).toFixed(6);

    setToAmount(calculated);
    setExchangeRate(rate);
    setPriceImpact(0.5);
    setNetworkFee(0);
    setSwapQuote({ success: true });
  }, [isCrossChain, fromAmount, fromToken, toToken, poolQuote]);

  const handleFromAmountChange = (value) => {
    setFromAmount(value);
  };

  // Get token balances from wallet account or user holdings
  const getTokenBalance = (symbol, tokenAddress = '') => {
    const key = String(symbol || '').toUpperCase();
    const normalizedSymbol =
      key === 'WBNB' ? 'BNB' :
      key === 'WETH' ? 'ETH' :
      key === 'WSOL' ? 'SOL' :
      key;

    // For token contracts/mints, prefer address-based balances when available.
    const addr = String(tokenAddress || '').trim();
    if (addr && accountBalances && accountBalances.tokenByAddress && typeof accountBalances.tokenByAddress === 'object') {
      const exact = accountBalances.tokenByAddress[addr];
      if (exact !== undefined) {
        return Number(exact || 0).toFixed(6);
      }
      const addrLower = addr.toLowerCase();
      const matchedKey = Object.keys(accountBalances.tokenByAddress).find((k) => String(k || '').toLowerCase() === addrLower);
      if (matchedKey) {
        return Number(accountBalances.tokenByAddress[matchedKey] || 0).toFixed(6);
      }
    }

    // First check wallet balances (native chain tokens)
    if (accountBalances && accountBalances[normalizedSymbol] !== undefined) {
      return Number(accountBalances[normalizedSymbol] || 0).toFixed(6);
    }
    // Then check user holdings
    const holding = userHoldings.find(h => String(h.symbol || '').toUpperCase() === normalizedSymbol);
    if (!holding) return '0.00';
    return holding.balance.toFixed(6);
  };

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSelectSavedPair = (from, to) => {
    setFromToken(from);
    setToToken(to);
    setFromAmount('');
    setToAmount('');
  };

  const getPlatformFeeSnapshot = React.useCallback(() => {
    const inputAmount = Number(fromAmount || 0);
    const tokenPrice = Number(fromToken?.price_usd || fromToken?.price || 0);
    const feeAmount = inputAmount * PLATFORM_FEE_RATE;
    const feeUsd = feeAmount * tokenPrice;

    return {
      platform_fee_percent: PLATFORM_FEE_PERCENT,
      platform_fee_amount: Number.isFinite(feeAmount) ? feeAmount : 0,
      platform_fee_usd: Number.isFinite(feeUsd) ? feeUsd : 0,
    };
  }, [fromAmount, fromToken]);

  const createPendingSwapRecord = React.useCallback(async (hash) => {
    const feeSnapshot = getPlatformFeeSnapshot();
    let localRecord = null;
    try {
      localRecord = createLocalTransaction({
        type: 'swap',
        status: 'pending',
        chain: selectedNetwork,
        tx_hash: hash || '',
        token_from: fromToken?.symbol || '',
        token_to: toToken?.symbol || '',
        amount_from: Number(fromAmount || 0),
        amount_to: Number(toAmount || 0),
        ...feeSnapshot,
      });
      if (localRecord?.id) {
        setActiveTxRecordId(localRecord.id);
      }
    } catch (error) {
      console.error('Failed to create local swap history record:', error);
    }
    queryClient.invalidateQueries({ queryKey: ['recentSwaps'] });
    queryClient.invalidateQueries({ queryKey: ['swapHistory'] });
  }, [selectedNetwork, fromToken, toToken, fromAmount, toAmount, queryClient, getPlatformFeeSnapshot]);

  const updateSwapRecordStatus = React.useCallback(async (status, hash) => {
    if (!activeTxRecordId) return;
    try {
      updateLocalTransaction(activeTxRecordId, {
        status: status === 'confirmed' ? 'completed' : status,
        tx_hash: hash || txHash || '',
      });
    } catch {
      // ignore local update errors
    }

    queryClient.invalidateQueries({ queryKey: ['recentSwaps'] });
    queryClient.invalidateQueries({ queryKey: ['swapHistory'] });
    if (status === 'confirmed' || status === 'failed') {
      setActiveTxRecordId(null);
    }
  }, [activeTxRecordId, txHash, queryClient]);

  const handleSwap = async () => {
    setSwapError('');
    if (!fromAmount || !account) return;
    const resolvedFromAddress = resolveAddressForChain(fromToken, selectedNetwork);
    const resolvedToAddress = resolveAddressForChain(toToken, selectedNetwork);

    // Validate addresses for Solana swaps
    if (selectedNetwork === 'solana') {
      if (!isSolanaAddress(resolvedFromAddress)) {
        const message = `This token is not on Solana. Choose a Solana token, or switch to BNB/Ethereum network to trade it.`;
        setSwapError(message);
        toast.error(message);
        setIsSwapping(false);
        return;
      }
      if (!isSolanaAddress(resolvedToAddress)) {
        const message = `This token is not on Solana. Swap it on BNB or Ethereum network instead.`;
        setSwapError(message);
        toast.error(message);
        setIsSwapping(false);
        return;
      }
    }

    if (selectedNetwork === 'bsc' || selectedNetwork === 'ethereum') {
      const chainLabel = selectedNetwork === 'ethereum' ? 'Ethereum' : 'BSC';
      if (!isEvmAddress(resolvedFromAddress)) {
        const message = `Invalid source token for ${chainLabel}: ${(fromToken?.symbol || 'UNKNOWN')} (${fromToken?.address || 'no address'})`;
        setSwapError(message);
        toast.error(message);
        setIsSwapping(false);
        return;
      }
      if (!isEvmAddress(resolvedToAddress)) {
        const message = `Invalid destination token for ${chainLabel}: ${(toToken?.symbol || 'UNKNOWN')} (${toToken?.address || 'no address'})`;
        setSwapError(message);
        toast.error(message);
        setIsSwapping(false);
        return;
      }
    }

    setIsSwapping(true);
    try {
      if (!isCrossChain && poolQuote?.pool) {
        const fromSymbol = String(fromToken?.symbol || '').toUpperCase();
        const tokenA = String(poolQuote.pool.token_a || '').toUpperCase();
        const reserveA = Number(poolQuote.pool.token_a_amount || 0);
        const reserveB = Number(poolQuote.pool.token_b_amount || 0);
        const amountIn = Number(fromAmount || 0);
        const amountOut = Number(poolQuote.amountOut || 0);

        if (!(amountIn > 0) || !(amountOut > 0)) {
          throw new Error('Invalid pool quote');
        }

        const isAToB = tokenA === fromSymbol;
        const reserveOut = isAToB ? reserveB : reserveA;
        if (amountOut >= reserveOut) {
          throw new Error('Insufficient pool liquidity for this swap');
        }

        const updatedA = isAToB ? reserveA + amountIn : reserveA - amountOut;
        const updatedB = isAToB ? reserveB - amountOut : reserveB + amountIn;
        if (!(updatedA > 0) || !(updatedB > 0)) {
          throw new Error('Pool reserves update failed');
        }

        updateLocalPool(poolQuote.pool.id, {
          token_a_amount: updatedA,
          token_b_amount: updatedB,
          volume_24h:
            Number(poolQuote.pool.volume_24h || 0) +
            amountIn * Number(fromToken?.price_usd || fromToken?.price || 0),
        });

        const localHash = `pool-${Date.now()}`;
        const feeSnapshot = getPlatformFeeSnapshot();
        createLocalTransaction({
          type: 'swap',
          status: 'completed',
          chain: selectedNetwork,
          tx_hash: localHash,
          token_from: fromToken?.symbol || '',
          token_to: toToken?.symbol || '',
          amount_from: Number(fromAmount || 0),
          amount_to: Number(toAmount || 0),
          route: `POOL:${poolQuote.route}`,
          ...feeSnapshot,
        });

        setTxHash(null);
        setActiveTxRecordId(null);
        setFromAmount('');
        setToAmount('');
        toast.success(`Swap executed via pool ${poolQuote.route}`);
        queryClient.invalidateQueries({ queryKey: ['liquidityPools'] });
        queryClient.invalidateQueries({ queryKey: ['recentSwaps'] });
        queryClient.invalidateQueries({ queryKey: ['swapHistory'] });
        queryClient.invalidateQueries({ queryKey: ['userHoldings'] });
        return;
      }

      if (selectedNetwork === 'solana') {
        const response = await executeSolanaSwap(resolvedFromAddress, resolvedToAddress);
        if (!response.success) throw new Error(response.error);
        if (response.txHash) {
          await createPendingSwapRecord(response.txHash);
        }
        setFromAmount('');
        setToAmount('');
        queryClient.invalidateQueries({ queryKey: ['userHoldings'] });
        queryClient.invalidateQueries({ queryKey: ['recentSwaps'] });
      } else {
        setTxLoading('Processing swap on ' + selectedNetwork + '...');
        const response = await fetch(apiUrl('/api/execute-swap'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: selectedNetwork,
            fromToken: resolvedFromAddress,
            toToken: resolvedToAddress,
            amount: parseFloat(fromAmount),
            userPublicKey: account,
            wallet: walletType
          })
        });
        const responseData = await response.json();

        if (!responseData?.success) {
          throw new Error(responseData?.error || 'Swap failed');
        }

        const tx = responseData?.tx;
        if (!tx?.to || !tx?.data) {
          throw new Error('Swap provider did not return executable transaction');
        }
        const evmProvider =
          walletType === 'walletconnect' && wcProvider?.request
            ? wcProvider
            : window.ethereum;

        if (!evmProvider || typeof evmProvider.request !== 'function') {
          throw new Error('EVM wallet not detected');
        }

        const currentChainId = await evmProvider.request({ method: 'eth_chainId' });
        const normalizedCurrentChainId = typeof currentChainId === 'number'
          ? `0x${currentChainId.toString(16)}`
          : String(currentChainId || '').toLowerCase();
        const desiredChainId = selectedNetwork === 'ethereum' ? '0x1' : '0x38';
        if (normalizedCurrentChainId !== desiredChainId) {
          if (walletType === 'walletconnect') {
            throw new Error(
              selectedNetwork === 'ethereum'
                ? 'Reconnect WalletConnect on Ethereum Mainnet'
                : 'Reconnect WalletConnect on BNB Smart Chain'
            );
          }
          try {
            await evmProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: desiredChainId }],
            });
          } catch (switchError) {
            throw new Error(
              selectedNetwork === 'ethereum'
                ? 'Please switch your wallet to Ethereum Mainnet'
                : 'Please switch your wallet to BNB Smart Chain'
            );
          }
        }

        const txParams = {
          from: account,
          to: tx.to,
          data: tx.data,
          value: tx.value ? `0x${BigInt(tx.value).toString(16)}` : '0x0',
        };
        if (tx.gas) {
          txParams.gas = `0x${BigInt(tx.gas).toString(16)}`;
        }

        setTxLoading('Confirm transaction in wallet...');
        const submittedHash = await evmProvider.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        });
        if (!submittedHash) {
          throw new Error('Transaction submission failed');
        }
        setTxHash(submittedHash);
        await createPendingSwapRecord(submittedHash);

        setFromAmount('');
        setToAmount('');
        queryClient.invalidateQueries({ queryKey: ['userHoldings'] });
        queryClient.invalidateQueries({ queryKey: ['recentSwaps'] });
      }
    } catch (error) {
      const message = error?.message || 'Swap failed';
      await updateSwapRecordStatus('failed');
      setSwapError(message);
      toast.error(message);
    } finally {
      setIsSwapping(false);
      setTxLoading(null);
    }
  };

  const handleConnectWallet = async () => {
    setSwapError('');
    setShowConnectModal(true);
  };

  const handleWalletSelect = async (type, walletName) => {
    try {
      await connectWallet(type, walletName);
      setShowConnectModal(false);
    } catch {
      // errors are handled by WalletContext alerts/toasts
    }
  };

const executeSolanaSwap = async (inputMintAddress, outputMintAddress) => {
  try {
    const { Connection, VersionedTransaction } = await import('@solana/web3.js');
    
    setTxLoading('Getting Jupiter route...');
    const decimals = getSolanaTokenDecimals(fromToken);
    const amount = Math.floor(parseFloat(fromAmount) * (10 ** decimals));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid swap amount');
    }

    // Get transaction from backend
    const response = await fetch(apiUrl('/api/solana-swap'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputMint: inputMintAddress,
        outputMint: outputMintAddress,
        amount,
        userPublicKey: account
      })
    });
    const responseData = await response.json();

    if (!responseData?.success) {
      throw new Error(responseData?.error || 'Failed to prepare swap');
    }

    const txBase64 = responseData.swapTransaction;
    setTxLoading('Signing transaction with wallet...');
    let solanaProvider = window.phantom?.solana || window.solana || window.solflare;

    if (!solanaProvider) {
      throw new Error('Wallet not connected');
    }

    if (!solanaProvider.signTransaction) {
      throw new Error('Connected Solana wallet does not support signing');
    }

    const rawTx = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));
    const versionedTx = VersionedTransaction.deserialize(rawTx);
    let txId = null;
    let lastRpcError = null;

    setTxLoading('Submitting transaction...');

    if (typeof solanaProvider.signAndSendTransaction === 'function') {
      try {
        const walletResult = await solanaProvider.signAndSendTransaction(versionedTx, {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'confirmed',
        });
        txId = walletResult?.signature || walletResult;
      } catch (walletSendError) {
        lastRpcError = walletSendError;
      }
    }

    if (!txId) {
      const signedTx = await solanaProvider.signTransaction(versionedTx);
      const rpcEndpoints = [
        'https://api.mainnet-beta.solana.com',
        'https://rpc.ankr.com/solana',
      ];

      for (const endpoint of rpcEndpoints) {
        try {
          const connection = new Connection(endpoint, 'confirmed');
          const submitted = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
          });
          await connection.confirmTransaction(submitted, 'confirmed');
          txId = submitted;
          break;
        } catch (rpcError) {
          lastRpcError = rpcError;
        }
      }
    }

    if (!txId) {
      const rpcMsg = String(lastRpcError?.message || 'Unknown RPC error');
      if (rpcMsg.includes('403') || rpcMsg.toLowerCase().includes('access forbidden')) {
        throw new Error('Solana RPC access forbidden (403). Please retry in a minute or switch RPC/provider.');
      }
      throw new Error(`Failed to submit Solana transaction: ${rpcMsg}`);
    }
    setTxHash(txId);

    return { success: true, txHash: txId };
  } catch (error) {
    console.error('Solana swap error:', error);
    return { success: false, error: error.message };
  }
};

  if (!fromToken || !toToken) {
    return (
      <div className="glass-card rounded-3xl p-6 max-w-md mx-auto glow-cyan">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  return (
    <>
      {(() => {
        const amountValue = parseFloat(fromAmount || '0');
        const balanceValue = parseFloat(getTokenBalance(fromToken.symbol, fromToken.address) || '0');
        const hasKnownPositiveBalance = Number.isFinite(balanceValue) && balanceValue > 0;
        const insufficientBalance = hasKnownPositiveBalance && amountValue > balanceValue;
        const disableSwap =
          !fromAmount ||
          isSwapping ||
          !fromToken ||
          !toToken ||
          insufficientBalance;

        return (
        <div className="glass-card rounded-3xl p-6 max-w-md mx-auto glow-cyan">
         {/* Header with Network Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Swap</h2>
              <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                <Settings className="w-5 h-5 text-gray-400 hover:text-cyan-400" />
              </button>
            </div>
            <NetworkSelector />
          </div>

          {/* Network Balances */}
          <NetworkBalances />

          {/* Spacing */}
          <div className="my-4" />

          {/* Cross-Chain Network Selector */}
          {selectedNetwork && (
            <CrossChainNetworkSelector 
              selectedNetwork={toNetwork} 
              onNetworkChange={setToNetwork}
            />
          )}

          {/* Spacing */}
          <div className="my-4" />

        {/* From Token */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">You pay</span>
            {fromToken && (
              <span className="text-sm text-gray-400">Balance: {getTokenBalance(fromToken.symbol, fromToken.address)} {fromToken.symbol}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              className="flex-1 bg-transparent border-0 text-3xl font-semibold placeholder:text-gray-600 focus-visible:ring-0 p-0"
            />
            <button
              onClick={() => setSelectingFor('from')}
              className="flex flex-col items-start gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-all"
            >
              <div className="flex items-center gap-2">
                <img src={fromToken.logo} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
                <span className="font-semibold text-sm">{fromToken.symbol}</span>
              </div>
              {fromToken.address && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="font-mono">{fromToken.address.slice(0, 6)}...{fromToken.address.slice(-4)}</span>
                  <Copy 
                    className="w-3 h-3 cursor-pointer hover:text-cyan-400 transition-colors" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(fromToken.address);
                      toast.success('Address copied');
                    }} 
                  />
                </div>
              )}
            </button>
          </div>
          {fromAmount && toAmount && (
             <p className="text-sm text-gray-500 mt-2">
               ≈ ${(parseFloat(fromAmount || 0) * (fromToken.price_usd || 1)).toFixed(2)}
             </p>
           )}
        </div>

        {/* Swap Direction Button */}
        <div className="relative h-2 flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSwapDirection}
            className="absolute z-10 p-3 rounded-xl bg-[#12121a] border border-white/10 hover:border-cyan-500/50 transition-colors"
          >
            <ArrowDown className="w-5 h-5 text-cyan-400" />
          </motion.button>
        </div>

        {/* Price Chart */}
        {toToken && <PriceChart token={toToken} />}

        {/* To Token */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">You receive</span>
            {toToken && (
              <span className="text-sm text-gray-400">Balance: {getTokenBalance(toToken.symbol, toToken.address)} {toToken.symbol}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              placeholder="0.00"
              value={toAmount}
              readOnly
              className="flex-1 bg-transparent border-0 text-3xl font-semibold placeholder:text-gray-600 focus-visible:ring-0 p-0"
            />
            <button
              onClick={() => setSelectingFor('to')}
              className="flex flex-col items-start gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-all"
            >
              <div className="flex items-center gap-2">
                <img src={toToken.logo} alt={toToken.symbol} className="w-6 h-6 rounded-full" />
                <span className="font-semibold text-sm">{toToken.symbol}</span>
              </div>
              {toToken.address && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="font-mono">{toToken.address.slice(0, 6)}...{toToken.address.slice(-4)}</span>
                  <Copy 
                    className="w-3 h-3 cursor-pointer hover:text-cyan-400 transition-colors" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(toToken.address);
                      toast.success('Address copied');
                    }} 
                  />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Rate Comparison */}
        {isCrossChain && fromAmount && toAmount && (
          <>
            <button
              onClick={() => setShowRateComparison(!showRateComparison)}
              className="w-full mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-cyan-400"
            >
              {showRateComparison ? 'Hide' : 'Show'} Rate Comparison
            </button>
            <RateComparison 
              fromChain={selectedNetwork}
              toChain={toNetwork}
              fromToken={fromToken}
              toToken={toToken}
              amount={fromAmount}
              isOpen={showRateComparison}
              onSelectRoute={(route) => {
                setSelectedRoute(route);
                setToAmount((parseFloat(route.outputAmount) / 1e6).toFixed(6));
              }}
            />
          </>
        )}

        {/* Swap Path Optimizer */}
        {selectedRoute && isCrossChain && (
          <SwapPathOptimizer 
            route={selectedRoute.route}
            fromChain={selectedNetwork}
            toChain={toNetwork}
            isCrossChain={isCrossChain}
          />
        )}

        {/* Cross-Chain Swap Details */}
        {isCrossChain && crossChainEstimate && !selectedRoute && (
          <CrossChainSwapDetails 
            estimate={crossChainEstimate}
            fromChain={selectedNetwork}
            toChain={toNetwork}
            isLoading={!crossChainEstimate}
          />
        )}

        {/* Fee Breakdown */}
        {!isCrossChain && fromAmount && toAmount && (
          <FeeBreakdown
            fromAmount={fromAmount}
            toAmount={toAmount}
            networkFee={networkFee}
            priceImpact={priceImpact}
            fromToken={fromToken}
            toToken={toToken}
            selectedNetwork={selectedNetwork}
          />
        )}

        {/* Exchange Rate Info */}
         {!isCrossChain && fromAmount && toAmount && exchangeRate > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Exchange Rate</span>
                <span className="text-white font-semibold">
                  1 {fromToken.symbol} = {exchangeRate.toFixed(6)} {toToken.symbol}
                </span>
              </div>

              {swapQuote?.protocols && swapQuote.protocols.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Route</span>
                  <span className="text-white text-xs">{swapQuote.protocols.slice(0, 2).join(' → ')}</span>
                </div>
              )}

              {swapQuote?.liquidity && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Liquidity</span>
                  <span className={swapQuote.liquidity === 'High' ? 'text-green-400' : swapQuote.liquidity === 'Medium' ? 'text-yellow-400' : 'text-gray-400'}>
                    {swapQuote.liquidity}
                  </span>
                </div>
              )}

              {priceImpact > 5 && (
                <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 mt-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>High slippage - consider smaller amount</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Transaction Status Monitor */}
        <AnimatePresence>
          {txHash && (
            <TransactionMonitor
              txHash={txHash}
              chain={selectedNetwork}
              onStatusChange={async (newStatus) => {
                await updateSwapRecordStatus(newStatus, txHash);
                if (newStatus === 'confirmed') {
                  setTxHash(null);
                  toast.success('Swap confirmed and added to history');
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Saved Pairs */}
        <SavedPairs 
          fromToken={fromToken} 
          toToken={toToken}
          onSelectPair={handleSelectSavedPair}
        />

        {/* Swap Button */}
        {swapError && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {swapError}
          </div>
        )}
        <div className="sticky bottom-2 z-20 md:static bg-[#0a0a0f]/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none rounded-xl p-2 md:p-0">
          <Button
            onClick={!account ? handleConnectWallet : handleSwap}
            disabled={account ? disableSwap : false}
            className={cn(
              "w-full h-14 rounded-2xl text-lg font-semibold transition-all duration-300",
              (!account || (fromAmount && !insufficientBalance))
                ? "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:scale-[1.02]"
                : "bg-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {isSwapping ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {txLoading || 'Swapping...'}
              </span>
            ) : !account && isConnecting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </span>
            ) : !account ? (
              "Connect wallet"
            ) : !fromAmount ? (
              "Enter an amount"
            ) : insufficientBalance ? (
              "Insufficient balance"
            ) : (
              "Swap"
            )}
          </Button>
        </div>
      </div>
        );
      })()}



      <MemeTokenSelector
        isOpen={selectingFor !== null}
        onClose={() => setSelectingFor(null)}
        selectedNetwork={selectingFor === 'from' ? selectedNetwork : (isCrossChain ? toNetwork : selectedNetwork)}
        onSelect={(token) => {
           const tokenData = {
             symbol: token.symbol,
             name: token.name,
             logo: token.logo,
             address: token.address,
             price_usd: token.price_usd || token.price || 0,
             price: token.price_usd || token.price || 0,
           };

           if (selectingFor === 'from') {
             setFromToken(tokenData);
           } else {
             setToToken(tokenData);
           }
           setSelectingFor(null);
         }}
        selectedToken={selectingFor === 'from' ? fromToken : toToken}
      />

      <SwapSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <CrossChainSwapStatus
        isOpen={showCrossChainStatus}
        onClose={() => setShowCrossChainStatus(false)}
        swapData={{ fromChain: selectedNetwork, toChain: toNetwork, amount: fromAmount, fromToken }}
        txHash={crossChainTxHash}
      />

      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white w-[95vw] max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 pb-1">
            <button
              onClick={() => handleWalletSelect('solana', 'phantom')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-cyan-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Phantom Wallet</p>
                <p className="text-xs text-gray-400">Connect to Solana network</p>
              </div>
            </button>

            <button
              onClick={() => handleWalletSelect('solana', 'solflare')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-cyan-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Solflare Wallet</p>
                <p className="text-xs text-gray-400">Connect to Solana network</p>
              </div>
            </button>

            <button
              onClick={() => handleWalletSelect(evmConnectType, 'Binance Web3')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-yellow-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Binance Web3</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain</p>
              </div>
            </button>

            <button
              onClick={() => handleWalletSelect(evmConnectType, 'MetaMask')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-yellow-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">MetaMask</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain / Ethereum Smart Chain</p>
              </div>
            </button>

            <button
              onClick={() => handleWalletSelect(evmConnectType, 'Trust Wallet')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-yellow-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-lime-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Trust Wallet</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain / Ethereum Smart Chain</p>
              </div>
            </button>

            <button
              onClick={() => handleWalletSelect(evmConnectType, 'Ethereum')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-blue-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Ethereum Wallet</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain / Ethereum Smart Chain</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

