import { toast } from 'sonner';

import { apiUrl } from '@/lib/apiUrl';

const BSC_CREATE_SELECTOR_LEGACY = '0x5165749e';
const BSC_CREATE_SELECTOR_WITH_METADATA = '0x6fc6ce0e';
const BSC_FACTORY_TOTAL_MINTED_SELECTOR = '0xb142d69b';
const BSC_FACTORY_GET_MINTED_TOKEN_SELECTOR = '0xed47d4d1';
const BSC_MAINNET_CHAIN_ID = '0x38';
const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

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

  const selector = useMetadata ? BSC_CREATE_SELECTOR_WITH_METADATA : BSC_CREATE_SELECTOR_LEGACY;
  return `${selector}${head}${tails.join('')}`;
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
    return 'Insufficient BNB to deploy the token contract. Add more BNB for gas and try again.';
  }

  if (lower.includes('intrinsic gas too low') || lower.includes('gas required exceeds allowance') || lower.includes('cannot estimate gas')) {
    return 'The wallet could not estimate enough gas for this BNB token creation. Make sure you have enough BNB and try again.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    (Number(error?.code) === -32603 && lower.includes('fetch')) ||
    lowerStack.includes('failed to fetch')
  ) {
    return 'Your wallet could not reach the BNB Chain RPC while sending the transaction. Switch to BNB Smart Chain and try again.';
  }

  if (lower.includes('execution reverted')) {
    return 'The SaveMeme BNB factory rejected this token creation request. Check the token details and wallet balance, then try again.';
  }

  if (lower.includes('supply required')) {
    return 'Initial supply must be greater than 0 for BNB token creation.';
  }

  if (lower.includes('invalid owner')) {
    return 'Owner address is invalid for BNB token creation. Use a valid EVM address.';
  }

  if (lower.includes('name required')) {
    return 'Token name is required before minting on BNB Chain.';
  }

  if (lower.includes('symbol required')) {
    return 'Token symbol is required before minting on BNB Chain.';
  }

  if (lower.includes('user rejected')) {
    return 'Token creation was cancelled in the wallet before signing.';
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
    const firstTopic = String(log?.topics?.[1] || '').replace(/^0x/i, '').slice(-40);
    return emitter === normalizedFactory && /^[a-fA-F0-9]{40}$/.test(firstTopic);
  });
  const topicAddress = String(eventLog?.topics?.[1] || '').replace(/^0x/i, '').slice(-40);
  return /^[a-fA-F0-9]{40}$/.test(topicAddress) ? `0x${topicAddress}` : null;
}

export function bep20ExplorerTokenUrl(address) {
  return address ? `https://bscscan.com/token/${address}` : '';
}

export function bep20ExplorerTxUrl(txHash) {
  return txHash ? `https://bscscan.com/tx/${txHash}` : '';
}

async function getBep20FactoryMintCount(provider, factoryAddress) {
  if (!provider?.request || !factoryAddress) return null;
  const raw = await provider.request({
    method: 'eth_call',
    params: [{ to: factoryAddress, data: BSC_FACTORY_TOTAL_MINTED_SELECTOR }, 'latest'],
  });
  if (!raw || raw === '0x') return null;
  return Number(BigInt(raw));
}

async function getBep20FactoryMintRecord(provider, factoryAddress, index) {
  if (!provider?.request || !factoryAddress || index == null || index < 0) return null;
  const callData = `${BSC_FACTORY_GET_MINTED_TOKEN_SELECTOR}${toWordHex(index)}`;
  const raw = await provider.request({
    method: 'eth_call',
    params: [{ to: factoryAddress, data: callData }, 'latest'],
  });
  if (!raw || raw === '0x') return null;

  const { Web3 } = await import('web3');
  const decoded = Web3.eth.abi.decodeParameters(
    ['address', 'address', 'address', 'string', 'string', 'string', 'uint256'],
    raw,
  );

  return {
    token: decoded?.[0] || '',
  };
}

