import { toast } from 'sonner';

import { apiUrl } from '@/lib/apiUrl';
import { BASE_EVM_NETWORK } from '@/components/wallet/base/baseNetworkConfig';

const ERC20_CREATE_SELECTOR_LEGACY = '0x5165749e';
const ERC20_CREATE_SELECTOR_WITH_METADATA = '0x6fc6ce0e';
const ERC20_FACTORY_TOTAL_MINTED_SELECTOR = '0xb142d69b';
const ERC20_FACTORY_GET_MINTED_TOKEN_SELECTOR = '0xed47d4d1';

function stripHexPrefix(value) {
  return String(value || '').replace(/^0x/i, '');
}

function toWordHex(value) {
  const hex = BigInt(value).toString(16);
  return hex.padStart(64, '0');
}

function encodeAddressWord(address) {
  const clean = stripHexPrefix(address).toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(clean)) {
    throw new Error('Owner address must be a valid EVM address (0x...)');
  }
  return clean.padStart(64, '0');
}

function encodeStringDynamic(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const paddedHex = hex + '0'.repeat((64 - (hex.length % 64)) % 64);
  return `${toWordHex(bytes.length)}${paddedHex}`;
}

function encodeCreateTokenCallData({
  name,
  symbol,
  decimals,
  totalSupply,
  ownerAddress,
  metadataUri = '',
  useMetadata = false,
}) {
  const nameDyn = encodeStringDynamic(name);
  const symbolDyn = encodeStringDynamic(symbol);
  const headWords = useMetadata ? 6 : 5;
  const headSizeBytes = headWords * 32;

  const tails = [nameDyn, symbolDyn];
  const offsets = [headSizeBytes];
  let cursor = headSizeBytes + nameDyn.length / 2;
  offsets.push(cursor);
  cursor += symbolDyn.length / 2;

  if (useMetadata) {
    const metadataDyn = encodeStringDynamic(metadataUri);
    offsets.push(cursor);
    tails.push(metadataDyn);
  }

  const head = useMetadata
    ? [
        toWordHex(offsets[0]),
        toWordHex(offsets[1]),
        toWordHex(decimals),
        toWordHex(totalSupply),
        encodeAddressWord(ownerAddress),
        toWordHex(offsets[2]),
      ].join('')
    : [
        toWordHex(offsets[0]),
        toWordHex(offsets[1]),
        toWordHex(decimals),
        toWordHex(totalSupply),
        encodeAddressWord(ownerAddress),
      ].join('');

  const selector = useMetadata ? ERC20_CREATE_SELECTOR_WITH_METADATA : ERC20_CREATE_SELECTOR_LEGACY;
  return `${selector}${head}${tails.join('')}`;
}

function serializeBaseDebugError(error) {
  return {
    message: error?.message || '',
    shortMessage: error?.shortMessage || '',
    reason: error?.reason || '',
    code: error?.code ?? null,
    data: error?.data ?? null,
    causeMessage: error?.cause?.message || '',
    infoMessage: error?.info?.message || '',
    infoErrorMessage: error?.info?.error?.message || '',
    stack: error?.stack || '',
  };
}

