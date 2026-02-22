function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uiToHumanAmount(amountUi) {
  return toNumber(amountUi) / 1e6;
}

function humanToUiAmount(amountHuman) {
  return String(Math.max(0, Math.floor(toNumber(amountHuman) * 1e6)));
}

async function getPancakeRoute(fromToken, toToken, amountUi) {
  const humanAmount = uiToHumanAmount(amountUi);
  const response = await fetch(
    `https://api.pancakebotapi.com/api/v0/price?outputCurrency=${toToken}&inputCurrency=${fromToken}`
  );
  if (!response.ok) {
    throw new Error(`PancakeSwap route failed (${response.status})`);
  }

  const data = await response.json();
  const rate = toNumber(data?.outputAmount);
  if (rate <= 0) {
    throw new Error('PancakeSwap returned invalid rate');
  }

  const outHuman = humanAmount * rate;
  return {
    provider: 'PancakeSwap',
    outAmount: humanToUiAmount(outHuman),
    route: 'PancakeSwap',
    priceImpact: toNumber(data?.priceImpactPct, 0.5),
    fees: {
      platformFee: 0.0025,
      routeFee: 0,
    },
  };
}

async function getBinanceDexRoute(fromToken, toToken, amountUi, account) {
  const humanAmount = uiToHumanAmount(amountUi);
  const url = new URL('https://open-api.openocean.finance/v3/bsc/swap_quote');
  url.searchParams.set('inTokenAddress', fromToken);
  url.searchParams.set('outTokenAddress', toToken);
  url.searchParams.set('amount', String(humanAmount));
  if (account) url.searchParams.set('account', account);
  url.searchParams.set('slippage', '0.5');
  url.searchParams.set('gasPrice', '3');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Binance DEX route failed (${response.status})`);
  }
  const data = await response.json();
  if (toNumber(data?.code) !== 200 || !data?.data) {
    throw new Error('Binance DEX returned no route');
  }

  const outHuman = toNumber(data.data.outAmount);
  if (outHuman <= 0) {
    throw new Error('Binance DEX returned invalid output');
  }

  return {
    provider: 'Binance DEX',
    outAmount: humanToUiAmount(outHuman),
    route: 'Binance DEX',
    priceImpact: 0.6,
    tx: {
      to: data.data.to,
      data: data.data.data,
      value: data.data.value || '0',
      gas: data.data.estimatedGas,
    },
    fees: {
      platformFee: 0.003,
      routeFee: 0,
    },
  };
}

async function getRaydiumRoute(inputMint, outputMint, amountUi, slippageBps) {
  const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
  quoteUrl.searchParams.set('inputMint', inputMint);
  quoteUrl.searchParams.set('outputMint', outputMint);
  quoteUrl.searchParams.set('amount', String(Math.floor(toNumber(amountUi))));
  quoteUrl.searchParams.set('slippageBps', String(slippageBps));
  quoteUrl.searchParams.set('dexes', 'Raydium');

  const response = await fetch(quoteUrl.toString());
  if (!response.ok) {
    throw new Error(`Raydium route failed (${response.status})`);
  }

  const quote = await response.json();
  const outAmountUi = toNumber(quote?.outAmount);
  if (outAmountUi <= 0) {
    throw new Error('No Raydium liquidity found');
  }

  return {
    provider: 'Raydium',
    outAmount: String(Math.floor(outAmountUi)),
    route: quote,
    priceImpact: toNumber(quote?.priceImpactPct, 0),
    fees: {
      platformFee: 0.0025,
      routeFee: 0,
    },
  };
}

function pickBest(routes) {
  if (!routes.length) return null;
  return [...routes].sort((a, b) => toNumber(b.outAmount) - toNumber(a.outAmount))[0];
}

Deno.serve(async (req) => {
  try {
    const { chain, fromToken, toToken, amount, slippageBps = 50, userPublicKey } = await req.json();

    if (!chain || !fromToken || !toToken || !amount) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (chain === 'solana') {
      const raydium = await getRaydiumRoute(fromToken, toToken, amount, slippageBps);
      return Response.json({
        success: true,
        chain: 'solana',
        provider: raydium.provider,
        route: raydium.route,
        outAmount: raydium.outAmount,
        priceImpact: raydium.priceImpact,
        fees: raydium.fees,
      });
    }

    if (chain === 'bsc') {
      const [pancakeRes, binanceDexRes] = await Promise.allSettled([
        getPancakeRoute(fromToken, toToken, amount),
        getBinanceDexRoute(fromToken, toToken, amount, userPublicKey),
      ]);

      const routes = [];
      if (pancakeRes.status === 'fulfilled') routes.push(pancakeRes.value);
      if (binanceDexRes.status === 'fulfilled') routes.push(binanceDexRes.value);

      if (!routes.length) {
        throw new Error('No BSC route available from PancakeSwap or Binance DEX');
      }

      const best = pickBest(routes);
      return Response.json({
        success: true,
        chain: 'bsc',
        provider: best.provider,
        allRoutes: routes,
        route: best.route,
        outAmount: best.outAmount,
        priceImpact: best.priceImpact,
        tx: best.tx || null,
        fees: best.fees,
      });
    }

    return Response.json({ error: 'Unsupported chain. Use bsc or solana.' }, { status: 400 });
  } catch (error) {
    console.error('Route fetch error:', error);
    return Response.json({ error: error?.message || 'Failed to fetch route' }, { status: 500 });
  }
});
