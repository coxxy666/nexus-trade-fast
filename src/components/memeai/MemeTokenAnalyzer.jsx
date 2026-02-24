import { appClient } from '@/api/appClient';
import { apiUrl } from '@/lib/apiUrl';

// Comprehensive AI analysis of meme token
export const analyzeMemeToken = async (tokenData) => {
  try {
    const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
    const safe = (v) => Number(v || 0);

    const name = tokenData?.name || 'Unknown Token';
    const symbol = tokenData?.symbol || 'UNKNOWN';
    const network = String(tokenData?.network || 'unknown');
    const price = safe(tokenData?.price_usd);
    const change24h = safe(tokenData?.price_change_24h);
    const volume24h = safe(tokenData?.volume_24h);
    const liquidity = safe(tokenData?.liquidity);
    const marketCap = safe(tokenData?.market_cap);
    const volumeToMcap = marketCap > 0 ? volume24h / marketCap : 0;

    const liquidityRisk =
      liquidity <= 0 ? 95 :
      liquidity < 50000 ? 90 :
      liquidity < 200000 ? 75 :
      liquidity < 1000000 ? 55 : 30;
    const volatilityRisk = clamp(Math.abs(change24h) * 1.8, 10, 95);
    const tokenomicsRisk =
      marketCap <= 0 ? 85 :
      marketCap < 1000000 ? 75 :
      marketCap < 10000000 ? 58 :
      marketCap < 100000000 ? 45 : 30;
    const socialRisk =
      volumeToMcap <= 0 ? 70 :
      volumeToMcap < 0.03 ? 68 :
      volumeToMcap < 0.12 ? 52 :
      volumeToMcap < 0.45 ? 38 : 30;
    const technicalRisk =
      network.includes('solana') || network.includes('bsc') || network.includes('ethereum')
        ? 35
        : 55;

    const riskScore = clamp(
      liquidityRisk * 0.3 +
      volatilityRisk * 0.25 +
      tokenomicsRisk * 0.25 +
      socialRisk * 0.1 +
      technicalRisk * 0.1
    );

    const riskLevel = riskScore >= 67 ? 'high' : riskScore >= 42 ? 'medium' : 'low';
    const rugPullProbability = clamp(
      liquidityRisk * 0.45 + tokenomicsRisk * 0.3 + technicalRisk * 0.15 + volatilityRisk * 0.1
    );
    const pumpDumpScore = clamp(volatilityRisk * 0.55 + clamp(volumeToMcap * 130, 0, 100) * 0.45);
    const memeScore = clamp(
      40 +
      clamp((volume24h / 1000000) * 6, 0, 24) +
      clamp(change24h, -20, 20) * 0.8 +
      (riskLevel === 'low' ? 10 : riskLevel === 'medium' ? 4 : -6)
    );

    const sentiment =
      change24h >= 18 ? 'very_positive' :
      change24h >= 5 ? 'positive' :
      change24h <= -18 ? 'very_negative' :
      change24h <= -5 ? 'negative' :
      'neutral';

    const metrics = [price, marketCap, liquidity, volume24h, Math.abs(change24h)];
    const validMetricCount = metrics.filter((v) => Number.isFinite(v) && v > 0).length;
    const completeness = validMetricCount / metrics.length;

    const turnoverHealth = marketCap > 0 ? clamp((volumeToMcap / 0.35) * 100, 0, 100) : 30;
    const liquidityDepth =
      marketCap > 0
        ? clamp((liquidity / (marketCap * 0.25)) * 100, 0, 100)
        : clamp((liquidity / 200000) * 100, 0, 100);
    const stability = clamp(100 - Math.abs(change24h) * 1.8, 5, 100);

    const confidenceScore = clamp(
      20 +
      completeness * 35 +
      turnoverHealth * 0.2 +
      liquidityDepth * 0.2 +
      stability * 0.25
    );

    const keyRisks = [];
    const strengths = [];
    const vulnerabilities = [];
    const pumpDumpIndicators = [];

    if (liquidityRisk >= 75) {
      keyRisks.push('Low liquidity can enable sharp slippage and manipulation.');
      vulnerabilities.push('Liquidity depth is limited for larger orders.');
    } else {
      strengths.push('Liquidity is relatively stronger versus typical meme tokens.');
    }
    if (volatilityRisk >= 70) {
      keyRisks.push('High short-term volatility increases downside risk.');
      pumpDumpIndicators.push('Large 24h price swings detected.');
    } else {
      strengths.push('Recent volatility is within a manageable range.');
    }
    if (tokenomicsRisk >= 65) {
      keyRisks.push('Small market cap profile can amplify adverse moves.');
    } else {
      strengths.push('Market-cap scale provides better resilience than micro-caps.');
    }
    if (volumeToMcap > 0.5) {
      pumpDumpIndicators.push('Very high turnover ratio may indicate speculative rotations.');
    }
    if (volumeToMcap < 0.03 && marketCap > 0) {
      keyRisks.push('Low turnover relative to market cap may reduce exit liquidity.');
    }

    const moonshotScore = clamp(memeScore * 0.6 + (100 - riskScore) * 0.25 + clamp(change24h + 20, 0, 40) * 0.5);
    const moonshotConfidence =
      moonshotScore >= 80 ? 'high' :
      moonshotScore >= 65 ? 'medium' :
      moonshotScore >= 50 ? 'low' :
      'very_low';

    const analysisSummary =
      `${name} (${symbol}) currently screens as ${riskLevel.toUpperCase()} risk with a score of ${Math.round(riskScore)}/100. ` +
      `Liquidity ${liquidity > 0 ? `~$${Math.round(liquidity).toLocaleString()}` : 'is limited'}, ` +
      `24h move ${change24h.toFixed(2)}%, and turnover ratio ${(volumeToMcap * 100).toFixed(2)}% are the main drivers.`;

    const detailedAnalysis =
      `Token ${symbol} on ${network} shows liquidity risk ${Math.round(liquidityRisk)}/100, volatility risk ${Math.round(volatilityRisk)}/100, ` +
      `and tokenomics risk ${Math.round(tokenomicsRisk)}/100. Rug-pull probability is estimated at ${Math.round(rugPullProbability)}% from ` +
      `liquidity depth and market-cap profile. Pump-and-dump likelihood is ${Math.round(pumpDumpScore)}% based on 24h momentum and turnover. ` +
      `This model is heuristic and should be combined with contract, holder, and liquidity-lock verification before trading.`;

    return {
      confidence_score: confidenceScore,
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_breakdown: {
        liquidity_risk: liquidityRisk,
        volatility_risk: volatilityRisk,
        tokenomics_risk: tokenomicsRisk,
        social_risk: socialRisk,
        technical_risk: technicalRisk,
      },
      rug_pull_probability: rugPullProbability,
      pump_dump_score: pumpDumpScore,
      pump_dump_indicators: pumpDumpIndicators,
      meme_score: memeScore,
      sentiment,
      tokenomics: {
        distribution_score: clamp(100 - tokenomicsRisk),
        has_burn_mechanism: false,
        transaction_tax: 'Unknown',
        holder_concentration: marketCap < 5000000 ? 'Potentially high' : 'Moderate',
      },
      moonshot_potential: {
        score: moonshotScore,
        confidence: moonshotConfidence,
        reasoning: 'Based on momentum, turnover, and risk-adjusted meme strength.',
        speculative_price_target: price > 0 ? `~$${(price * 1.5).toFixed(8)} (speculative)` : 'N/A',
      },
      liquidity_locked: false,
      contract_verified: false,
      vulnerabilities,
      analysis_summary: analysisSummary,
      detailed_analysis: detailedAnalysis,
      key_risks: keyRisks,
      strengths,
    };
  } catch (error) {
    console.error('Error analyzing token:', error);
    return null;
  }
};