function extractEvmErrorMessage(error) {
  const candidates = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.data?.message,
    error?.error?.message,
    error?.cause?.message,
    error?.info?.error?.message,
    error?.info?.message,
  ];
  const found = candidates.find((v) => typeof v === 'string' && v.trim());
  const message = found ? found.trim() : '';
  const lower = message.toLowerCase();
  const nestedStack = String(error?.stack || error?.error?.stack || error?.data?.stack || '');
  const lowerStack = nestedStack.toLowerCase();

  if (lower.includes('insufficient funds') || lower.includes('insufficient balance') || lower.includes('exceeds balance')) {
    return 'Insufficient ETH on Base to deploy the token contract. Add more ETH for gas and try again.';
  }

  if (lower.includes('intrinsic gas too low') || lower.includes('gas required exceeds allowance') || lower.includes('cannot estimate gas')) {
    return 'The wallet could not estimate enough gas for this Base token creation. Make sure you have enough ETH and try again.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    (Number(error?.code) === -32603 && lower.includes('fetch')) ||
    lowerStack.includes('failed to fetch')
  ) {
    return 'Your wallet could not reach the Base RPC while sending the transaction. Switch to Base Mainnet and try again.';
  }

  if (lower.includes('supply required')) {
    return 'Initial supply must be greater than 0 for Base token creation.';
  }

  if (lower.includes('invalid owner')) {
    return 'Owner address is invalid for Base token creation. Use a valid EVM address.';
  }

  if (lower.includes('name required')) {
    return 'Token name is required before minting on Base.';
  }

  if (lower.includes('symbol required')) {
    return 'Token symbol is required before minting on Base.';
  }

  if (lower.includes('user rejected')) {
    return 'Token creation was cancelled in the wallet before signing.';
  }

  const revertReasonMatch = message.match(/execution reverted(?::|\s+)(.*)$/i);
  if (revertReasonMatch?.[1]?.trim()) {
    return 'Base token creation reverted: ' + revertReasonMatch[1].trim();
  }

  if (lower.includes('execution reverted')) {
    return 'The SaveMeme Base factory rejected this token creation request. Check the token details and wallet balance, then try again.';
  }

  return message;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTransactionReceipt(provider, txHash, attempts = 20, delayMs = 1500) {
  for (let i = 0; i < attempts; i += 1) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });
    if (receipt) return receipt;
    await sleep(delayMs);
  }
  return null;
}

function extractCreatedTokenAddress(receipt, factoryAddress = '') {
  const logs = Array.isArray(receipt?.logs) ? receipt.logs : [];
  const normalizedFactory = String(factoryAddress || '').toLowerCase();
  const eventLog = logs.find((log) => {
    const emitter = String(log?.address || '').toLowerCase();
    const topicOne = String(log?.topics?.[1] || '').replace(/^0x/i, '').slice(-40);
    const topicTwo = String(log?.topics?.[2] || '').replace(/^0x/i, '').slice(-40);
    return emitter === normalizedFactory && (
      /^[a-fA-F0-9]{40}$/.test(topicOne) ||
      /^[a-fA-F0-9]{40}$/.test(topicTwo)
    );
  });
  if (!eventLog) return null;

  const topicCandidates = [eventLog?.topics?.[2], eventLog?.topics?.[1]]
    .map((value) => String(value || '').replace(/^0x/i, '').slice(-40))
    .filter((value) => /^[a-fA-F0-9]{40}$/.test(value))
    .map((value) => `0x${value}`);

  return topicCandidates.find((value) => String(value || '').toLowerCase() !== normalizedFactory) || null;
}

function isIgnorableBaseProviderRpcError(error, method = '') {
  const message = String(
    error?.message || error?.shortMessage || error?.cause?.message || ''
  ).toLowerCase();
  const serialized = JSON.stringify({
    data: error?.data ?? null,
    info: error?.info ?? null,
    cause: error?.cause ?? null,
    error: error?.error ?? null,
  }).toLowerCase();
  const targetMethod = String(method || '').toLowerCase();
  if (!message.includes('response has no error or result for request')) return false;
  if (!targetMethod) return true;
  return serialized.includes(targetMethod);
}

async function callBasePublicRpc(method, params) {
  const response = await fetch(BASE_EVM_NETWORK.rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Base public RPC responded with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.error) {
    const error = new Error(payload.error.message || 'Base public RPC request failed');
    error.code = payload.error.code;
    error.data = payload.error.data;
    throw error;
  }

  return payload?.result;
}

async function attemptBasePublicRpcPreflight(method, params) {
  try {
    return await callBasePublicRpc(method, params);
  } catch (error) {
    const detail = extractEvmErrorMessage(error) || String(error?.message || error || 'Unknown Base RPC error');
    throw new Error(detail);
  }
}

