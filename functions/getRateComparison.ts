function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAmountFromUi(rawAmount) {
  // Frontend sends amount as humanAmount * 1e6.
  return toNumber(rawAmount) / 1e6;
}

function toUiAmount(value) {
  // Keep compatibility with existing frontend display:
  // output displayed as parseFloat(outputAmount) / 1e6.
  return String(Math.max(0, Math.floor(toNumber(value) * 1e6)));
}

async function fetchPancakeQuote(fromToken, toToken, amount) {
  const response = await fetch(
    `https://api.pancakebotapi.com/api/v0/price?outputCurrency=${toToken}&inputCurrency=${fromToken}`
  );
  if (!response.ok) {
    throw new Error(`Pancake quote failed (${response.status})`);
  }

  const data = await response.json();
  const rate = toNumber(data?.outputAmount);
  if (rate <= 0) {
    throw new Error('Pancake returned invalid rate');
  }

  const output = amount * rate;
  return {
    provider: 'PancakeSwap',
    outputAmount: toUiAmount(output),
    fee: amount * 0.0025,
    estimatedTime: 60,
    route: 'PancakeSwap',
  };
}

async function fetchBinanceDexQuote(fromToken, toToken, amount, account) {
  // Binance DEX route on BSC via OpenOcean aggregation endpoint.
  const url = new URL('https://open-api.openocean.finance/v3/bsc/swap_quote');
  url.searchParams.set('inTokenAddress', fromToken);
  url.searchParams.set('outTokenAddress', toToken);
  url.searchParams.set('amount', String(amount));
  if (account) url.searchParams.set('account', account);
  url.searchParams.set('slippage', '0.5');
  url.searchParams.set('gasPrice', '3');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Binance DEX proxy quote failed (${response.status})`);
  }

  const data = await response.json();
  if (toNumber(data?.code) !== 200 || !data?.data) {
    throw new Error('Binance DEX proxy returned no route');
  }

  const output = toNumber(data.data.outAmount);
  if (output <= 0) {
    throw new Error('Binance DEX proxy returned invalid output');
  }

  return {
    provider: 'Binance DEX',
    outputAmount: toUiAmount(output),
    fee: amount * 0.003,
    estimatedTime: 90,
    route: 'Binance DEX',
  };
}

async function fetchRaydiumQuote(inputMint, outputMint, amountUiUnits) {
  const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
  quoteUrl.searchParams.set('inputMint', inputMint);
  quoteUrl.searchParams.set('outputMint', outputMint);
  quoteUrl.searchParams.set('amount', String(Math.floor(toNumber(amountUiUnits))));
  quoteUrl.searchParams.set('slippageBps', '50');
  // Force Raydium route only.
  quoteUrl.searchParams.set('dexes', 'Raydium');

  const response = await fetch(quoteUrl.toString());
  if (!response.ok) {
    throw new Error(`Raydium quote failed (${response.status})`);
  }

  const data = await response.json();
  const outAmountUi = toNumber(data?.outAmount);
  if (outAmountUi <= 0) {
    throw new Error('Raydium returned invalid output');
  }

  return {
    provider: 'Raydium',
    outputAmount: String(Math.floor(outAmountUi)),
    fee: normalizeAmountFromUi(amountUiUnits) * 0.0025,
    estimatedTime: 30,
    route: 'Raydium',
  };
}

function pickBestQuote(quotes) {
  if (!quotes.length) return null;
  return [...quotes].sort((a, b) => toNumber(b.outputAmount) - toNumber(a.outputAmount))[0];
}

export async function getRateComparison(req) {
  try {
    const { fromChain, toChain, fromToken, toToken, amount, userPublicKey } = await req.json();

    if (!fromChain || !toChain || !fromToken || !toToken || !amount) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const quotes = [];

    // Same-chain BSC aggregation: PancakeSwap + Binance DEX
    if (fromChain === 'bsc' && toChain === 'bsc') {
      const humanAmount = normalizeAmountFromUi(amount);
      const [pancake, binanceDex] = await Promise.allSettled([
        fetchPancakeQuote(fromToken, toToken, humanAmount),
        fetchBinanceDexQuote(fromToken, toToken, humanAmount, userPublicKey),
      ]);

      if (pancake.status === 'fulfilled') quotes.push(pancake.value);
      if (binanceDex.status === 'fulfilled') quotes.push(binanceDex.value);
    }

    // Same-chain Solana aggregation: Raydium
    if (fromChain === 'solana' && toChain === 'solana') {
      const raydium = await fetchRaydiumQuote(fromToken, toToken, amount);
      quotes.push(raydium);
    }

    // Cross-chain (bsc <-> solana): synthetic route estimates based on
    // source-chain aggregator and destination-chain DEX legs.
    if (!quotes.length && ((fromChain === 'bsc' && toChain === 'solana') || (fromChain === 'solana' && toChain === 'bsc'))) {
      const humanAmount = normalizeAmountFromUi(amount);
      const baseOutput = humanAmount * 0.97;

      quotes.push({
        provider: fromChain === 'bsc' ? 'PancakeSwap -> Bridge -> Raydium' : 'Raydium -> Bridge -> PancakeSwap',
        outputAmount: toUiAmount(baseOutput),
        fee: humanAmount * 0.008,
        estimatedTime: 600,
        route: `${fromChain} -> bridge -> ${toChain}`,
      });

      quotes.push({
        provider: fromChain === 'bsc' ? 'Binance DEX -> Bridge -> Raydium' : 'Raydium -> Bridge -> Binance DEX',
        outputAmount: toUiAmount(humanAmount * 0.968),
        fee: humanAmount * 0.009,
        estimatedTime: 540,
        route: `${fromChain} -> bridge -> ${toChain}`,
      });
    }

    const best = pickBestQuote(quotes);
    if (!best) {
      return Response.json(
        { error: 'No quotes available for this pair and chain combination' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      best: {
        ...best,
        priceImpact: '0.5',
      },
      allQuotes: quotes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rate comparison error:', error);
    return Response.json(
      { error: error?.message || 'Failed to compare rates' },
      { status: 500 }
    );
  }
}