// Get sentiment from social media and news
export const getTokenSentiment = async (symbol, name, tokenData = null) => {
  const deriveLocalSentiment = (data = {}) => {
    const change = Number(data?.price_change_24h || 0);
    const volume = Number(data?.volume_24h || 0);
    const marketCap = Number(data?.market_cap || 0);
    const turnover = marketCap > 0 ? volume / marketCap : 0;

    const score = Math.max(
      0,
      Math.min(
        100,
        50 + change * 1.2 + Math.min(20, turnover * 100)
      )
    );

    const label =
      score >= 70 ? 'positive' :
      score <= 35 ? 'negative' :
      'neutral';

    const buzz =
      turnover >= 0.4 ? 'very_high' :
      turnover >= 0.2 ? 'high' :
      turnover >= 0.08 ? 'moderate' :
      turnover > 0 ? 'low' :
      'very_low';

    return {
      sentiment_score: Math.round(score),
      sentiment_label: label,
      buzz_level: buzz,
      news_highlights: [
        `Local market signal: 24h change ${change.toFixed(2)}%.`,
        `Turnover ratio: ${(turnover * 100).toFixed(2)}% of market cap.`,
      ],
      news_quotes: [],
      community_strength: Math.max(5, Math.min(100, Math.round((turnover * 120) + 20))),
      concerns: change < -10 ? ['Strong negative momentum detected in the last 24h.'] : [],
      positive_signals: change > 10 ? ['Strong positive momentum detected in the last 24h.'] : [],
    };
  };

  // Primary path: direct quotes from backend news/social aggregators.
  try {
    const response = await fetch(apiUrl('/api/token-sentiment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && (Array.isArray(data.news_quotes) || Array.isArray(data.news_highlights))) {
        const quoteCount = Array.isArray(data.news_quotes) ? data.news_quotes.length : 0;
        const highlightCount = Array.isArray(data.news_highlights) ? data.news_highlights.length : 0;
        const isGenericFallback = Number(data?.sentiment_score) === 50 && quoteCount === 0 && highlightCount === 0;
        if (isGenericFallback) {
          return deriveLocalSentiment(tokenData || {});
        }
        return data;
      }
    }
  } catch (error) {
    console.error('Backend sentiment fetch failed, falling back to LLM:', error);
  }

  try {
    const prompt = `Search for recent social media buzz, news, and community sentiment about the cryptocurrency ${name} (${symbol}). 

Provide:
1. Overall sentiment score (0-100, where 100 is extremely positive)
2. Recent news highlights
3. Social media buzz level
4. Community engagement assessment
5. Any controversies or concerns

Focus on Twitter, Reddit, Telegram, and crypto news sources.`;

    const sentiment = await appClient.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sentiment_score: { type: "number" },
          sentiment_label: { type: "string" },
          buzz_level: {
            type: "string",
            enum: ["very_high", "high", "moderate", "low", "very_low"]
          },
          news_highlights: {
            type: "array",
            items: { type: "string" }
          },
          news_quotes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                quote: { type: "string" },
                source: { type: "string" },
                sentiment_type: { type: "string" }
              }
            },
            description: "Direct quotes from news and social media"
          },
          community_strength: { type: "number" },
          concerns: {
            type: "array",
            items: { type: "string" }
          },
          positive_signals: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // If LLM returns generic neutral defaults, derive token-specific local sentiment.
    if (Number(sentiment?.sentiment_score) === 50 && (!sentiment?.news_quotes || sentiment.news_quotes.length === 0)) {
      return deriveLocalSentiment(tokenData || {});
    }
    return sentiment;
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    return deriveLocalSentiment(tokenData || {});
  }
};

