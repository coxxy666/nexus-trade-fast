import { appClient } from '@/api/appClient';

// Generate AI-powered risk analysis for a token
export const analyzeToken = async (tokenSymbol, tokenData) => {
  try {
    const prompt = `Analyze the following memecoin for investment risk:

Token: ${tokenSymbol}
Market Cap: $${tokenData?.market_cap?.toLocaleString() || 'Unknown'}
24h Volume: $${tokenData?.volume_24h?.toLocaleString() || 'Unknown'}
Price: $${tokenData?.price_usd || 'Unknown'}
24h Change: ${tokenData?.change_24h?.toFixed(2) || '0'}%

Provide a comprehensive risk analysis including:
1. Overall risk level (low/medium/high)
2. Rug pull probability (0-100%)
3. Key vulnerabilities or red flags
4. Holder distribution concerns
5. Liquidity assessment
6. Contract security assessment
7. Detailed analysis summary

Be realistic and critical in your assessment.`;

    const result = await appClient.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          risk_level: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          risk_score: {
            type: "number",
            description: "0-100 numerical score"
          },
          rug_pull_probability: {
            type: "number",
            description: "0-100 percentage"
          },
          liquidity_locked: {
            type: "boolean"
          },
          liquidity_lock_days: {
            type: "number"
          },
          contract_verified: {
            type: "boolean"
          },
          vulnerabilities: {
            type: "array",
            items: { type: "string" }
          },
          holder_distribution: {
            type: "object",
            properties: {
              top_10_percentage: { type: "number" },
              whale_count: { type: "number" }
            }
          },
          analysis_details: {
            type: "string",
            description: "Detailed analysis summary"
          }
        }
      }
    });

    // Save to database
    const analysis = await appClient.entities.MemeAI.create({
      token_symbol: tokenSymbol,
      risk_level: result.risk_level,
      risk_score: result.risk_score,
      rug_pull_probability: result.rug_pull_probability,
      liquidity_locked: result.liquidity_locked || false,
      liquidity_lock_days: result.liquidity_lock_days || 0,
      contract_verified: result.contract_verified || false,
      vulnerabilities: result.vulnerabilities || [],
      holder_distribution: result.holder_distribution || { top_10_percentage: 0, whale_count: 0 },
      analysis_details: result.analysis_details,
      last_updated: new Date().toISOString()
    });

    return analysis;
  } catch (error) {
    console.error('Failed to analyze token:', error);
    throw error;
  }
};

// Get cached analysis or generate new one
export const getTokenAnalysis = async (tokenSymbol, tokenData) => {
  try {
    // Check for recent analysis (within 1 hour)
    const existing = await appClient.entities.MemeAI.filter({ token_symbol: tokenSymbol }, '-last_updated', 1);
    
    if (existing.length > 0) {
      const lastUpdate = new Date(existing[0].last_updated);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastUpdate > hourAgo) {
        return existing[0];
      }
    }
    
    // Generate new analysis
    return await analyzeToken(tokenSymbol, tokenData);
  } catch (error) {
    console.error('Failed to get token analysis:', error);
    return null;
  }
};
