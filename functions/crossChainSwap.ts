const NETWORK_CONFIG = {
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpc: 'https://bsc-dataseed.binance.org/',
    explorerUrl: 'https://bscscan.com',
  },
  solana: {
    chainId: null,
    name: 'Solana',
    rpc: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
  },
};

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

async function getBscLegEstimates(fromToken, toToken, amountUi) {
  const humanAmount = uiToHumanAmount(amountUi);
  const estimates = [];

  try {
    const pancakeRes = await fetch(
      `https://api.pancakebotapi.com/api/v0/price?outputCurrency=${toToken}&inputCurrency=${fromToken}`
    );
    if (pancakeRes.ok) {
      const pancake = await pancakeRes.json();
      const rate = toNumber(pancake?.outputAmount);
      if (rate > 0) {
        estimates.push({
          provider: 'PancakeSwap',
          outputHuman: humanAmount * rate,
          feePct: 0.0025,
        });
      }
    }
  } catch {
    // Ignore provider failure, aggregate best-effort.
  }

  try {
    const oo = new URL('https://open-api.openocean.finance/v3/bsc/swap_quote');
    oo.searchParams.set('inTokenAddress', fromToken);
    oo.searchParams.set('outTokenAddress', toToken);
    oo.searchParams.set('amount', String(humanAmount));
    oo.searchParams.set('slippage', '0.5');
    oo.searchParams.set('gasPrice', '3');
    const ooRes = await fetch(oo.toString());
    if (ooRes.ok) {
      const ooData = await ooRes.json();
      if (toNumber(ooData?.code) === 200 && ooData?.data?.outAmount) {
        estimates.push({
          provider: 'Binance DEX',
          outputHuman: toNumber(ooData.data.outAmount),
          feePct: 0.003,
        });
      }
    }
  } catch {
    // Ignore provider failure.
  }

  return estimates;
}

async function getRaydiumLegEstimate(fromToken, toToken, amountUi) {
  try {
    const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
    quoteUrl.searchParams.set('inputMint', fromToken);
    quoteUrl.searchParams.set('outputMint', toToken);
    quoteUrl.searchParams.set('amount', String(Math.floor(toNumber(amountUi))));
    quoteUrl.searchParams.set('slippageBps', '50');
    quoteUrl.searchParams.set('dexes', 'Raydium');

    const res = await fetch(quoteUrl.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const outUi = toNumber(data?.outAmount);
    if (outUi <= 0) return null;
    return {
      provider: 'Raydium',
      outputUi: outUi,
      feePct: 0.0025,
    };
  } catch {
    return null;
  }
}

function bestByOutput(options) {
  if (!options.length) return null;
  return [...options].sort((a, b) => toNumber(b.outputHuman ?? b.outputUi) - toNumber(a.outputHuman ?? a.outputUi))[0];
}

export async function crossChainSwap(req) {
  try {
    const { fromChain, toChain, fromToken, toToken, amount } = await req.json();

    if (!fromChain || !toChain || !fromToken || !toToken || !amount) {
      return Response.json(
        { error: 'Missing required fields: fromChain, toChain, fromToken, toToken, amount' },
        { status: 400 }
      );
    }

    if (!NETWORK_CONFIG[fromChain] || !NETWORK_CONFIG[toChain]) {
      return Response.json({ error: "Unsupported chain. Use 'bsc' or 'solana'." }, { status: 400 });
    }

    if (fromChain === toChain) {
      return Response.json({ error: 'Use regular swap for same-chain transactions' }, { status: 400 });
    }

    const amountHuman = uiToHumanAmount(amount);
    if (amountHuman <= 0) {
      return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    let candidateRoutes = [];

    if (fromChain === 'bsc' && toChain === 'solana') {
      const bscLegs = await getBscLegEstimates(fromToken, fromToken, amount);
      const bestBscLeg = bestByOutput(
        bscLegs.length
          ? bscLegs
          : [{ provider: 'PancakeSwap', outputHuman: amountHuman, feePct: 0.0025 }]
      );
      const bridgeLoss = 0.97;
      const postBridgeHuman = toNumber(bestBscLeg.outputHuman) * bridgeLoss;

      candidateRoutes = [
        {
          provider: `${bestBscLeg.provider} -> Bridge -> Raydium`,
          outputHuman: postBridgeHuman,
          feePct: bestBscLeg.feePct + 0.005 + 0.0025,
          estimatedTime: 600,
          route: 'bsc -> bridge -> solana',
        },
      ];
    } else if (fromChain === 'solana' && toChain === 'bsc') {
      const raydium = await getRaydiumLegEstimate(fromToken, fromToken, amount);
      const solLegHuman = raydium ? uiToHumanAmount(raydium.outputUi) : amountHuman;
      const bridgeLoss = 0.97;
      const postBridgeHuman = solLegHuman * bridgeLoss;

      candidateRoutes = [
        {
          provider: 'Raydium -> Bridge -> PancakeSwap',
          outputHuman: postBridgeHuman,
          feePct: 0.0025 + 0.005 + 0.0025,
          estimatedTime: 600,
          route: 'solana -> bridge -> bsc',
        },
        {
          provider: 'Raydium -> Bridge -> Binance DEX',
          outputHuman: postBridgeHuman * 0.998,
          feePct: 0.0025 + 0.005 + 0.003,
          estimatedTime: 540,
          route: 'solana -> bridge -> bsc',
        },
      ];
    }

    const best = bestByOutput(candidateRoutes);
    if (!best) {
      throw new Error('No cross-chain route available');
    }

    const totalFee = amountHuman * toNumber(best.feePct);

    return Response.json({
      success: true,
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: humanToUiAmount(best.outputHuman),
      provider: best.provider,
      route: best.route,
      routeDetails: [{ provider: best.provider, fromChain, toChain }],
      fees: {
        gas: amountHuman * 0.001,
        bridge: amountHuman * 0.005,
        total: totalFee,
        percentage: (toNumber(best.feePct) * 100).toFixed(2),
      },
      estimatedTime: {
        seconds: best.estimatedTime,
        minutes: Math.ceil(best.estimatedTime / 60),
        display: `~${Math.ceil(best.estimatedTime / 60)} min`,
      },
      slippage: 0.5,
      priceImpact: (toNumber(best.feePct) * 100).toFixed(2),
      exchangeRate: toNumber(best.outputHuman) / amountHuman,
      allRoutes: candidateRoutes.map((r) => ({
        provider: r.provider,
        outputAmount: humanToUiAmount(r.outputHuman),
        estimatedTime: r.estimatedTime,
        route: r.route,
      })),
      networks: {
        from: NETWORK_CONFIG[fromChain],
        to: NETWORK_CONFIG[toChain],
      },
    });
  } catch (error) {
    console.error('Cross-chain swap error:', error);
    return Response.json(
      { error: 'Failed to estimate cross-chain swap', details: error?.message || 'unknown_error' },
      { status: 500 }
    );
  }
}
