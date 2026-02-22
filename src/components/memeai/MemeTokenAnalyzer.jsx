import { appClient } from '@/api/appClient';
import { apiUrl } from '@/lib/apiUrl';

// Comprehensive AI analysis of meme token
export const analyzeMemeToken = async (tokenData) => {
  try {
    const prompt = `Analyze this meme cryptocurrency token comprehensively:

Token: ${tokenData.name} (${tokenData.symbol})
Price: $${tokenData.price_usd}
24h Change: ${tokenData.price_change_24h}%
24h Volume: $${tokenData.volume_24h?.toLocaleString()}
Liquidity: $${tokenData.liquidity?.toLocaleString()}
Market Cap: $${tokenData.market_cap?.toLocaleString()}
Network: ${tokenData.network}

Provide detailed analysis including:
1. Overall risk level and detailed risk breakdown
2. Rug pull probability
3. Tokenomics analysis (distribution, burn mechanisms, transaction taxes if available)
4. Pump-and-dump scheme detection based on price patterns and social media
5. Sentiment and meme virality
6. Key risks and strengths
7. Moonshot potential prediction (SPECULATIVE) with confidence level
8. Token outlook`;

    const analysis = await appClient.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          confidence_score: {
            type: "number",
            description: "How confident the AI is about this analysis 0-100",
            minimum: 0,
            maximum: 100
          },
          risk_level: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          risk_score: {
            type: "number",
            description: "Overall risk score 0-100"
          },
          risk_breakdown: {
            type: "object",
            properties: {
              liquidity_risk: { type: "number" },
              volatility_risk: { type: "number" },
              tokenomics_risk: { type: "number" },
              social_risk: { type: "number" },
              technical_risk: { type: "number" }
            }
          },
          rug_pull_probability: {
            type: "number",
            description: "Probability of rug pull 0-100"
          },
          pump_dump_score: {
            type: "number",
            description: "Pump and dump likelihood 0-100"
          },
          pump_dump_indicators: {
            type: "array",
            items: { type: "string" }
          },
          meme_score: {
            type: "number",
            description: "Meme virality score 0-100"
          },
          sentiment: {
            type: "string",
            enum: ["very_positive", "positive", "neutral", "negative", "very_negative"]
          },
          tokenomics: {
            type: "object",
            properties: {
              distribution_score: { type: "number" },
              has_burn_mechanism: { type: "boolean" },
              transaction_tax: { type: "string" },
              holder_concentration: { type: "string" }
            }
          },
          moonshot_potential: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "string", enum: ["very_low", "low", "medium", "high", "very_high"] },
              reasoning: { type: "string" },
              speculative_price_target: { type: "string" }
            }
          },
          liquidity_locked: {
            type: "boolean"
          },
          contract_verified: {
            type: "boolean"
          },
          vulnerabilities: {
            type: "array",
            items: { type: "string" }
          },
          analysis_summary: {
            type: "string"
          },
          detailed_analysis: {
            type: "string"
          },
          key_risks: {
            type: "array",
            items: { type: "string" }
          },
          strengths: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return analysis;
  } catch (error) {
    console.error('Error analyzing token:', error);
    return null;
  }
};

// Get sentiment from social media and news
export const getTokenSentiment = async (symbol, name) => {
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

    return sentiment;
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    return null;
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
