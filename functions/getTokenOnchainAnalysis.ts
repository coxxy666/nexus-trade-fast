export async function getTokenOnchainAnalysis(req: Request): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const trim = (value: unknown) => String(value || '').trim();
  const env = (name: string) => trim(Deno.env.get(name));
  const isEvmAddress = (value = '') => /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
  const isSolanaAddress = (value = '') => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || '').trim());
  const numberOrNull = (...values: unknown[]) => {
    for (const value of values) {
      if (value == null || value === '') continue;
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  };

  const normalizeNetwork = (value = '') => {
    const network = String(value || '').trim().toLowerCase();
    if (network === 'bnb' || network === 'binance' || network === 'bep20') return 'bsc';
    if (network === 'erc20' || network === 'eth') return 'ethereum';
    if (network.includes('sol')) return 'solana';
    if (network.includes('bsc') || network.includes('bnb')) return 'bsc';
    if (network.includes('eth')) return 'ethereum';
    return network || 'unknown';
  };

  const explorerFor = (network: string, address: string) => {
    if (network === 'bsc') return `https://bscscan.com/token/${address}`;
    if (network === 'ethereum') return `https://etherscan.io/token/${address}`;
    if (network === 'solana') return `https://solscan.io/token/${address}`;
    return '';
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchJson = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`);
    return response.json();
  };

  const buildBase = (network: string, address: string, symbol: string, name: string) => ({
    success: true,
    chain: network,
    address,
    tokenIdentity: { symbol, name, address, explorerUrl: explorerFor(network, address) },
    contractVerification: { available: false, verified: false, source: 'none', reason: 'Unavailable' },
    holderConcentration: { available: false, source: 'none', reason: 'Unavailable' },
    liquidityLock: { available: false, source: 'none', locked: null as boolean | null, reason: 'Unavailable' },
    honeypot: { available: false, source: 'none', reason: 'Unavailable' },
    smartMoney: { available: false, source: 'none', reason: 'Unavailable', signals: [] as string[] },
    groundedSummary: [] as string[],
  });

  const summarize = (payload: ReturnType<typeof buildBase>) => {
    const lines: string[] = [];
    const holderData = payload.holderConcentration as { top10Percentage?: number };
    const honeypotData = payload.honeypot as { isHoneypot?: boolean };
    if (payload.contractVerification?.available) {
      lines.push(payload.contractVerification.verified
        ? `Contract status: verified via ${payload.contractVerification.source}.`
        : `Contract status: not verified via ${payload.contractVerification.source}.`);
    }
    if (payload.holderConcentration?.available && typeof holderData.top10Percentage === 'number') {
      lines.push(`Holder concentration: top 10 wallets control ${holderData.top10Percentage.toFixed(2)}% of supply.`);
    }
    if (payload.honeypot?.available) {
      lines.push(honeypotData.isHoneypot ? 'Trade simulation flagged honeypot risk.' : 'Trade simulation did not flag a honeypot.');
    }
    if (payload.liquidityLock?.available) {
      lines.push(
        payload.liquidityLock.locked === true
          ? 'Liquidity lock evidence was found.'
          : payload.liquidityLock.locked === false
            ? 'No confirmed liquidity lock evidence was found.'
            : `Liquidity lock evidence is partial: ${payload.liquidityLock.reason}`
      );
    }
    if (!lines.length) lines.push('No onchain analysis signals were available for this token yet.');
    return lines;
  };

  const EVM_CONFIG: Record<string, { chainId: number; scannerApiBase: string; scannerSite: string; apiKey: string }> = {
    bsc: { chainId: 56, scannerApiBase: 'https://api.bscscan.com/api', scannerSite: 'BscScan', apiKey: env('BSCSCAN_API_KEY') || env('BSC_API_KEY') },
    ethereum: { chainId: 1, scannerApiBase: 'https://api.etherscan.io/api', scannerSite: 'Etherscan', apiKey: env('ETHERSCAN_API_KEY') || env('ETH_API_KEY') },
  };

  const SOLANA_RPC_ENDPOINTS = [
    env('SOLANA_RPC_URL'),
    ...String(env('SOLANA_RPC_FALLBACKS') || '').split(',').map((v) => v.trim()).filter(Boolean),
    'https://api.mainnet-beta.solana.com',
  ].filter(Boolean);

  const parseKnownLockerConfig = () => {
    const raw = env('KNOWN_LOCKER_ADDRESSES_JSON') || env('BSC_KNOWN_LOCKERS_JSON');
    if (!raw) return {} as Record<string, Record<string, string>>;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const out: Record<string, Record<string, string>> = {};
      for (const [network, entries] of Object.entries(parsed as Record<string, unknown>)) {
        if (!entries || typeof entries !== 'object') continue;
        out[normalizeNetwork(network)] = Object.fromEntries(
          Object.entries(entries as Record<string, unknown>)
            .filter(([address, label]) => isEvmAddress(address) && trim(label))
            .map(([address, label]) => [address.toLowerCase(), trim(label)])
        );
      }
      return out;
    } catch {
      return {};
    }
  };

  const KNOWN_LOCKER_ADDRESSES = parseKnownLockerConfig();
  const LOCKER_LABEL_PATTERNS = [
    { match: /pinklock|pinksale/i, label: 'PinkLock / PinkSale' },
    { match: /team\s*finance/i, label: 'Team Finance' },
    { match: /unicrypt|uncx/i, label: 'UNCX / Unicrypt' },
    { match: /mudra/i, label: 'Mudra Locker' },
    { match: /dxlock|dxsale/i, label: 'DXLock / DxSale' },
  ];

  const getDexPairContext = async (network: string, address: string) => {
    try {
      const payload = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
      const pairs = Array.isArray(payload?.pairs) ? payload.pairs : [];
      const chainPairs = pairs.filter((pair: any) => String(pair?.chainId || '').toLowerCase() === network);
      const pair = [...chainPairs].sort((a: any, b: any) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0] || null;
      if (!pair) return { available: false, source: 'DexScreener', reason: 'No matching trading pair was found.' };
      return {
        available: true,
        source: 'DexScreener',
        pairAddress: trim(pair?.pairAddress),
        pairCreatedAt: Number(pair?.pairCreatedAt || 0) || null,
        liquidityUsd: Number(pair?.liquidity?.usd || 0),
        dexId: trim(pair?.dexId),
        labels: Array.isArray(pair?.labels) ? pair.labels.map((label: unknown) => trim(label)).filter(Boolean) : [],
        txns24h: pair?.txns?.h24 || null,
        url: trim(pair?.url),
      };
    } catch (error) {
      return { available: false, source: 'DexScreener', reason: String((error as Error)?.message || error || 'Failed to read DEX pair context.') };
    }
  };

  const getEvmContractVerification = async (network: string, address: string) => {
    const config = EVM_CONFIG[network];
    if (!config) return { available: false, verified: false, source: 'scanner', reason: `Scanner is not configured for ${network}.` };
    const params = new URLSearchParams({ module: 'contract', action: 'getsourcecode', address });
    if (config.apiKey) params.set('apikey', config.apiKey);
    try {
      const payload = await fetchJson(`${config.scannerApiBase}?${params.toString()}`);
      const entry = Array.isArray(payload?.result) ? payload.result[0] || {} : {};
      const sourceCode = trim(entry?.SourceCode);
      const abi = trim(entry?.ABI);
      const verified = Boolean(sourceCode) && !/not verified/i.test(abi || '');
      return {
        available: true,
        verified,
        source: config.scannerSite,
        contractName: trim(entry?.ContractName) || null,
        compilerVersion: trim(entry?.CompilerVersion) || null,
        explorerUrl: explorerFor(network, address),
        reason: verified ? 'Verified source code found on scanner.' : 'Scanner did not return verified source code.',
      };
    } catch (error) {
      return { available: false, verified: false, source: config.scannerSite, explorerUrl: explorerFor(network, address), reason: String((error as Error)?.message || error || 'Failed to read scanner verification status.') };
    }
  };

  const getEvmHoneypot = async (network: string, address: string) => {
    const config = EVM_CONFIG[network];
    if (!config) return { available: false, source: 'Honeypot.is', reason: `Honeypot simulation is not configured for ${network}.` };
    try {
      const payload = await fetchJson(`https://api.honeypot.is/v2/IsHoneypot?address=${encodeURIComponent(address)}&chainID=${config.chainId}`);
      const simulation = payload?.simulationResult || payload?.simulationSuccess || {};
      return {
        available: true,
        source: 'Honeypot.is',
        isHoneypot: Boolean(payload?.honeypotResult?.isHoneypot ?? payload?.IsHoneypot ?? false),
        buyTax: Number(simulation?.buyTax ?? simulation?.buyFee ?? 0),
        sellTax: Number(simulation?.sellTax ?? simulation?.sellFee ?? 0),
        transferTax: Number(simulation?.transferTax ?? simulation?.transferFee ?? 0),
        reason: 'Trade simulation returned by Honeypot.is.',
      };
    } catch (error) {
      return { available: false, source: 'Honeypot.is', reason: String((error as Error)?.message || error || 'Failed to run honeypot simulation.') };
    }
  };

  const getGoPlusSecurity = async (network: string, address: string) => {
    const chainId = network === 'bsc' ? '56' : network === 'ethereum' ? '1' : '';
    if (!chainId) return { available: false, source: 'GoPlus', reason: `GoPlus is not configured for ${network}.` };
    try {
      const payload = await fetchJson(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(address)}`);
      const result = payload?.result?.[address.toLowerCase()] || payload?.result?.[address] || null;
      if (!result) return { available: false, source: 'GoPlus', reason: 'GoPlus did not return a token security record.' };
      return {
        available: true,
        source: 'GoPlus',
        isOpenSource: result?.is_open_source === '1',
        isProxy: result?.is_proxy === '1',
        canTakeBackOwnership: result?.can_take_back_ownership === '1',
        hiddenOwner: result?.hidden_owner === '1',
        ownerChangeBalance: result?.owner_change_balance === '1',
        buyTax: Number(result?.buy_tax || 0),
        sellTax: Number(result?.sell_tax || 0),
        holderCount: Number(result?.holder_count || 0) || null,
        lpHolderCount: Number(result?.lp_holder_count || 0) || null,
        lpLockedHolderCount: numberOrNull(result?.lp_locked_holder_count),
        lpTotalSupply: numberOrNull(result?.lp_total_supply),
        lpLockedTotalSupply: numberOrNull(result?.lp_locked_total_supply),
        lpLockedPercent: numberOrNull(result?.lp_locked_percent, result?.lock_percent),
        isHoneypot: result?.is_honeypot === '1',
        isBlacklisted: result?.is_blacklisted === '1',
        raw: result,
      };
    } catch (error) {
      return { available: false, source: 'GoPlus', reason: String((error as Error)?.message || error || 'Failed to fetch GoPlus token security.') };
    }
  };

  const extractAddressesDeep = (value: unknown): string[] => {
    if (typeof value === 'string') {
      const matches = value.match(/0x[a-fA-F0-9]{40}/g) || [];
      return matches.map((address) => address.toLowerCase());
    }
    if (Array.isArray(value)) return value.flatMap((item) => extractAddressesDeep(item));
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap((item) => extractAddressesDeep(item));
    return [];
  };

  const detectLockerLabelInText = (...parts: unknown[]) => {
    const text = parts.flat().map((part) => trim(part)).filter(Boolean).join(' | ');
    for (const pattern of LOCKER_LABEL_PATTERNS) {
      if (pattern.match.test(text)) return pattern.label;
    }
    return '';
  };

  const findKnownLockerMatch = (network: string, source: unknown) => {
    const registry = KNOWN_LOCKER_ADDRESSES[network] || {};
    if (!Object.keys(registry).length) return null;
    for (const address of extractAddressesDeep(source)) {
      if (registry[address]) return { address, label: registry[address] };
    }
    return null;
  };

  const inferEvmLiquidityLock = (network: string, goPlus: Awaited<ReturnType<typeof getGoPlusSecurity>>, dexContext: Awaited<ReturnType<typeof getDexPairContext>>) => {
    const knownLocker = findKnownLockerMatch(network, goPlus?.raw) || findKnownLockerMatch(network, dexContext);
    const lockerLabel = knownLocker?.label || detectLockerLabelInText(goPlus?.raw, dexContext?.labels, dexContext?.dexId, dexContext?.url, dexContext?.reason);

    if (knownLocker || lockerLabel) {
      return {
        available: true,
        source: knownLocker ? 'Known locker registry' : 'Locker label heuristic',
        locked: true,
        lockerAddress: knownLocker?.address || null,
        lockerLabel: lockerLabel || null,
        reason: knownLocker
          ? `LP locker matched known ${knownLocker.label} address ${knownLocker.address}.`
          : `Locker evidence mentions ${lockerLabel}.`,
      };
    }

    if (goPlus?.available) {
      if (typeof goPlus.lpLockedPercent === 'number' && goPlus.lpLockedPercent > 0) {
        return {
          available: true,
          source: 'GoPlus',
          locked: true,
          lockerAddress: null,
          lockerLabel: null,
          reason: `GoPlus reports ${goPlus.lpLockedPercent.toFixed(2)}% of LP locked.`,
        };
      }
      if ((goPlus.lpLockedHolderCount || 0) > 0 && (goPlus.lpHolderCount || 0) > 0) {
        return {
          available: true,
          source: 'GoPlus',
          locked: true,
          lockerAddress: null,
          lockerLabel: null,
          reason: `GoPlus reports ${goPlus.lpLockedHolderCount} locked LP holder(s).`,
        };
      }
      if ((goPlus.lpHolderCount || 0) > 0) {
        return {
          available: true,
          source: 'GoPlus',
          locked: false,
          lockerAddress: null,
          lockerLabel: null,
          reason: 'GoPlus reported LP holders but no locked LP evidence.',
        };
      }
    }

    if (dexContext?.available) {
      return {
        available: true,
        source: 'DexScreener',
        locked: null,
        lockerAddress: null,
        lockerLabel: null,
        reason: `Active LP exists at ${dexContext.pairAddress || 'pair'} with about $${Number(dexContext.liquidityUsd || 0).toLocaleString()} liquidity, but no verified locker evidence was found.`,
      };
    }

    return {
      available: false,
      source: 'none',
      locked: null,
      lockerAddress: null,
      lockerLabel: null,
      reason: 'No liquidity evidence was available.',
    };
  };

  const formatSolanaRpcError = (message: string) => {
    const lower = String(message || '').toLowerCase();
    if (lower.includes('429')) {
      return 'Solana RPC rate limit hit (429). Configure a dedicated SOLANA_RPC_URL or retry shortly.';
    }
    return message;
  };

  const callSolanaRpc = async (method: string, params: unknown[]) => {
    let lastError: unknown = null;
    for (const endpoint of SOLANA_RPC_ENDPOINTS) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          });
          if (response.status === 429) {
            throw new Error(`RPC HTTP 429 from ${endpoint}`);
          }
          if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
          const payload = await response.json();
          if (payload?.error) throw new Error(trim(payload.error?.message || JSON.stringify(payload.error)) || 'RPC error');
          return payload?.result;
        } catch (error) {
          lastError = error;
          const message = String((error as Error)?.message || error || 'Solana RPC failed');
          if (!message.includes('429') || attempt === 2) break;
          await sleep(400 * (attempt + 1));
        }
      }
    }
    throw new Error(formatSolanaRpcError(String((lastError as Error)?.message || lastError || `Solana RPC failed for ${method}`)));
  };

  const getSolanaHolderConcentration = async (mint: string) => {
    const supplyResult = await callSolanaRpc('getTokenSupply', [mint]);
    const largestAccounts = await callSolanaRpc('getTokenLargestAccounts', [mint]);
    const amount = Number(supplyResult?.value?.amount || 0);
    const decimals = Number(supplyResult?.value?.decimals || 0);
    const topAccounts = Array.isArray(largestAccounts?.value) ? largestAccounts.value : [];
    const ranked = topAccounts.slice(0, 10).map((entry: any) => {
      const rawAmount = Number(entry?.amount || 0);
      return {
        address: trim(entry?.address),
        amount: rawAmount,
        uiAmount: rawAmount / 10 ** decimals,
        percentage: amount > 0 ? (rawAmount / amount) * 100 : 0,
      };
    });
    return {
      available: true,
      source: 'Solana RPC',
      totalSupplyRaw: amount,
      decimals,
      top10Percentage: ranked.reduce((sum: number, entry: any) => sum + entry.percentage, 0),
      largestAccounts: ranked,
      reason: 'Holder concentration calculated from getTokenSupply and getTokenLargestAccounts.',
    };
  };

  try {
    const body = await req.json().catch(() => ({}));
    const token = (body && typeof body === 'object' && 'token' in body ? (body as Record<string, unknown>).token : body) as Record<string, unknown>;
    const address = trim(token?.address || token?.contractAddress || token?.mintAddress);
    const symbol = trim(token?.symbol || token?.ticker);
    const name = trim(token?.name);

    let network = normalizeNetwork(trim(token?.network || token?.chain || token?.chainId));
    if (network === 'unknown') {
      if (isSolanaAddress(address)) network = 'solana';
      else if (isEvmAddress(address)) network = 'bsc';
    }

    if (!address) return json({ success: false, error: 'Token address is required.' }, 400);
    if (network === 'solana' && !isSolanaAddress(address)) return json({ success: false, error: 'A valid Solana mint address is required.' }, 400);
    if ((network === 'bsc' || network === 'ethereum') && !isEvmAddress(address)) return json({ success: false, error: 'A valid EVM token address is required.' }, 400);
    if (!['bsc', 'ethereum', 'solana'].includes(network)) return json({ success: false, error: `Unsupported network: ${network}` }, 400);

    const payload = buildBase(network, address, symbol, name);

    if (network === 'solana') {
      try {
        const mintInfo = await callSolanaRpc('getAccountInfo', [address, { encoding: 'jsonParsed' }]);
        const parsedInfo = mintInfo?.value?.data?.parsed?.info || {};
        const dexContext = await getDexPairContext(network, address);
        payload.contractVerification = {
          available: true,
          verified: Boolean(mintInfo?.value),
          source: 'Solana RPC',
          ownerProgram: trim(mintInfo?.value?.owner) || null,
          mintAuthority: parsedInfo?.mintAuthority ?? null,
          freezeAuthority: parsedInfo?.freezeAuthority ?? null,
          decimals: numberOrNull(parsedInfo?.decimals),
          supply: trim(parsedInfo?.supply) || null,
          reason: mintInfo?.value ? 'Mint account exists onchain and was parsed successfully.' : 'Mint account was not found onchain.',
        } as typeof payload.contractVerification;
        payload.holderConcentration = await getSolanaHolderConcentration(address) as typeof payload.holderConcentration;
        payload.liquidityLock = dexContext.available
          ? {
              available: true,
              source: dexContext.source,
              locked: null,
              pairAddress: dexContext.pairAddress || null,
              liquidityUsd: dexContext.liquidityUsd || 0,
              reason: `Pool evidence found${dexContext.pairAddress ? ` at ${dexContext.pairAddress}` : ''}, but hard lock verification is not available on Solana yet.`,
            } as typeof payload.liquidityLock
          : {
              available: false,
              source: dexContext.source,
              locked: null,
              reason: dexContext.reason,
            } as typeof payload.liquidityLock;
      } catch (error) {
        const reason = formatSolanaRpcError(String((error as Error)?.message || error || 'Solana onchain analysis failed.'));
        payload.contractVerification = {
          available: false,
          verified: false,
          source: 'Solana RPC',
          reason,
        } as typeof payload.contractVerification;
        payload.holderConcentration = {
          available: false,
          source: 'Solana RPC',
          reason,
        } as typeof payload.holderConcentration;
        payload.liquidityLock = {
          available: false,
          source: 'DexScreener',
          locked: null,
          reason,
        } as typeof payload.liquidityLock;
      }
      payload.honeypot = {
        available: false,
        source: 'none',
        reason: 'Automated honeypot simulation is not implemented for Solana in this build.',
      } as typeof payload.honeypot;
      payload.groundedSummary = summarize(payload);
      return json(payload);
    }

    const [verification, honeypot, goPlus, dexContext] = await Promise.all([
      getEvmContractVerification(network, address),
      getEvmHoneypot(network, address),
      getGoPlusSecurity(network, address),
      getDexPairContext(network, address),
    ]);

    payload.contractVerification = verification as typeof payload.contractVerification;
    payload.honeypot = {
      ...honeypot,
      ...(goPlus?.available
        ? {
            buyTax: typeof goPlus.buyTax === 'number' ? goPlus.buyTax : honeypot.buyTax,
            sellTax: typeof goPlus.sellTax === 'number' ? goPlus.sellTax : honeypot.sellTax,
            isHoneypot: Boolean((honeypot as any).isHoneypot || goPlus.isHoneypot),
            hasBlacklistFlag: Boolean(goPlus.isBlacklisted),
          }
        : {}),
    } as typeof payload.honeypot;
    payload.holderConcentration = goPlus?.available
      ? {
          available: true,
          source: 'GoPlus',
          holderCount: goPlus.holderCount,
          reason: goPlus.holderCount
            ? `GoPlus reports about ${goPlus.holderCount.toLocaleString()} holders. Detailed concentration data is not available yet.`
            : 'GoPlus returned token-security data but not a holder concentration breakdown.',
        } as typeof payload.holderConcentration
      : {
          available: false,
          source: 'GoPlus',
          reason: goPlus?.reason || 'Holder data unavailable.',
        } as typeof payload.holderConcentration;
    payload.liquidityLock = inferEvmLiquidityLock(network, goPlus, dexContext) as typeof payload.liquidityLock;
    payload.smartMoney = {
      available: false,
      source: 'none',
      reason: 'Smart-money wallet flow indexing is not wired in yet.',
      signals: [],
    };
    payload.groundedSummary = summarize(payload);
    return json(payload);
  } catch (error) {
    console.error('getTokenOnchainAnalysis failed:', error);
    return json({ success: false, error: String((error as Error)?.message || error || 'Onchain analysis failed.') }, 500);
  }
}
