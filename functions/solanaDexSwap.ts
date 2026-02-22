export async function solanaDexSwap(req) {
  try {
    const { inputMint, outputMint, amount, userPublicKey } = await req.json();

    if (!inputMint || !outputMint || !amount || !userPublicKey) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (inputMint.length < 32 || outputMint.length < 32) {
      return Response.json({ error: 'Invalid token contract address format for Solana' }, { status: 400 });
    }

    const quoteUrl = new URL('https://lite-api.jup.ag/swap/v1/quote');
    quoteUrl.searchParams.set('inputMint', inputMint);
    quoteUrl.searchParams.set('outputMint', outputMint);
    quoteUrl.searchParams.set('amount', String(Math.floor(Number(amount))));
    quoteUrl.searchParams.set('slippageBps', '50');

    const quoteResponse = await fetch(quoteUrl.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!quoteResponse.ok) {
      const txt = await quoteResponse.text().catch(() => '');
      throw new Error(`Failed to get Jupiter quote (${quoteResponse.status}): ${txt || quoteResponse.statusText}`);
    }

    const quote = await quoteResponse.json();
    if (!quote || !quote.outAmount) {
      throw new Error('No output amount from Jupiter');
    }

    const swapResponse = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!swapResponse.ok) {
      const txt = await swapResponse.text().catch(() => '');
      throw new Error(`Failed to get Jupiter swap transaction (${swapResponse.status}): ${txt || swapResponse.statusText}`);
    }

    const swapData = await swapResponse.json();
    const { swapTransaction } = swapData;
    if (!swapTransaction) {
      throw new Error('Jupiter returned empty swap transaction');
    }

    return Response.json({
      success: true,
      swapTransaction,
      outAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      inputAmount: amount,
    });
  } catch (error) {
    console.error('Solana DEX swap error:', error);
    return Response.json(
      { error: error.message || 'Failed to prepare swap' },
      { status: 500 }
    );
  }
}