// Detect rug pull indicators
export const detectRugPullRisks = (tokenData, analysis) => {
  const risks = [];
  let rugPullScore = 0;

  // Low liquidity risk
  if (tokenData.liquidity < 50000) {
    risks.push('Very low liquidity - high risk of manipulation');
    rugPullScore += 30;
  } else if (tokenData.liquidity < 100000) {
    risks.push('Low liquidity - moderate risk');
    rugPullScore += 15;
  }

  // Price volatility
  if (Math.abs(tokenData.price_change_24h) > 50) {
    risks.push('Extreme price volatility detected');
    rugPullScore += 20;
  }

  // Low volume
  if (tokenData.volume_24h < tokenData.liquidity * 0.1) {
    risks.push('Very low trading volume relative to liquidity');
    rugPullScore += 15;
  }

  // New token with low market cap
  if (tokenData.market_cap < 100000) {
    risks.push('Very low market cap - extremely high risk');
    rugPullScore += 25;
  }

  // AI detected risks
  if (analysis?.vulnerabilities?.length > 0) {
    risks.push(...analysis.vulnerabilities);
  }

  return {
    rugPullScore: Math.min(rugPullScore, 100),
    risks
  };
};

// Calculate comprehensive meme score
export const calculateMemeScore = (tokenData, sentiment) => {
  let score = 50; // Base score

  // Volume factor (higher volume = more popular)
  if (tokenData.volume_24h > 10000000) score += 15;
  else if (tokenData.volume_24h > 1000000) score += 10;
  else if (tokenData.volume_24h > 100000) score += 5;

  // Market cap factor
  if (tokenData.market_cap > 100000000) score += 10;
  else if (tokenData.market_cap > 10000000) score += 5;

  // Sentiment boost
  if (sentiment?.buzz_level === 'very_high') score += 15;
  else if (sentiment?.buzz_level === 'high') score += 10;
  else if (sentiment?.buzz_level === 'moderate') score += 5;

  // Price momentum
  if (tokenData.price_change_24h > 20) score += 10;
  else if (tokenData.price_change_24h > 10) score += 5;
  else if (tokenData.price_change_24h < -20) score -= 10;

  return Math.max(0, Math.min(100, score));
};