async function simulateFactoryCall(provider, { from, to, data }) {
  try {
    await provider.request({
      method: 'eth_call',
      params: [{ from, to, data }, 'latest'],
    });
  } catch (error) {
    const detail = extractEvmErrorMessage(error) || String(error?.message || error || 'Unknown Base simulation error');
    throw new Error(detail);
  }
}

export function baseExplorerTokenUrl(address) {
  return address ? `https://basescan.org/token/${address}` : '';
}

export function baseExplorerTxUrl(txHash) {
  return txHash ? `https://basescan.org/tx/${txHash}` : '';
}

const BASE_FACTORY_SHAPE_ERROR = 'Configured Base factory address does not match the expected SaveMeme Base factory contract. Re-deploy BaseErc20Factory and update VITE_BASE_ERC20_FACTORY_ADDRESS.';

async function assertBaseFactoryShape(provider, factoryAddress, sender) {
  try {
    const result = await provider.request({
      method: 'eth_call',
      params: [{ from: sender, to: factoryAddress, data: ERC20_FACTORY_TOTAL_MINTED_SELECTOR }, 'latest'],
    });
    if (typeof result !== 'string' || !result.startsWith('0x')) {
      throw new Error('unexpected response');
    }
  } catch (error) {
    if (isIgnorableBaseProviderRpcError(error)) {
      try {
        await attemptBasePublicRpcPreflight('eth_call', [{ from: sender, to: factoryAddress, data: ERC20_FACTORY_TOTAL_MINTED_SELECTOR }, 'latest']);
        return;
      } catch {
        throw new Error(BASE_FACTORY_SHAPE_ERROR);
      }
    }
    throw new Error(BASE_FACTORY_SHAPE_ERROR);
  }
}

async function getBaseFactoryMintCount(provider, factoryAddress) {
  if (!provider?.request || !factoryAddress) return null;
  const raw = await provider.request({
    method: 'eth_call',
    params: [{ to: factoryAddress, data: ERC20_FACTORY_TOTAL_MINTED_SELECTOR }, 'latest'],
  });
  if (!raw || raw === '0x') return null;
  return Number(BigInt(raw));
}

async function getBaseFactoryMintRecord(provider, factoryAddress, index) {
  if (!provider?.request || !factoryAddress || index == null || index < 0) return null;
  const callData = `${ERC20_FACTORY_GET_MINTED_TOKEN_SELECTOR}${toWordHex(index)}`;
  const raw = await provider.request({
    method: 'eth_call',
    params: [{ to: factoryAddress, data: callData }, 'latest'],
  });
  if (!raw || raw === '0x') return null;

  const compactRaw = String(raw).trim();
  if (/^0x[a-fA-F0-9]{64}$/.test(compactRaw)) {
    const candidate = `0x${compactRaw.slice(-40)}`;
    return {
      token: candidate,
    };
  }

  const { Web3 } = await import('web3');
  const decoded = Web3.eth.abi.decodeParameters(
    ['address', 'address', 'address', 'string', 'string', 'string', 'uint256'],
    raw,
  );

  return {
    token: decoded?.[0] || '',
  };
}

async function isBaseContractAddress(provider, address) {
  const candidate = String(address || '').trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(candidate)) return false;
  try {
    const code = await provider.request({
      method: 'eth_getCode',
      params: [candidate, 'latest'],
    });
    return Boolean(code && String(code).toLowerCase() !== '0x');
  } catch {
    return false;
  }
}

