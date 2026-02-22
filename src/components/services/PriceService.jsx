import { appClient } from '@/api/appClient';

// Fetch real-time prices from CoinGecko API - MEME TOKENS ONLY
export const fetchLivePrices = async () => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=dogecoin,shiba-inu,pepe,floki,bonk,dogwifcoin,baby-doge-coin,meme,wojak,turbo&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true'
    );
    const data = await response.json();
    
    return {
      DOGE: {
        price_usd: data.dogecoin?.usd || 0,
        change_24h: data.dogecoin?.usd_24h_change || 0,
        volume_24h: data.dogecoin?.usd_24h_vol || 0,
        market_cap: data.dogecoin?.usd_market_cap || 0,
      },
      SHIB: {
        price_usd: data['shiba-inu']?.usd || 0,
        change_24h: data['shiba-inu']?.usd_24h_change || 0,
        volume_24h: data['shiba-inu']?.usd_24h_vol || 0,
        market_cap: data['shiba-inu']?.usd_market_cap || 0,
      },
      PEPE: {
        price_usd: data.pepe?.usd || 0,
        change_24h: data.pepe?.usd_24h_change || 0,
        volume_24h: data.pepe?.usd_24h_vol || 0,
        market_cap: data.pepe?.usd_market_cap || 0,
      },
      FLOKI: {
        price_usd: data.floki?.usd || 0,
        change_24h: data.floki?.usd_24h_change || 0,
        volume_24h: data.floki?.usd_24h_vol || 0,
        market_cap: data.floki?.usd_market_cap || 0,
      },
      BONK: {
        price_usd: data.bonk?.usd || 0,
        change_24h: data.bonk?.usd_24h_change || 0,
        volume_24h: data.bonk?.usd_24h_vol || 0,
        market_cap: data.bonk?.usd_market_cap || 0,
      },
      WIF: {
        price_usd: data.dogwifcoin?.usd || 0,
        change_24h: data.dogwifcoin?.usd_24h_change || 0,
        volume_24h: data.dogwifcoin?.usd_24h_vol || 0,
        market_cap: data.dogwifcoin?.usd_market_cap || 0,
      },
      BABYDOGE: {
        price_usd: data['baby-doge-coin']?.usd || 0,
        change_24h: data['baby-doge-coin']?.usd_24h_change || 0,
        volume_24h: data['baby-doge-coin']?.usd_24h_vol || 0,
        market_cap: data['baby-doge-coin']?.usd_market_cap || 0,
      },
      MEME: {
        price_usd: data.meme?.usd || 0,
        change_24h: data.meme?.usd_24h_change || 0,
        volume_24h: data.meme?.usd_24h_vol || 0,
        market_cap: data.meme?.usd_market_cap || 0,
      },
      WOJAK: {
        price_usd: data.wojak?.usd || 0,
        change_24h: data.wojak?.usd_24h_change || 0,
        volume_24h: data.wojak?.usd_24h_vol || 0,
        market_cap: data.wojak?.usd_market_cap || 0,
      },
      TURBO: {
        price_usd: data.turbo?.usd || 0,
        change_24h: data.turbo?.usd_24h_change || 0,
        volume_24h: data.turbo?.usd_24h_vol || 0,
        market_cap: data.turbo?.usd_market_cap || 0,
      },
    };
  } catch (error) {
    console.error('Failed to fetch live prices:', error);
    return null;
  }
};

// Update tokens in database with live prices
export const updateTokenPrices = async () => {
  const prices = await fetchLivePrices();
  if (!prices) return;

  const tokenLogos = {
    DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
    SHIB: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png',
    PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
    FLOKI: 'https://cryptologos.cc/logos/floki-inu-floki-logo.png',
    BONK: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
    WIF: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
    BABYDOGE: 'https://assets.coingecko.com/coins/images/16125/small/Baby_Doge.png',
    MEME: 'https://assets.coingecko.com/coins/images/32569/small/meme.jpg',
    WOJAK: 'https://assets.coingecko.com/coins/images/30075/small/wojak.png',
    TURBO: 'https://assets.coingecko.com/coins/images/30024/small/turbo.png',
  };

  const tokenNames = {
    DOGE: 'Dogecoin',
    SHIB: 'Shiba Inu',
    PEPE: 'Pepe',
    FLOKI: 'Floki Inu',
    BONK: 'Bonk',
    WIF: 'dogwifhat',
    BABYDOGE: 'Baby Doge Coin',
    MEME: 'Meme',
    WOJAK: 'Wojak',
    TURBO: 'Turbo',
  };

  try {
    // Get existing tokens
    const existingTokens = await appClient.entities.Token.list();
    const existingSymbols = new Set(existingTokens.map(t => t.symbol));

    // Create or update tokens
    for (const [symbol, data] of Object.entries(prices)) {
      const tokenData = {
        symbol,
        name: tokenNames[symbol],
        logo_url: tokenLogos[symbol],
        price_usd: data.price_usd,
        change_24h: data.change_24h,
        volume_24h: data.volume_24h,
        market_cap: data.market_cap,
      };

      if (existingSymbols.has(symbol)) {
        // Update existing token
        const existingToken = existingTokens.find(t => t.symbol === symbol);
        await appClient.entities.Token.update(existingToken.id, tokenData);
      } else {
        // Create new token
        await appClient.entities.Token.create(tokenData);
      }
    }
  } catch (error) {
    console.error('Failed to update token prices:', error);
  }
};

// Get live exchange rate between two tokens
export const getLiveExchangeRate = async (fromSymbol, toSymbol) => {
  const prices = await fetchLivePrices();
  if (!prices || !prices[fromSymbol] || !prices[toSymbol]) {
    return 1;
  }
  
  return prices[fromSymbol].price_usd / prices[toSymbol].price_usd;
};
