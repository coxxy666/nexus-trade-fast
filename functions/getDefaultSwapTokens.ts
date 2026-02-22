import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
    address: 'So11111111111111111111111111111111111111112',
    price_usd: 180,
    price_change_24h: 0
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    price_usd: 2500,
    price_change_24h: 0
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    logo: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
    address: '0xbb4CdB9CBd36B01bD1cbaAFc831a141f3A445ff0',
    price_usd: 600,
    price_change_24h: 0
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const [solRes, ethRes, bnbRes] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/coins/solana?localization=false'),
        fetch('https://api.coingecko.com/api/v3/coins/ethereum?localization=false'),
        fetch('https://api.coingecko.com/api/v3/coins/binancecoin?localization=false')
      ]);

      const tokens = DEFAULT_TOKENS.map((token, idx) => token);

      if (solRes.ok) {
        const sol = await solRes.json();
        tokens[0] = {
          ...tokens[0],
          price_usd: sol.market_data?.current_price?.usd || tokens[0].price_usd,
          price_change_24h: sol.market_data?.price_change_percentage_24h || 0
        };
      }

      if (ethRes.ok) {
        const eth = await ethRes.json();
        tokens[1] = {
          ...tokens[1],
          price_usd: eth.market_data?.current_price?.usd || tokens[1].price_usd,
          price_change_24h: eth.market_data?.price_change_percentage_24h || 0
        };
      }

      if (bnbRes.ok) {
        const bnb = await bnbRes.json();
        tokens[2] = {
          ...tokens[2],
          price_usd: bnb.market_data?.current_price?.usd || tokens[2].price_usd,
          price_change_24h: bnb.market_data?.price_change_percentage_24h || 0
        };
      }

      return Response.json({ tokens });
    } catch (error) {
      return Response.json({ tokens: DEFAULT_TOKENS });
    }
  } catch (error) {
    console.error('Error in getDefaultSwapTokens:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});