export async function handleDirectBep20Create({
  account,
  walletType,
  form,
  getConnectedEvmProvider,
  validateCreateForm,
  buildMetadataPayload,
  runOptionalAiScan,
  saveMintRecord,
  setIsDirectBep20Creating,
  setDirectBep20Result,
}) {
  if (form.chain !== 'bsc') {
    toast.error('Direct create is only available for BNB Chain in this section');
    return;
  }

  const factoryAddress = import.meta.env.VITE_BEP20_FACTORY_ADDRESS;
  if (!factoryAddress) {
    toast.error('Set VITE_BEP20_FACTORY_ADDRESS in .env.local');
    return;
  }

  console.log('[BEP20] Create clicked', {
    chain: form.chain,
    walletType,
    account,
    ownerAddress: form.ownerAddress,
    factoryAddress,
  });
  if (!account || !['bnb', 'walletconnect'].includes(walletType)) {
    toast.error('Connect an EVM wallet first');
    return;
  }

  toast.message('Preparing SaveMeme BEP20 transaction...');
  setIsDirectBep20Creating(true);
  setDirectBep20Result(null);

  try {
    const check = validateCreateForm('bsc');
    if (!check.valid) {
      throw new Error('Please fix highlighted fields');
    }
    const { tokenName, tokenSymbol } = check;

    const provider = await getConnectedEvmProvider(account || form.ownerAddress);
    if (!provider?.request) {
      throw new Error('No EVM wallet provider found. Use MetaMask/Trust/Binance extension.');
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
    if (chainId !== BSC_MAINNET_CHAIN_ID) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_MAINNET_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError?.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BSC_MAINNET_CHAIN_ID,
              chainName: 'BNB Smart Chain',
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: [BSC_MAINNET_RPC],
              blockExplorerUrls: ['https://bscscan.com/'],
            }],
          });
        } else {
          throw switchError;
        }
      }
    }

    const finalChain = String(await provider.request({ method: 'eth_chainId' }) || '').toLowerCase();
    console.log('[BEP20] Chain ID final', { finalChain });
    if (finalChain !== BSC_MAINNET_CHAIN_ID) {
      throw new Error('Wallet is still not connected to BNB Smart Chain.');
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
      throw new Error('Factory contract not found at VITE_BEP20_FACTORY_ADDRESS on BNB Smart Chain.');
    }

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
        params: [{
          from: sender,
          to: factoryAddress,
          data: abiDataWithMetadata,
        }],
      });
      dataToSend = abiDataWithMetadata;
      methodUsed = 'createToken(name,symbol,decimals,supply,owner,metadataUri)';
    } catch {
      // Legacy factory fallback.
    }

    let mintedCountBefore = null;
    try {
      mintedCountBefore = await getBep20FactoryMintCount(provider, factoryAddress);
      console.log('[BEP20] Factory mint count before send', { mintedCountBefore });
    } catch (countError) {
      console.warn('[BEP20] Failed to read factory mint count before send', countError);
    }

    console.log('[BEP20] Step 8: estimating gas');
    const gas = await provider.request({
      method: 'eth_estimateGas',
      params: [{
        from: sender,
        to: factoryAddress,
        data: dataToSend,
      }],
    });
    console.log('[BEP20] Gas estimate', { gas });

    console.log('[BEP20] Step 9: sending transaction');
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: sender,
        to: factoryAddress,
        data: dataToSend,
        ...(gas ? { gas } : {}),
      }],
    });
    console.log('[BEP20] Transaction sent', { txHash });

    if (!txHash) throw new Error('No transaction hash returned');
    const receipt = await waitForTransactionReceipt(provider, txHash);
    let tokenAddress = extractCreatedTokenAddress(receipt, factoryAddress);
    if (!tokenAddress && mintedCountBefore != null) {
      try {
        const mintedRecord = await getBep20FactoryMintRecord(provider, factoryAddress, mintedCountBefore);
        const fallbackAddress = String(mintedRecord?.token || '').trim();
        if (/^0x[a-fA-F0-9]{40}$/.test(fallbackAddress)) {
          tokenAddress = fallbackAddress;
        }
      } catch {
        // Ignore record fallback failure.
      }
    }

    const aiScan = tokenAddress ? await runOptionalAiScan({
      address: tokenAddress,
      chain: 'bsc',
      name: tokenName,
      symbol: tokenSymbol,
    }) : null;
    let registryRecord = null;
    let registryError = '';
    if (tokenAddress) {
      try {
        registryRecord = await saveMintRecord({
          address: tokenAddress,
          chain: 'bsc',
          txHash,
          metadataUri,
          name: tokenName,
          symbol: tokenSymbol,
          aiScan,
          extra: {
            factoryAddress,
            verifiedSource: 'SaveMeme factory / verified source',
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
    }

    setDirectBep20Result({
      txHash,
      factoryAddress,
      metadataUri,
      methodUsed,
      tokenAddress,
      explorerUrl: tokenAddress ? bep20ExplorerTokenUrl(tokenAddress) : '',
      txExplorerUrl: bep20ExplorerTxUrl(txHash),
      aiChecked: Boolean(aiScan),
      aiScan,
      registryRecord,
      registryError,
      verifiedSource: 'SaveMeme factory / verified source',
    });

    toast.success(tokenAddress
      ? `SaveMeme BNB token created: ${tokenAddress}`
      : 'BEP20 create transaction submitted');

    if (!tokenAddress) {
      toast.warning('BNB token transaction succeeded, but the new token address could not be recovered. SaveMeme registry and X auto-post were skipped for this mint.', { duration: 12000 });
    } else if (registryError) {
      toast.warning(`Token created on BNB Chain, but SaveMeme registry/X sync failed: ${registryError}`, { duration: 12000 });
    }
  } catch (error) {
    const message = extractEvmErrorMessage(error) || String(error || '');
    toast.error(message || 'BEP20 direct create failed', { duration: 12000 });
  } finally {
    setIsDirectBep20Creating(false);
  }
}
