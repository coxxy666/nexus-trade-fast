// Real-time meme token scanner service
// Fetches newly launched tokens and analyzes on-chain data

export async function fetchNewlyLaunchedTokens(chain = 'solana', limit = 50) {
  try {
    // Fetch latest tokens from DexScreener
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/new/${chain}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch new tokens');
    }
    
    const data = await response.json();
    return data.pairs || [];
  } catch (error) {
    console.error('Error fetching new tokens:', error);
    return [];
  }
}

export async function analyzeTokenRisk(tokenAddress, chain = 'solana') {
  try {
    // Fetch token data from DexScreener
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const pair = data.pairs?.[0];
    
    if (!pair) return null;
    
    // Calculate risk score based on multiple factors
    let riskScore = 0;
    const flags = [];
    
    // Liquidity check (low liquidity = high risk)
    const liquidity = pair.liquidity?.usd || 0;
    if (liquidity < 5000) {
      riskScore += 30;
      flags.push('Very Low Liquidity');
    } else if (liquidity < 20000) {
      riskScore += 15;
      flags.push('Low Liquidity');
    }
    
    // Volume check
    const volume24h = pair.volume?.h24 || 0;
    if (volume24h < 1000) {
      riskScore += 20;
      flags.push('Low Trading Volume');
    }
    
    // Price change volatility
    const priceChange = Math.abs(pair.priceChange?.h24 || 0);
    if (priceChange > 100) {
      riskScore += 25;
      flags.push('Extreme Volatility');
    } else if (priceChange > 50) {
      riskScore += 15;
      flags.push('High Volatility');
    }
    
    // Transaction count
    const txCount = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
    if (txCount < 10) {
      riskScore += 20;
      flags.push('Very Few Transactions');
    }
    
    // Market cap check
    const marketCap = pair.fdv || 0;
    if (marketCap < 10000) {
      riskScore += 15;
      flags.push('Micro Cap');
    }
    
    // Honeypot detection (sell ratio much lower than buy)
    const buys = pair.txns?.h24?.buys || 0;
    const sells = pair.txns?.h24?.sells || 0;
    if (buys > 0 && sells / buys < 0.3) {
      riskScore += 35;
      flags.push('Potential Honeypot - Low Sell Activity');
    }
    
    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);
    
    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    
    return {
      riskScore,
      riskLevel,
      flags,
      liquidity,
      volume24h,
      marketCap,
      txCount,
      priceChange24h: pair.priceChange?.h24 || 0,
      holders: pair.info?.holders || 'Unknown',
      contractVerified: pair.info?.verified || false,
      pairAge: pair.pairCreatedAt || null,
    };
  } catch (error) {
    console.error('Error analyzing token risk:', error);
    return null;
  }
}

export async function scanLatestMemeTokens(chain = 'solana') {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=meme`
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const pairs = data.pairs || [];
    
    // Filter for recently created pairs (last 24 hours)
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return pairs
      .filter(pair => {
        const createdAt = pair.pairCreatedAt || 0;
        return createdAt > oneDayAgo;
      })
      .slice(0, 50);
  } catch (error) {
    console.error('Error scanning meme tokens:', error);
    return [];
  }
}
