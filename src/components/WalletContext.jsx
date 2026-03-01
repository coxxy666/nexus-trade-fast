import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/apiUrl';

const WalletContext = createContext();

const NETWORKS = {
  'bsc': { id: '0x38', chainId: 56, name: 'BNB Smart Chain', icon: '??', rpc: 'https://bsc-dataseed.binance.org/' },
  'ethereum': { id: '0x1', chainId: 1, name: 'Ethereum', icon: 'ETH', rpc: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' },
  'solana': { id: 'solana', chainId: null, name: 'Solana', icon: '?', rpc: null },
};

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
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

  const getSolanaProvider = useCallback((preferred = '') => {
    const want = String(preferred || '').toLowerCase();

    const candidates = [
      { key: 'phantom', provider: window?.phantom?.solana },
      { key: 'solflare', provider: window?.solflare },
      { key: 'backpack', provider: window?.backpack },
      { key: 'coin98', provider: window?.coin98?.solana },
      { key: 'default', provider: window?.solana },
    ];

    if (Array.isArray(window?.solana?.providers)) {
      for (const p of window.solana.providers) {
        if (!p) continue;
        if (p.isPhantom) candidates.push({ key: 'phantom', provider: p });
        else if (p.isSolflare) candidates.push({ key: 'solflare', provider: p });
        else if (p.isBackpack) candidates.push({ key: 'backpack', provider: p });
        else candidates.push({ key: 'unknown', provider: p });
      }
    }

    const valid = candidates
      .map((c) => ({ ...c, provider: c.provider?.solana || c.provider }))
      .filter((c) => c.provider && typeof c.provider.connect === 'function');

    if (want) {
      const exact = valid.find((c) => c.key === want);
      if (exact) return exact.provider;
    }

    return valid[0]?.provider || null;
  }, []);

  const getEvmProvider = useCallback((preferredWallet = '') => {
    const hasRequest = (p) => p && typeof p.request === 'function';
    const preferred = String(preferredWallet || '').toLowerCase();
    const isBinanceRequest = preferred.includes('binance');
    const isCoinbaseRequest = preferred.includes('coinbase');
    const isTrustRequest = preferred.includes('trust');
    const isMetamaskRequest = preferred.includes('metamask');

    if (isBinanceRequest && hasRequest(window.BinanceChain)) return window.BinanceChain;

    const injected = window.ethereum;
    if (!injected) return null;

    // Handle single-provider mobile in-app browsers (no ethereum.providers array).
    if (!Array.isArray(injected.providers) || injected.providers.length === 0) {
      if (isBinanceRequest) {
        if (hasRequest(window.BinanceChain)) return window.BinanceChain;
        const label = `${injected?.providerName || ''} ${injected?.name || ''}`.toLowerCase();
        if (injected?.isBinance || injected?.isBinanceWallet || injected?.isBnbWallet || label.includes('binance') || label.includes('bnb')) {
          return hasRequest(injected) ? injected : null;
        }
      }

      if (isTrustRequest) {
        if (injected?.isTrust || injected?.isTrustWallet) return hasRequest(injected) ? injected : null;
      }

      if (isMetamaskRequest) {
        if (injected?.isMetaMask) return hasRequest(injected) ? injected : null;
      }

      if (isCoinbaseRequest) {
        if (injected?.isCoinbaseWallet) return hasRequest(injected) ? injected : null;
      }

      return hasRequest(injected) ? injected : null;
    }

    if (Array.isArray(injected.providers) && injected.providers.length > 0) {
      if (isBinanceRequest) {
        const binanceProvider = injected.providers.find(
          (p) => {
            const label = `${p?.providerName || ''} ${p?.name || ''}`.toLowerCase();
            return (
              p?.isBinance ||
              p?.isBinanceWallet ||
              p?.isBnbWallet ||
              label.includes('binance') ||
              label.includes('bnb')
            );
          }
        );
        if (hasRequest(binanceProvider)) return binanceProvider;
      }
      if (isCoinbaseRequest) {
        const coinbaseProvider = injected.providers.find((p) => p?.isCoinbaseWallet);
        if (hasRequest(coinbaseProvider)) return coinbaseProvider;
      }
      if (isTrustRequest) {
        const trustProvider = injected.providers.find((p) => p?.isTrust || p?.isTrustWallet);
        if (hasRequest(trustProvider)) return trustProvider;
      }
      if (isMetamaskRequest) {
        const metamaskProvider = injected.providers.find((p) => p?.isMetaMask);
        if (hasRequest(metamaskProvider)) return metamaskProvider;
      }

      const preferred = injected.providers.find(
        (p) => p?.isMetaMask || p?.isTrust || p?.isBinance || p?.isCoinbaseWallet
      );
      if (hasRequest(preferred)) return preferred;

      const fallback = injected.providers.find((p) => hasRequest(p));
      if (fallback) return fallback;
    }

    return hasRequest(injected) ? injected : null;
  }, []);

  const isRequestedInjectedWalletAvailable = useCallback((walletName = '') => {
    const name = String(walletName || '').toLowerCase();
    if (!name) return true;
    if (name.includes('ethereum')) return true;

    const hasRequest = (p) => p && typeof p.request === 'function';
    const injected = window.ethereum;
    const providers = Array.isArray(injected?.providers) && injected.providers.length > 0
      ? injected.providers
      : (injected ? [injected] : []);

    if (name.includes('binance')) {
      if (hasRequest(window.BinanceChain)) return true;
      return providers.some((p) => {
        const label = `${p?.providerName || ''} ${p?.name || ''}`.toLowerCase();
        return p?.isBinance || p?.isBinanceWallet || p?.isBnbWallet || label.includes('binance') || label.includes('bnb');
      });
    }

    if (name.includes('trust')) {
      return providers.some((p) => p?.isTrust || p?.isTrustWallet);
    }

    if (name.includes('coinbase')) {
      return providers.some((p) => p?.isCoinbaseWallet);
    }

    if (name.includes('metamask')) {
      return providers.some((p) => p?.isMetaMask);
    }

    return providers.some((p) => hasRequest(p));
  }, []);

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
      'Rainbow': 'rainbow://wc',
      'Trust Wallet': 'trust://wc',
      'Coinbase Wallet': 'cbwallet://wc',
      'Binance Web3': 'bnb://wc',
      'Solflare': 'solflare://wc',
      'Magic Eden': 'magiceden://wc',
      'Argent': 'argent://wc',
      'Ledger Live': 'ledger://wc',
      'SafePal': 'safepal://wc',
      'OKX Wallet': 'okx://wc',
      'Gate.io Web3': 'gateio://wc',
      'Kucoin Wallet': 'kucoin://wc',
    };
    return deeplinks[walletName] || null;
  };

  const getWalletDeepLinkUrl = useCallback((walletName, wcUri) => {
    if (!walletName || !wcUri) return null;
    const encoded = encodeURIComponent(wcUri);

    const builders = {
      'Rainbow': () => `rainbow://wc?uri=${encoded}`,
      'Trust Wallet': () => `trust://wc?uri=${encoded}`,
      'Coinbase Wallet': () => `https://go.cb-w.com/wc?uri=${encoded}`,
      'Binance Web3': () => `bnb://wc?uri=${encoded}`,
      'Solflare': () => `solflare://wc?uri=${encoded}`,
      'Magic Eden': () => `magiceden://wc?uri=${encoded}`,
      'Argent': () => `argent://app/wc?uri=${encoded}`,
      'Ledger Live': () => `ledgerlive://wc?uri=${encoded}`,
      'SafePal': () => `safepal://wc?uri=${encoded}`,
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
    const wallet = String(walletName || '').toLowerCase();

    if (wallet.includes('phantom')) {
      return `https://phantom.app/ul/browse/${currentUrl}?ref=${ref}`;
    }
    if (wallet.includes('solflare')) {
      return `https://solflare.com/ul/v1/browse/${currentUrl}?ref=${ref}`;
    }
    if (wallet.includes('trust')) {
      return `https://link.trustwallet.com/open_url?url=${currentUrl}`;
    }
    if (wallet.includes('metamask')) {
      return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
    }
    if (wallet.includes('binance')) {
      return `https://bnbchain.wallet/binance-wallet/dapp?url=${currentUrl}`;
    }
    return null;
  }, []);

  const connectWallet = async (type = 'solana', walletName = null) => {
    setIsConnecting(true);
    try {
      if (type === 'solana') {
        const solanaProvider = getSolanaProvider(walletName);

        if (!solanaProvider) {
          if (isMobile) {
            const deepLink = getMobileBrowserDeepLink(walletName);
            if (deepLink) {
              window.location.href = deepLink;
              setIsConnecting(false);
              return;
            }
          }
          alert('No Solana wallet detected. Install Phantom, Solflare, or Backpack and refresh.');
          setIsConnecting(false);
          return;
        }

        try {
          const response = await solanaProvider.connect({ onlyIfTrusted: false });
          const address = response.publicKey.toString();
          setAccount(address);
          setWalletType('solana');
          setSelectedNetwork('solana');
          localStorage.setItem('connectedWallet', address);
          localStorage.setItem('walletType', 'solana');
          localStorage.setItem('selectedNetwork', 'solana');
          fetchAccountBalances(address, 'solana');
        } catch (e) {
          console.error('Solana wallet connection error:', e);
          if (e.code === 4001) {
            console.log('User rejected connection');
          } else {
            alert(`Failed to connect ${walletName || 'Solana'} wallet. Please try again.`);
          }
        }
        setIsConnecting(false);
      } else if (type === 'bnb') {
        // If user explicitly chose a wallet brand that isn't injected, use WalletConnect
        // so we don't silently fall back to another injected wallet (usually MetaMask).
        if (!isRequestedInjectedWalletAvailable(walletName)) {
          await connectWallet('walletconnect', walletName);
          return;
        }

        const evmProvider = getEvmProvider(walletName);
        if (!evmProvider) {
          // On mobile browsers, first open the selected wallet app browser.
          if (isMobile) {
            const deepLink = getMobileBrowserDeepLink(walletName);
            if (deepLink) {
              window.location.href = deepLink;
              setIsConnecting(false);
              return;
            }
          }
          // Fallback to WalletConnect when no injected EVM provider is available.
          await connectWallet('walletconnect', walletName);
          return;
        }

        try {
          const accounts = await evmProvider.request({
            method: 'eth_requestAccounts'
          });

          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
          }

          const currentChainIdAtConnect = await evmProvider.request({ method: 'eth_chainId' });

          setAccount(accounts[0]);
          const isEthereumRequested = String(walletName || '').toLowerCase().includes('ethereum');
          const targetNetwork = isEthereumRequested
            ? 'ethereum'
            : currentChainIdAtConnect === '0x1'
              ? 'ethereum'
              : 'bsc';
          const targetChainId = isEthereumRequested ? '0x1' : '0x38';
          const targetChainName = isEthereumRequested ? 'Ethereum Mainnet' : 'BNB Smart Chain';
          const targetCurrency = isEthereumRequested
            ? { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
            : { name: 'BNB', symbol: 'BNB', decimals: 18 };
          const targetRpcUrls = isEthereumRequested
            ? ['https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161']
            : ['https://bsc-dataseed.binance.org/'];
          const targetExplorerUrls = isEthereumRequested
            ? ['https://etherscan.io/']
            : ['https://bscscan.com/'];

          const currentChainId = await evmProvider.request({ method: 'eth_chainId' });
          if (currentChainId !== targetChainId) {
            try {
              await evmProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetChainId }],
              });
            } catch (switchError) {
              if (switchError.code === 4902) {
                await evmProvider.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: targetChainId,
                    chainName: targetChainName,
                    nativeCurrency: targetCurrency,
                    rpcUrls: targetRpcUrls,
                    blockExplorerUrls: targetExplorerUrls
                  }]
                });
              } else {
                throw switchError;
              }
            }
          }

          setWalletType('bnb');
          setSelectedNetwork(targetNetwork);
          localStorage.setItem('connectedWallet', accounts[0]);
          localStorage.setItem('walletType', 'bnb');
          localStorage.setItem('selectedNetwork', targetNetwork);
          fetchAccountBalances(accounts[0], targetNetwork);
        } catch (bnbError) {
          if (bnbError.code === 4001) {
            console.log('User rejected wallet connection');
          } else {
            console.error('BNB wallet connection error:', bnbError);
          }
          throw bnbError;
        }
      } else if (type === 'walletconnect') {
        try {
          setWcSelectedWallet(walletName || null);
          const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

          const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
          const wcChainId = selectedNetwork === 'ethereum' ? 1 : 56;
          const provider = new WalletConnectProvider({
            infuraId: '9aa3d95b3bc440fa88ea12eaa4456161',
            chainId: wcChainId,
            rpc: {
              1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
              56: 'https://bsc-dataseed.binance.org/',
            },
            qrcodeModal: {
              open: (uri) => {
                setWcUri(uri);
                setShowWcQr(true);
                if (walletName && isMobile) {
                  const targetUrl = getWalletDeepLinkUrl(walletName, uri);
                  setTimeout(() => {
                    if (targetUrl) {
                      window.location.href = targetUrl;
                    }
                  }, 150);
                }
              },
              close: () => {
                setShowWcQr(false);
                setWcUri(null);
              }
            }
          });

          await provider.enable();
          const accounts = provider.accounts;

          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setWalletType('walletconnect');
            setWcProvider(provider);
            const connectedChain = provider.chainId === 1 ? 'ethereum' : 'bsc';
            setSelectedNetwork(connectedChain);
            localStorage.setItem('connectedWallet', accounts[0]);
            localStorage.setItem('walletType', 'walletconnect');
            localStorage.setItem('selectedNetwork', connectedChain);
            setShowWcQr(false);
            setWcUri(null);
            setWcSelectedWallet(null);
            fetchAccountBalances(accounts[0], connectedChain);
          }
        } catch (wcError) {
          console.error('WalletConnect error:', wcError);
          setShowWcQr(false);
          setWcUri(null);
          setWcSelectedWallet(null);
          if (wcError.code !== 4001 && wcError.message !== 'Modal closed by user') {
            alert('Failed to connect via WalletConnect.\n\nTry these alternatives:\n- MetaMask / Trust Wallet for BNB\n- Phantom Wallet for Solana\n\nOr check your internet connection and try again.');
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      if (error.code !== 4001) {
        alert('Failed to connect wallet. Please try again.');
      }
    }
    setIsConnecting(false);
  };

  const disconnectWallet = async () => {
    if (wcProvider) {
      await wcProvider.disconnect();
      setWcProvider(null);
    }
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

    if (account && (walletType === 'ethereum' || walletType === 'bnb' || walletType === 'walletconnect') && network.id !== 'solana') {
      const evmProvider = getEvmProvider() || window.ethereum;
      if (!evmProvider?.request) return;
      try {
        await evmProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: network.id }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            const chainConfigs = {
              'ethereum': {
                chainId: '0x1',
                chainName: 'Ethereum Mainnet',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
                blockExplorerUrls: ['https://etherscan.io/']
              },
              'polygon': {
                chainId: '0x89',
                chainName: 'Polygon',
                nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/']
              }
            };
            if (chainConfigs[networkKey]) {
              await evmProvider.request({
                method: 'wallet_addEthereumChain',
                params: [chainConfigs[networkKey]]
              });
            }
          } catch (addError) {
            console.error('Failed to add network:', addError);
          }
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

