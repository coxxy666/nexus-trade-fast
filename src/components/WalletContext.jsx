import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiUrl } from '@/lib/apiUrl';

const WalletContext = createContext();

const NETWORKS = {
  bsc: { id: '0x38', chainId: 56, name: 'BNB Smart Chain', icon: 'BNB', rpc: 'https://bsc-dataseed.binance.org/' },
  ethereum: { id: '0x1', chainId: 1, name: 'Ethereum', icon: 'ETH', rpc: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' },
  solana: { id: 'solana', chainId: null, name: 'Solana', icon: 'SOL', rpc: null },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wcProvider, setWcProvider] = useState(null);
  const [wcUri, setWcUri] = useState(null);
  const [wcSelectedWallet, setWcSelectedWallet] = useState(null);
  const [showWcQr, setShowWcQr] = useState(false);
  const [web3, setWeb3] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState('bsc');
  const [accountBalances, setAccountBalances] = useState({});

  const connectLockRef = useRef(false);
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

  const normalizeString = (value) => String(value || '').toLowerCase();

  const fetchAccountBalances = useCallback(async (address, chain) => {
    if (!address || !chain) {
      setAccountBalances({});
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/balances'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });
      const data = await response.json();
      if (data?.balances && typeof data.balances === 'object') {
        setAccountBalances(data.balances);
      } else {
        setAccountBalances({});
      }
    } catch (error) {
      console.error('Failed to fetch account balances:', error);
      setAccountBalances({});
    }
  }, []);

  const setConnectedSession = useCallback(async ({ address, type, chain, provider = null }) => {
    setAccount(address);
    setWalletType(type);
    setSelectedNetwork(chain);
    localStorage.setItem('connectedWallet', address);
    localStorage.setItem('walletType', type);
    localStorage.setItem('selectedNetwork', chain);
    if (provider) setWcProvider(provider);
    await fetchAccountBalances(address, chain);
  }, [fetchAccountBalances]);

  const collectSolanaProviders = useCallback(() => {
    if (typeof window === 'undefined') return [];
    const toSolanaProvider = (candidate) => {
      if (!candidate) return null;
      const base = candidate?.solana && typeof candidate.solana === 'object' ? candidate.solana : candidate;
      if (typeof base?.connect === 'function') return base;
      if (
        typeof base?.request === 'function' &&
        (base?.isPhantom || base?.isSolflare || base?.isBackpack || candidate?.isPhantom || candidate?.isSolflare || candidate?.isBackpack)
      ) {
        return {
          ...base,
          connect: async (opts = {}) => {
            await base.request({ method: 'connect', params: [opts] });
            return { publicKey: base.publicKey };
          },
        };
      }
      return null;
    };

    const raw = [
      window?.phantom?.solana,
      window?.solflare?.solana,
      window?.solflare,
      window?.backpack?.solana,
      window?.backpack,
      window?.coin98?.solana,
      window?.solana,
      window?.Solflare?.solana,
      window?.Solflare,
    ];

    if (Array.isArray(window?.solana?.providers)) {
      raw.push(...window.solana.providers);
    }

    const providers = [];
    for (const candidate of raw) {
      if (!candidate) continue;
      const normalized = toSolanaProvider(candidate);
      if (!normalized) continue;
      if (!providers.includes(normalized)) providers.push(normalized);
    }
    return providers;
  }, []);

  const getSolanaProvider = useCallback((walletName = '') => {
    const want = normalizeString(walletName);
    const providers = collectSolanaProviders();
    if (!providers.length) return null;

    if (want.includes('phantom')) {
      return providers.find((p) => p?.isPhantom) || null;
    }
    if (want.includes('solflare')) {
      return providers.find((p) => p?.isSolflare) || null;
    }
    if (want.includes('backpack')) {
      return providers.find((p) => p?.isBackpack) || null;
    }
    return providers[0] || null;
  }, [collectSolanaProviders]);

  const waitForSolanaProvider = useCallback(async (walletName = '') => {
    for (let i = 0; i < 25; i += 1) {
      const provider = getSolanaProvider(walletName);
      if (provider) return provider;
      await sleep(200);
    }
    return null;
  }, [getSolanaProvider]);

  const collectEvmProviders = useCallback(() => {
    if (typeof window === 'undefined') return [];
    const hasRequest = (p) => p && typeof p.request === 'function';
    const list = [];

    if (hasRequest(window.BinanceChain)) list.push(window.BinanceChain);
    if (hasRequest(window?.trustwallet)) list.push(window.trustwallet);
    if (hasRequest(window?.trustwallet?.ethereum)) list.push(window.trustwallet.ethereum);
    if (hasRequest(window?.trustWallet)) list.push(window.trustWallet);
    if (hasRequest(window?.trustWallet?.ethereum)) list.push(window.trustWallet.ethereum);

    const injected = window.ethereum;
    if (Array.isArray(injected?.providers) && injected.providers.length > 0) {
      for (const p of injected.providers) {
        if (hasRequest(p) && !list.includes(p)) list.push(p);
      }
    } else if (hasRequest(injected) && !list.includes(injected)) {
      list.push(injected);
    }
    return list;
  }, []);

  const providerLabel = (p) => `${p?.providerName || ''} ${p?.name || ''}`.toLowerCase();
  const isTrustProvider = (p) => !!(
    p?.isTrust ||
    p?.isTrustWallet ||
    p?.isTrustWeb3 ||
    p?.provider === 'TrustWallet' ||
    providerLabel(p).includes('trust wallet')
  );
  const isCoinbaseProvider = (p) => !!(p?.isCoinbaseWallet || providerLabel(p).includes('coinbase'));
  const isBinanceProvider = (p) => !!(
    p?.isBinance ||
    p?.isBinanceWallet ||
    p?.isBnbWallet ||
    p?.isBinanceChain ||
    providerLabel(p).includes('binance') ||
    providerLabel(p).includes('bnb chain')
  );
  const isMetaMaskProvider = (p) => !!(p?.isMetaMask && !isTrustProvider(p) && !isCoinbaseProvider(p) && !isBinanceProvider(p));

  const getEvmProvider = useCallback((walletName = '') => {
    const want = normalizeString(walletName);
    const providers = collectEvmProviders();
    if (!providers.length) return null;

    if (want.includes('binance')) return providers.find(isBinanceProvider) || null;
    if (want.includes('metamask')) return providers.find(isMetaMaskProvider) || null;
    if (want.includes('trust')) return providers.find(isTrustProvider) || null;
    if (want.includes('coinbase')) return providers.find(isCoinbaseProvider) || null;
    if (want.includes('ethereum')) return providers.find(isMetaMaskProvider) || providers[0] || null;

    return providers[0] || null;
  }, [collectEvmProviders]);

  const isRequestedInjectedWalletAvailable = useCallback((walletName = '') => {
    const name = normalizeString(walletName);
    if (!name) return true;
    if (name.includes('ethereum')) return true;
    return !!getEvmProvider(walletName);
  }, [getEvmProvider]);

  useEffect(() => {
    const savedAccount = localStorage.getItem('connectedWallet');
    const savedType = localStorage.getItem('walletType');
    const savedNetwork = localStorage.getItem('selectedNetwork') || 'bsc';
    if (savedAccount && savedType) {
      setAccount(savedAccount);
      setWalletType(savedType);
      setSelectedNetwork(savedNetwork);
      fetchAccountBalances(savedAccount, savedNetwork);
    }
  }, [fetchAccountBalances]);

  useEffect(() => {
    if (account && selectedNetwork) {
      fetchAccountBalances(account, selectedNetwork);
    }
  }, [account, selectedNetwork, fetchAccountBalances]);

  const getWalletDeeplink = (walletName) => {
    const deeplinks = {
      Rainbow: 'rainbow://wc',
      'Trust Wallet': 'trust://wc',
      'Coinbase Wallet': 'cbwallet://wc',
      'Binance Web3': 'bnb://wc',
      Solflare: 'solflare://wc',
      'Magic Eden': 'magiceden://wc',
      Argent: 'argent://wc',
      'Ledger Live': 'ledger://wc',
      SafePal: 'safepal://wc',
      'OKX Wallet': 'okx://wc',
      'Gate.io Web3': 'gateio://wc',
      'Kucoin Wallet': 'kucoin://wc',
    };
    return deeplinks[walletName] || null;
  };

  const getWalletDeepLinkUrl = useCallback((walletName, wcUriValue) => {
    if (!walletName || !wcUriValue) return null;
    const encoded = encodeURIComponent(wcUriValue);
    const builders = {
      Rainbow: () => `rainbow://wc?uri=${encoded}`,
      'Trust Wallet': () => `trust://wc?uri=${encoded}`,
      'Coinbase Wallet': () => `https://go.cb-w.com/wc?uri=${encoded}`,
      'Binance Web3': () => `bnb://wc?uri=${encoded}`,
      Solflare: () => `solflare://wc?uri=${encoded}`,
      'Magic Eden': () => `magiceden://wc?uri=${encoded}`,
      Argent: () => `argent://app/wc?uri=${encoded}`,
      'Ledger Live': () => `ledgerlive://wc?uri=${encoded}`,
      SafePal: () => `safepal://wc?uri=${encoded}`,
      'OKX Wallet': () => `okx://wallet/connect?uri=${encoded}`,
      'Gate.io Web3': () => `gateio://wc?uri=${encoded}`,
      'Kucoin Wallet': () => `kucoin://wc?uri=${encoded}`,
    };
    const build = builders[walletName];
    if (build) return build();
    const fallback = getWalletDeeplink(walletName);
    return fallback ? `${fallback}?uri=${encoded}` : null;
  }, []);

  const getMobileBrowserDeepLink = useCallback((walletName) => {
    const currentUrl = encodeURIComponent(window.location.href);
    const ref = encodeURIComponent(window.location.origin);
    const wallet = normalizeString(walletName);
    if (wallet.includes('phantom')) return `https://phantom.app/ul/browse/${currentUrl}?ref=${ref}`;
    if (wallet.includes('solflare')) return `https://solflare.com/ul/v1/browse/${currentUrl}?ref=${ref}`;
    if (wallet.includes('trust')) return `https://link.trustwallet.com/open_url?coin_id=60&url=${currentUrl}`;
    if (wallet.includes('metamask')) return `metamask://dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
    if (wallet.includes('binance')) return `https://bnbchain.wallet/binance-wallet/dapp?url=${currentUrl}`;
    return null;
  }, []);

  const requestEvmAccounts = useCallback(async (provider) => {
    const tryMethods = ['eth_requestAccounts', 'wallet_requestAccounts'];
    for (const method of tryMethods) {
      try {
        const accounts = await provider.request({ method });
        if (Array.isArray(accounts) && accounts.length > 0) {
          return accounts;
        }
      } catch (error) {
        const msg = normalizeString(error?.message);
        const isPending = error?.code === -32002 || msg.includes('already pending') || msg.includes('already processing');
        if (isPending) throw error;
      }
    }

    if (typeof provider.enable === 'function') {
      try {
        const enabled = await provider.enable();
        if (Array.isArray(enabled) && enabled.length > 0) return enabled;
      } catch {
        // ignore and fallback to eth_accounts
      }
    }

    const existing = await provider.request({ method: 'eth_accounts' });
    if (Array.isArray(existing) && existing.length > 0) return existing;
    throw new Error('No accounts found');
  }, []);

  const requestEvmChainId = useCallback(async (provider) => {
    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      if (chainId !== undefined && chainId !== null) return String(chainId);
    } catch {
      // ignore and fallback
    }
    try {
      const netVersion = await provider.request({ method: 'net_version' });
      const asNum = Number(netVersion);
      if (Number.isFinite(asNum) && asNum > 0) return `0x${asNum.toString(16)}`;
    } catch {
      // ignore
    }
    return '0x38';
  }, []);

  const waitForEvmProvider = useCallback(async (walletName = '') => {
    for (let i = 0; i < 12; i += 1) {
      const provider = getEvmProvider(walletName);
      if (provider) return provider;
      await sleep(150);
    }
    return null;
  }, [getEvmProvider]);

  const connectWallet = useCallback(async (type = 'solana', walletName = null, internal = false) => {
    if (connectLockRef.current && !internal) return;
    if (!internal) connectLockRef.current = true;
    setIsConnecting(true);

    try {
      if (type === 'solana') {
        const provider = await waitForSolanaProvider(walletName);
        if (!provider) {
          if (isMobile) {
            const deepLink = getMobileBrowserDeepLink(walletName);
            if (deepLink) {
              window.location.href = deepLink;
              return;
            }
          }
          alert('No Solana wallet detected. Install Phantom, Solflare, or Backpack and refresh.');
          return;
        }

        try {
          const existingKey = provider?.publicKey;
          const existingAddress =
            (typeof existingKey?.toBase58 === 'function' && existingKey.toBase58()) ||
            (typeof existingKey?.toString === 'function' && existingKey.toString()) ||
            '';
          if (existingAddress) {
            await setConnectedSession({ address: existingAddress, type: 'solana', chain: 'solana' });
            return;
          }

          let response;
          try {
            response = await provider.connect({ onlyIfTrusted: false });
          } catch (firstError) {
            const message = normalizeString(firstError?.message);
            const code = Number(firstError?.code);
            const canRetryWithoutOptions =
              code === -32602 ||
              message.includes('invalid params') ||
              message.includes('invalid arguments') ||
              message.includes('onlyiftrusted') ||
              message.includes('unexpected number of arguments');
            if (!canRetryWithoutOptions) throw firstError;
            response = await provider.connect();
          }

          const key = response?.publicKey || provider?.publicKey;
          const address =
            (typeof key?.toBase58 === 'function' && key.toBase58()) ||
            (typeof key?.toString === 'function' && key.toString()) ||
            '';
          if (!address) throw new Error('Wallet connected but no public key was returned');

          await setConnectedSession({ address, type: 'solana', chain: 'solana' });
          return;
        } catch (error) {
          const msg = normalizeString(error?.message);
          if (msg.includes('already pending') || msg.includes('already processing')) {
            alert('A Solana wallet request is already pending. Open the wallet popup and approve or reject it.');
            return;
          }
          if (error?.code === 4001 || error?.code === 4100 || msg.includes('rejected') || msg.includes('declined')) {
            return;
          }
          alert(`Failed to connect ${walletName || 'Solana'} wallet: ${error?.message || 'Unknown error'}`);
          return;
        }
      }

      if (type === 'bnb') {
        const provider = await waitForEvmProvider(walletName);
        if (!provider) {
          if (isMobile) {
            const deepLink = getMobileBrowserDeepLink(walletName);
            if (deepLink) {
              window.location.href = deepLink;
              return;
            }
          }
          alert(`${walletName || 'Selected wallet'} is not detected in this browser. Install/open that wallet extension (desktop) or open this site inside that wallet app (mobile).`);
          return;
        }

        try {
          const accounts = await requestEvmAccounts(provider);

          const address = accounts[0];
          const walletLower = normalizeString(walletName);
          const forceEthereum = walletLower.includes('ethereum');
          const targetChainId = forceEthereum ? '0x1' : null;

          const currentChainIdRaw = await requestEvmChainId(provider);
          const currentChainId = normalizeString(currentChainIdRaw);
          if (targetChainId && currentChainId !== targetChainId) {
            try {
              await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetChainId }],
              });
            } catch (switchError) {
              if (switchError?.code === 4902) {
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x1',
                    chainName: 'Ethereum Mainnet',
                    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                    rpcUrls: [NETWORKS.ethereum.rpc],
                    blockExplorerUrls: ['https://etherscan.io/'],
                  }],
                });
              } else {
                throw switchError;
              }
            }
          }

          const finalChainRaw = await requestEvmChainId(provider);
          const chain = normalizeString(finalChainRaw) === '0x1' ? 'ethereum' : 'bsc';
          await setConnectedSession({ address, type: 'bnb', chain });
          return;
        } catch (error) {
          const msg = normalizeString(error?.message);
          if (error?.code === -32002 || msg.includes('already pending') || msg.includes('already processing')) {
            alert('An EVM wallet request is already pending. Open the wallet popup and approve or reject it.');
            return;
          }
          if (error?.code === 4001 || msg.includes('user rejected')) return;
          alert(`Failed to connect wallet: ${error?.message || 'Unknown error'}`);
          return;
        }
      }

      if (type === 'walletconnect') {
        try {
          if (!isMobile) {
            alert('WalletConnect is disabled in this build. Use an injected wallet extension (MetaMask/Binance/Trust) in this browser.');
            return;
          }
          if (typeof globalThis !== 'undefined' && typeof globalThis.global === 'undefined') {
            globalThis.global = globalThis;
          }
          if (typeof window !== 'undefined' && typeof window.global === 'undefined') {
            window.global = window;
          }

          setWcSelectedWallet(walletName || null);
          const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
          const wantsEthereum = normalizeString(walletName).includes('ethereum');
          const wcChainId = wantsEthereum || selectedNetwork === 'ethereum' ? 1 : 56;

          const provider = new WalletConnectProvider({
            infuraId: '9aa3d95b3bc440fa88ea12eaa4456161',
            chainId: wcChainId,
            rpc: {
              1: NETWORKS.ethereum.rpc,
              56: NETWORKS.bsc.rpc,
            },
            qrcodeModal: {
              open: (uri) => {
                setWcUri(uri);
                setShowWcQr(true);
                if (walletName && isMobile) {
                  const targetUrl = getWalletDeepLinkUrl(walletName, uri);
                  if (targetUrl) {
                    setTimeout(() => {
                      window.location.href = targetUrl;
                    }, 120);
                  }
                }
              },
              close: () => {
                setShowWcQr(false);
                setWcUri(null);
              },
            },
          });

          await provider.enable();
          const accounts = Array.isArray(provider.accounts) ? provider.accounts : [];
          if (!accounts.length) throw new Error('No accounts returned by WalletConnect');

          const address = accounts[0];
          const chain = Number(provider.chainId) === 1 ? 'ethereum' : 'bsc';
          setWcProvider(provider);
          setShowWcQr(false);
          setWcUri(null);
          setWcSelectedWallet(null);
          await setConnectedSession({ address, type: 'walletconnect', chain, provider });
          return;
        } catch (error) {
          console.error('WalletConnect error:', error);
          setShowWcQr(false);
          setWcUri(null);
          setWcSelectedWallet(null);
          if (error?.code === 4001 || error?.message === 'Modal closed by user') return;
          alert(`Failed to connect via WalletConnect: ${error?.message || 'Unknown error'}`);
          return;
        }
      }
    } finally {
      if (!internal) connectLockRef.current = false;
      setIsConnecting(false);
    }
  }, [
    getEvmProvider,
    getMobileBrowserDeepLink,
    getWalletDeepLinkUrl,
    isMobile,
    selectedNetwork,
    setConnectedSession,
    waitForSolanaProvider,
    waitForEvmProvider,
    requestEvmAccounts,
    requestEvmChainId,
  ]);

  const disconnectWallet = async () => {
    try {
      if (wcProvider?.disconnect) {
        await wcProvider.disconnect();
      }
    } catch {
      // ignore disconnect errors
    }
    setWcProvider(null);
    setWcUri(null);
    setWcSelectedWallet(null);
    setShowWcQr(false);
    setAccount(null);
    setWalletType(null);
    setAccountBalances({});
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('walletType');
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const switchNetwork = async (networkKey) => {
    const network = NETWORKS[networkKey];
    if (!network) return;
    setSelectedNetwork(networkKey);
    localStorage.setItem('selectedNetwork', networkKey);

    if (!account) return;
    if (network.id === 'solana') return;
    if (!['bnb', 'walletconnect'].includes(walletType)) return;

    const provider = wcProvider?.request ? wcProvider : (getEvmProvider('') || window.ethereum);
    if (!provider?.request) return;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.id }],
      });
    } catch (switchError) {
      if (switchError?.code === 4902 && networkKey === 'ethereum') {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: NETWORKS.ethereum.id,
              chainName: NETWORKS.ethereum.name,
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: [NETWORKS.ethereum.rpc],
              blockExplorerUrls: ['https://etherscan.io/'],
            }],
          });
        } catch (addError) {
          console.error('Failed to add Ethereum network:', addError);
        }
      }
    }
  };

  const isConnected = !!account;

  return (
    <WalletContext.Provider value={{
      account,
      walletType,
      isConnecting,
      isConnected,
      connectWallet,
      disconnectWallet,
      formatAddress,
      web3,
      wcProvider,
      wcUri,
      wcSelectedWallet,
      showWcQr,
      setShowWcQr,
      getWalletDeeplink,
      getWalletDeepLinkUrl,
      selectedNetwork,
      switchNetwork,
      networks: NETWORKS,
      accountBalances,
      fetchAccountBalances,
      isRequestedInjectedWalletAvailable,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