export async function handleDirectBaseCreate({
  account,
  form,
  getConnectedEvmProvider,
  validateCreateForm,
  buildMetadataPayload,
  runOptionalAiScan,
  saveMintRecord,
  setIsDirectBaseCreating,
  setDirectBaseResult,
}) {
  if (form.chain !== 'base') {
    toast.error('Direct create is only available for Base in this section');
    return;
  }

  const factoryAddress = import.meta.env.VITE_BASE_ERC20_FACTORY_ADDRESS;
  if (!factoryAddress) {
    toast.error('Set VITE_BASE_ERC20_FACTORY_ADDRESS in .env.local');
    return;
  }

  toast.message('Preparing Base ERC20 transaction...');
  setIsDirectBaseCreating(true);
  setDirectBaseResult(null);

  try {
    const check = validateCreateForm('base');
    if (!check.valid) throw new Error('Please fix highlighted fields');
    const { tokenName, tokenSymbol } = check;

    const provider = await getConnectedEvmProvider(account || form.ownerAddress);
    console.log('[BASE] Provider lookup result');
    console.table([{
      hasProvider: !!provider,
      hasRequest: !!provider?.request,
      providerName: provider?.providerName || provider?.name || 'unknown',
      isMetaMask: !!provider?.isMetaMask,
      isCoinbaseWallet: !!provider?.isCoinbaseWallet,
      isTrust: !!provider?.isTrust || !!provider?.isTrustWallet,
    }]);
    if (!provider?.request) {
      throw new Error('No EVM wallet provider found. Use MetaMask, Coinbase, or WalletConnect.');
    }

    let sender = String(account || '').trim();
    let accounts = [];
    try {
      accounts = await provider.request({ method: 'eth_accounts' });
    } catch {
      accounts = [];
    }
    if (!Array.isArray(accounts) || !accounts.length) {
      accounts = await provider.request({ method: 'eth_requestAccounts' });
    }
    if (!Array.isArray(accounts) || !accounts.length) {
      throw new Error('No EVM account available. Unlock your wallet and retry.');
    }
    if (!sender) sender = String(accounts[0] || '');
    if (!/^0x[a-fA-F0-9]{40}$/.test(sender)) {
      throw new Error('Active wallet account is not a valid EVM address.');
    }

    const chainId = String(await provider.request({ method: 'eth_chainId' }) || '').toLowerCase();
    if (chainId !== BASE_EVM_NETWORK.id.toLowerCase()) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_EVM_NETWORK.id }],
        });
      } catch (switchError) {
        if (switchError?.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_EVM_NETWORK.id,
              chainName: BASE_EVM_NETWORK.name,
              nativeCurrency: BASE_EVM_NETWORK.nativeCurrency,
              rpcUrls: [BASE_EVM_NETWORK.rpc],
              blockExplorerUrls: BASE_EVM_NETWORK.blockExplorerUrls,
            }],
          });
        } else {
          throw switchError;
        }
      }
    }

    const finalChain = String(await provider.request({ method: 'eth_chainId' }) || '').toLowerCase();
    if (finalChain !== BASE_EVM_NETWORK.id.toLowerCase()) {
      throw new Error('Wallet is still not connected to Base Mainnet.');
    }

    const decimals = Number(form.decimals);
    const initialSupply = BigInt(Math.floor(Number(form.initialSupply)));
    const multiplier = 10n ** BigInt(decimals);
    const totalSupply = (initialSupply * multiplier).toString();
    const explicitMetadataUri = String(form.metadataUri || '').trim();
    let metadataUri = explicitMetadataUri;

    if (!metadataUri) {
      try {
        const metadataRes = await fetch(apiUrl('/api/token-metadata'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildMetadataPayload()),
        });
        const metadataData = await metadataRes.json();
        if (metadataRes.ok && metadataData?.uri) {
          metadataUri = String(metadataData.uri);
        }
      } catch {
        // Metadata endpoint is optional for direct factory creation.
      }
    }

    const codeAtFactory = await provider.request({
      method: 'eth_getCode',
      params: [factoryAddress, 'latest'],
    });
    if (!codeAtFactory || String(codeAtFactory).toLowerCase() === '0x') {
      throw new Error('Factory contract not found at VITE_BASE_ERC20_FACTORY_ADDRESS on Base.');
    }

    await assertBaseFactoryShape(provider, factoryAddress, sender);

    const abiDataWithMetadata = encodeCreateTokenCallData({
      name: tokenName,
      symbol: tokenSymbol,
      decimals,
      totalSupply,
      ownerAddress: form.ownerAddress || account,
      metadataUri,
      useMetadata: true,
    });
    const abiDataLegacy = encodeCreateTokenCallData({
      name: tokenName,
      symbol: tokenSymbol,
      decimals,
      totalSupply,
      ownerAddress: form.ownerAddress || account,
      useMetadata: false,
    });

    let dataToSend = abiDataLegacy;
    let methodUsed = 'createToken(name,symbol,decimals,supply,owner)';
    try {
      await provider.request({
        method: 'eth_estimateGas',
        params: [{ from: sender, to: factoryAddress, data: abiDataWithMetadata }],
      });
      dataToSend = abiDataWithMetadata;
      methodUsed = 'createToken(name,symbol,decimals,supply,owner,metadataUri)';
      console.log('[BASE] Factory supports metadata method');
    } catch (metadataMethodError) {
      console.warn('[BASE] Metadata method estimate failed, falling back to legacy method', serializeBaseDebugError(metadataMethodError));
    }

    let mintedCountBefore = null;
    try {
      mintedCountBefore = await getBaseFactoryMintCount(provider, factoryAddress);
    } catch {
      mintedCountBefore = null;
    }

    console.log('[BASE] Prepared direct create payload');
    console.table([{
      sender,
      ownerAddress: form.ownerAddress || account,
      factoryAddress,
      methodUsed,
      decimals,
      totalSupply,
      metadataUriLength: metadataUri.length,
    }]);

    console.log('[BASE] Simulating factory call');
    try {
      await simulateFactoryCall(provider, {
        from: sender,
        to: factoryAddress,
        data: dataToSend,
      });
    } catch (simulationError) {
      if (isIgnorableBaseProviderRpcError(simulationError)) {
        console.warn('[BASE] Wallet returned an empty eth_call response during simulation; retrying through Base public RPC', serializeBaseDebugError(simulationError));
        await attemptBasePublicRpcPreflight('eth_call', [{ from: sender, to: factoryAddress, data: dataToSend }, 'latest']);
      } else {
        throw simulationError;
      }
    }

    console.log('[BASE] Estimating gas for final method', methodUsed);
    let gas = null;
    try {
      gas = await provider.request({
        method: 'eth_estimateGas',
        params: [{ from: sender, to: factoryAddress, data: dataToSend }],
      });
    } catch (estimateGasError) {
      if (isIgnorableBaseProviderRpcError(estimateGasError, 'eth_estimategas')) {
        console.warn('[BASE] Wallet returned an empty eth_estimateGas response; retrying through Base public RPC', serializeBaseDebugError(estimateGasError));
        gas = await attemptBasePublicRpcPreflight('eth_estimateGas', [{ from: sender, to: factoryAddress, data: dataToSend }]);
      } else {
        throw estimateGasError;
      }
    }

    console.log('[BASE] Sending transaction');
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: sender,
        to: factoryAddress,
        data: dataToSend,
        ...(gas ? { gas } : {}),
      }],
    });
    if (!txHash) throw new Error('No transaction hash returned');

    const receipt = await waitForTransactionReceipt(provider, txHash);
    let tokenAddress = extractCreatedTokenAddress(receipt, factoryAddress);
    const eventAddressLooksLikeContract = await isBaseContractAddress(provider, tokenAddress);
    if (!eventAddressLooksLikeContract) {
      tokenAddress = null;
    }
    if (!tokenAddress && mintedCountBefore != null) {
      try {
        const mintedRecord = await getBaseFactoryMintRecord(provider, factoryAddress, mintedCountBefore);
        const fallbackAddress = String(mintedRecord?.token || '').trim();
        if (await isBaseContractAddress(provider, fallbackAddress)) {
          tokenAddress = fallbackAddress;
        }
      } catch {
        // Ignore record fallback failure.
      }
    }

    setDirectBaseResult({
      txHash,
      factoryAddress,
      metadataUri,
      methodUsed,
      tokenAddress,
      explorerUrl: baseExplorerTokenUrl(tokenAddress),
      txExplorerUrl: baseExplorerTxUrl(txHash),
      aiChecked: false,
      aiScan: null,
      registryRecord: null,
      registryError: '',
      verifiedSource: 'SaveMeme Base factory / verified source',
    });

    toast.success(tokenAddress
      ? `SaveMeme Base token created: ${tokenAddress}`
      : 'Base token create transaction submitted');

    if (!tokenAddress) {
      toast.warning('Base token transaction succeeded, but the new token address could not be recovered. SaveMeme registry and X auto-post were skipped for this mint.', { duration: 12000 });
    } else {
      queueMicrotask(async () => {
        let aiScan = null;
        let registryRecord = null;
        let registryError = '';

        try {
          aiScan = await runOptionalAiScan({
            address: tokenAddress,
            chain: 'base',
            name: tokenName,
            symbol: tokenSymbol,
          });
        } catch (aiScanError) {
          console.warn('[BASE] Optional AI scan failed after mint', aiScanError);
        }

        try {
          registryRecord = await saveMintRecord({
            address: tokenAddress,
            chain: 'base',
            txHash,
            metadataUri,
            name: tokenName,
            symbol: tokenSymbol,
            aiScan,
            extra: {
              factoryAddress,
              verifiedSource: 'SaveMeme Base factory / verified source',
              methodUsed,
              platform: 'SaveMeme',
            },
          });
        } catch (registrationError) {
          registryError = String(
            registrationError?.message ||
            registrationError ||
            'SaveMeme registry save failed after token creation.'
          );
        }

        setDirectBaseResult((prev) => ({
          ...(prev || {}),
          txHash,
          factoryAddress,
          metadataUri,
          methodUsed,
          tokenAddress,
          explorerUrl: baseExplorerTokenUrl(tokenAddress),
          txExplorerUrl: baseExplorerTxUrl(txHash),
          aiChecked: Boolean(aiScan),
          aiScan,
          registryRecord,
          registryError,
          verifiedSource: 'SaveMeme Base factory / verified source',
        }));

        if (registryError) {
          toast.warning(`Token created on Base, but SaveMeme registry/X sync failed: ${registryError}`, { duration: 12000 });
        }
      });
    }
  } catch (error) {
    const debugError = serializeBaseDebugError(error);
    const failureDetails = {
      account: account || '',
      factoryAddress: import.meta.env.VITE_BASE_ERC20_FACTORY_ADDRESS || '',
      chain: form?.chain || '',
      name: form?.name || '',
      symbol: form?.symbol || '',
      decimals: String(form?.decimals || ''),
      initialSupply: String(form?.initialSupply || ''),
      ownerAddress: form?.ownerAddress || '',
      metadataUri: form?.metadataUri || '',
      message: debugError.message,
      shortMessage: debugError.shortMessage,
      reason: debugError.reason,
      code: debugError.code,
      data: typeof debugError.data === 'string' ? debugError.data : JSON.stringify(debugError.data),
      causeMessage: debugError.causeMessage,
      infoMessage: debugError.infoMessage,
      infoErrorMessage: debugError.infoErrorMessage,
    };
    console.error('[BASE] Direct create failed', failureDetails);
    console.log('[BASE] Failure stage details JSON:', JSON.stringify(failureDetails, null, 2));
    console.table([failureDetails]);
    if (debugError.stack) console.error('[BASE] Stack:', debugError.stack);
    const message = extractEvmErrorMessage(error) || String(error || '');
    toast.error(message || 'Base ERC20 direct create failed', { duration: 12000 });
  } finally {
    setIsDirectBaseCreating(false);
  }
}


