// Service for fetching live cryptocurrency prices
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Map of common token symbols to CoinGecko IDs
const TOKEN_ID_MAP = {
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DOGE': 'dogecoin',
  'SHIB': 'shiba-inu',
  'PEPE': 'pepe',
  'FLOKI': 'floki',
  'BONK': 'bonk',
  'WIF': 'dogwifcoin',
  'DOLPHIN': 'solana', // Fallback to SOL for demo
};

// Fetch live prices for multiple tokens
export const fetchLivePrices = async (symbols) => {
  try {
    const ids = symbols
      .map(symbol => TOKEN_ID_MAP[symbol.toUpperCase()])
      .filter(Boolean)
      .join(',');
    
    if (!ids) return {};

    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    
    const data = await response.json();
    
    // Convert back to symbol-based map
    const priceMap = {};
    Object.entries(TOKEN_ID_MAP).forEach(([symbol, id]) => {
      if (data[id]) {
        priceMap[symbol] = {
          price: data[id].usd,
          change_24h: data[id].usd_24h_change || 0,
        };
      }
    });
    
    return priceMap;
  } catch (error) {
    console.error('Error fetching live prices:', error);
    return {};
  }
};

// Fetch live price for a single token
export const fetchLivePrice = async (symbol) => {
  const prices = await fetchLivePrices([symbol]);
  return prices[symbol] || { price: 0, change_24h: 0 };
};

// Estimate gas fee based on network
export const estimateGasFee = async (network = 'ethereum') => {
  try {
    // For Ethereum mainnet
    if (network === 'ethereum') {
      const response = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        const gasPrice = parseFloat(data.result.ProposeGasPrice);
        const gasLimit = 150000; // Typical swap gas limit
        const ethPrice = await fetchLivePrice('ETH');
        const gasCostUSD = (gasPrice * gasLimit / 1e9) * ethPrice.price;
        return gasCostUSD.toFixed(2);
      }
    }
    
    // Fallback estimates for other networks
    const networkFees = {
      'bsc': '0.15',
      'polygon': '0.05',
      'arbitrum': '0.50',
      'solana': '0.001',
    };
    
    return networkFees[network] || '2.50';
  } catch (error) {
    console.error('Error estimating gas:', error);
    return '2.50'; // Default fallback
  }
};

// Calculate slippage tolerance based on liquidity
export const calculateSlippage = (volume24h, liquidity) => {
  // Higher liquidity = lower slippage
  if (!volume24h || !liquidity || liquidity === 0) return 0.5;
  
  const ratio = volume24h / liquidity;
  
  if (ratio > 0.5) return 0.1; // High volume/liquidity
  if (ratio > 0.2) return 0.3;
  if (ratio > 0.05) return 0.5;
  return 1.0; // Low liquidity
};
