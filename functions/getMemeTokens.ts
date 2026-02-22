Deno.serve(async (req) => {
  try {    
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=100&page=1&sparkline=false');
      const data = await response.json();
      return Response.json({ success: true, data });
    } catch (error) {
      console.error('CoinGecko failed:', error);
      const response = await fetch('https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=100&sortBy=market_cap&sortType=desc&convert=USD');
      const data = await response.json();
      return Response.json({ success: true, data: data.data?.cryptoCurrencyList || [] });
    }
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ success: false, data: [], error: error.message }, { status: 500 });
  }
});
