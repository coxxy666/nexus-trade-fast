export async function fetchMemeTokens(req) {
  try {    
    // Fetch from CoinGecko
    const geckoResponse = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h'
    );
    
    if (geckoResponse.ok) {
      const data = await geckoResponse.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const tokens = data.map(coin => ({
          symbol: coin.symbol?.toUpperCase() || 'UNKNOWN',
          name: coin.name || 'Unknown Token',
          address: coin.id || '',
          price_usd: parseFloat(coin.current_price || 0),
          price_change_24h: parseFloat(coin.price_change_percentage_24h || 0),
          volume_24h: parseFloat(coin.total_volume || 0),
          liquidity: parseFloat(coin.market_cap || 0),
          market_cap: parseFloat(coin.market_cap || 0),
          logo_url: coin.image || `https://ui-avatars.com/api/?name=${coin.symbol}&background=random`,
          network: 'multi-chain',
          fdv: parseFloat(coin.fully_diluted_valuation || 0),
          market_cap_rank: coin.market_cap_rank || 999,
        }));
        
        return Response.json({ tokens });
      }
    }
    
    // Fallback to empty array
    return Response.json({ tokens: [] });
  } catch (error) {
    console.error('Error fetching meme tokens:', error);
    return Response.json({ tokens: [], error: error.message }, { status: 500 });
  }
}

