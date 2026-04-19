export async function getSwapQuote(req) {
  try {


    const { fromToken, toToken, amount, chain = 'ethereum' } = await req.json();

    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    let swapData;

    // Jupiter for Solana (best aggregator for Solana)
    if (chain === 'solana') {
      try {
        const response = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${amount}&slippageBps=50`,
          { headers: { 'Accept-Encoding': 'gzip' } }
        );
        const quote = await response.json();
        
        if (!quote.outAmount) {
          throw new Error('Invalid quote from Jupiter');
        }

        swapData = {
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct || 0,
          fee: 0.25, // Jupiter fee
          slippage: 0.5,
          protocols: quote.routePlan?.map(r => r.swapInfo?.label).filter(Boolean) || ['Jupiter'],
          chainId: 'solana',
          liquidity: quote.outAmount > 0 ? 'High' : 'Low',
        };
      } catch (error) {
        console.error('Jupiter quote error:', error);
        throw new Error('Failed to fetch quote from Jupiter');
      }
    }
    // PancakeSwap for BSC (with liquidity data)
    else if (chain === 'bsc') {
      try {
        const response = await fetch(
          `https://api.pancakebotapi.com/api/v0/price?outputCurrency=${toToken}&inputCurrency=${fromToken}`
        );
        const quote = await response.json();
        
        const outputAmount = (parseFloat(amount) * parseFloat(quote.outputAmount || 0)).toString();
        
        swapData = {
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: outputAmount,
          priceImpact: quote.priceImpactPct || 0.5,
          fee: 0.25,
          slippage: 0.5,
          protocols: ['PancakeSwap'],
          chainId: 56,
          liquidity: quote.outputAmount > 0 ? 'High' : 'Low',
        };
      } catch (error) {
        console.error('PancakeSwap quote error:', error);
        // Fallback to basic calculation
        swapData = {
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: amount,
          priceImpact: 1,
          fee: 0.25,
          slippage: 0.5,
          protocols: ['PancakeSwap'],
          chainId: 56,
          liquidity: 'Unknown',
        };
      }
    }
    // 1inch for Ethereum and Polygon (multi-source aggregator)
    else {
      const chainId = chain === 'ethereum' ? 1 : 137;
      const apiUrl = `https://api.1inch.io/v5.0/${chainId}`;

      try {
        const quoteUrl = `${apiUrl}/quote?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}`;
        const quoteResponse = await fetch(quoteUrl);
        
        if (!quoteResponse.ok) {
          throw new Error('1inch API error');
        }

        const quote = await quoteResponse.json();

        // Fetch liquidity pool data
        let poolData = null;
        try {
          const poolUrl = `${apiUrl}/liquidity/pools?tokenAddresses=${fromToken},${toToken}`;
          const poolResponse = await fetch(poolUrl);
          if (poolResponse.ok) {
            poolData = await poolResponse.json();
          }
        } catch (e) {
          console.log('Pool data fetch skipped');
        }

        swapData = {
          fromToken,
          toToken,
          fromAmount: quote.fromTokenAmount,
          toAmount: quote.toTokenAmount,
          estimatedGas: quote.gas || 150000,
          priceImpact: quote.priceImpact || 0,
          fee: quote.protocolFee || 0,
          slippage: 0.5,
          protocols: quote.protocols || ['1inch'],
          chainId,
          liquidity: poolData ? 'High' : 'Medium',
          liquidityPools: poolData?.pools?.length || 0,
        };
      } catch (error) {
        console.error('1inch quote error:', error);
        throw new Error('Failed to fetch quote from 1inch');
      }
    }

    return Response.json(swapData);
  } catch (error) {
    console.error('Swap quote error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

