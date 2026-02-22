export async function executeSwap(req) {
  try {
    const { chain, fromToken, toToken, amount, userPublicKey } = await req.json();
    const parsedAmount = Number(amount);

    if (!chain || !fromToken || !toToken || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !userPublicKey) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (chain === 'solana') {
      return await executeSolanaSwap(fromToken, toToken, parsedAmount, userPublicKey);
    }

    if (chain === 'bsc') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(String(fromToken)) || !/^0x[a-fA-F0-9]{40}$/.test(String(toToken))) {
        return Response.json({ error: 'BSC swap requires valid EVM token addresses' }, { status: 400 });
      }
      return await executeBSCSwap(fromToken, toToken, parsedAmount, userPublicKey);
    }

    if (chain === 'ethereum') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(String(fromToken)) || !/^0x[a-fA-F0-9]{40}$/.test(String(toToken))) {
        return Response.json({ error: 'Ethereum swap requires valid EVM token addresses' }, { status: 400 });
      }
      return await executeEthereumSwap(fromToken, toToken, parsedAmount, userPublicKey);
    }

    return Response.json({ error: 'Unsupported chain' }, { status: 400 });
  } catch (error) {
    console.error('Swap execution error:', error);
    return Response.json({
      error: error.message || 'Swap execution failed'
    }, { status: 500 });
  }
}

async function fetchJsonWithDetails(url, init, label) {
  const response = await fetch(url, init);
  const bodyText = await response.text();
  let body;

  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    const detail = typeof body?.error === 'string'
      ? body.error
      : typeof body?.message === 'string'
        ? body.message
        : JSON.stringify(body).slice(0, 500);
    throw new Error(`${label} failed (${response.status}): ${detail}`);
  }

  return body;
}

async function executeSolanaSwap(fromToken, toToken, amount, userPublicKey) {
  try {
    const quoteUrl = new URL('https://lite-api.jup.ag/swap/v1/quote');
    quoteUrl.searchParams.set('inputMint', fromToken);
    quoteUrl.searchParams.set('outputMint', toToken);
    quoteUrl.searchParams.set('amount', String(Math.floor(amount)));
    quoteUrl.searchParams.set('slippageBps', '50');

    const quote = await fetchJsonWithDetails(
      quoteUrl.toString(),
      undefined,
      'Jupiter quote'
    );

    if (!quote?.outAmount) {
      throw new Error('Jupiter quote returned no output amount');
    }

    const swapData = await fetchJsonWithDetails(
      'https://lite-api.jup.ag/swap/v1/swap',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      },
      'Jupiter swap'
    );

    const { swapTransaction } = swapData;
    if (!swapTransaction) {
      throw new Error('Jupiter swap response did not include swapTransaction');
    }

    return Response.json({
      success: true,
      swapTransaction,
      outAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct
    });
  } catch (error) {
    return Response.json({
      error: error.message || 'Solana swap failed'
    }, { status: 500 });
  }
}

async function executeBSCSwap(fromToken, toToken, amount, userPublicKey) {
  try {
    const amountCandidates = [
      String(amount),
      String(Math.floor(Number(amount) * 1e18)),
    ];

    let swapQuote = null;
    let lastError = null;
    for (const amountCandidate of amountCandidates) {
      try {
        const quoteUrl = new URL('https://open-api.openocean.finance/v3/bsc/swap_quote');
        quoteUrl.searchParams.set('inTokenAddress', fromToken);
        quoteUrl.searchParams.set('outTokenAddress', toToken);
        quoteUrl.searchParams.set('amount', amountCandidate);
        quoteUrl.searchParams.set('account', userPublicKey);
        quoteUrl.searchParams.set('slippage', '0.5');
        quoteUrl.searchParams.set('gasPrice', '3');

        const candidate = await fetchJsonWithDetails(
          quoteUrl.toString(),
          undefined,
          'OpenOcean BSC swap quote'
        );
        if (candidate?.code === 200 && candidate?.data?.to && candidate?.data?.data) {
          swapQuote = candidate;
          break;
        }
        lastError = new Error('OpenOcean did not return transaction data');
      } catch (error) {
        lastError = error;
      }
    }

    if (!swapQuote) {
      throw lastError || new Error('OpenOcean did not return transaction data');
    }

    return Response.json({
      success: true,
      tx: {
        to: swapQuote.data.to,
        data: swapQuote.data.data,
        value: swapQuote.data.value || '0',
        gas: swapQuote.data.estimatedGas
      },
      toAmount: swapQuote.data.outAmount,
      estimatedGas: swapQuote.data.estimatedGas
    });
  } catch (error) {
    return Response.json({
      error: error.message || 'BSC swap failed'
    }, { status: 500 });
  }
}

async function executeEthereumSwap(fromToken, toToken, amount, userPublicKey) {
  try {
    const amountCandidates = [
      String(amount),
      String(Math.floor(Number(amount) * 1e18)),
    ];

    let swapQuote = null;
    let lastError = null;
    for (const amountCandidate of amountCandidates) {
      try {
        const quoteUrl = new URL('https://open-api.openocean.finance/v3/eth/swap_quote');
        quoteUrl.searchParams.set('inTokenAddress', fromToken);
        quoteUrl.searchParams.set('outTokenAddress', toToken);
        quoteUrl.searchParams.set('amount', amountCandidate);
        quoteUrl.searchParams.set('account', userPublicKey);
        quoteUrl.searchParams.set('slippage', '0.5');

        const candidate = await fetchJsonWithDetails(
          quoteUrl.toString(),
          undefined,
          'OpenOcean Ethereum swap quote'
        );
        if (candidate?.code === 200 && candidate?.data?.to && candidate?.data?.data) {
          swapQuote = candidate;
          break;
        }
        lastError = new Error('OpenOcean did not return Ethereum transaction data');
      } catch (error) {
        lastError = error;
      }
    }

    if (!swapQuote) {
      throw lastError || new Error('OpenOcean did not return Ethereum transaction data');
    }

    return Response.json({
      success: true,
      tx: {
        to: swapQuote.data.to,
        data: swapQuote.data.data,
        value: swapQuote.data.value || '0',
        gas: swapQuote.data.estimatedGas
      },
      toAmount: swapQuote.data.outAmount,
      estimatedGas: swapQuote.data.estimatedGas
    });
  } catch (error) {
    return Response.json({
      error: error.message || 'Ethereum swap failed'
    }, { status: 500 });
  }
}
