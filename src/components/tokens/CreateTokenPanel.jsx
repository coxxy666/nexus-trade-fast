import React from 'react';
import { Wand2, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/apiUrl';
import { useWallet } from '@/components/WalletContext';

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSVAR_RENT_PUBKEY = 'SysvarRent111111111111111111111111111111111';
const MINT_ACCOUNT_SIZE = 82;
const toAbsoluteHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${raw}`;
  }
  return null;
};

const SOLANA_RPC_FALLBACKS = [
  toAbsoluteHttpUrl(apiUrl('/api/solana-rpc')),
  toAbsoluteHttpUrl(import.meta.env.VITE_SOLANA_RPC_URL),
].filter(Boolean);
const BEP20_CREATE_SELECTOR_LEGACY = '0x5165749e';
const BEP20_CREATE_SELECTOR_WITH_METADATA = '0x6fc6ce0e';
const BEP20_TOKEN_CREATED_TOPIC = '0xd2db7bb578a69b9619e7208ed6e813b563c0729ec8e025d92c316909befb64ca';

function bigintToLeU64(value) {
  const out = new Uint8Array(8);
  let v = BigInt(value);
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function buildInitializeMintData(decimals, mintAuthority, freezeAuthority) {
  const data = new Uint8Array(67);
  data[0] = 0; // InitializeMint
  data[1] = Number(decimals);
  data.set(mintAuthority.toBytes(), 2);
  data[34] = 1; // has freeze authority
  data.set(freezeAuthority.toBytes(), 35);
  return data;
}

function buildMintToData(amountBigInt) {
  const data = new Uint8Array(9);
  data[0] = 7; // MintTo
  data.set(bigintToLeU64(amountBigInt), 1);
  return data;
}

function buildSetAuthorityData(authorityType, newAuthority = null) {
  const hasNewAuthority = !!newAuthority;
  const data = new Uint8Array(hasNewAuthority ? 35 : 3);
  data[0] = 6; // SetAuthority
  data[1] = Number(authorityType); // 0 = MintTokens, 1 = FreezeAccount
  data[2] = hasNewAuthority ? 1 : 0;
  if (hasNewAuthority) data.set(newAuthority.toBytes(), 3);
  return data;
}

function encodeBorshString(value) {
  const input = String(value || '');
  const bytes = new TextEncoder().encode(input);
  const out = new Uint8Array(4 + bytes.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, bytes.length, true);
  out.set(bytes, 4);
  return out;
}

function concatBytes(...parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function buildCreateMetadataV3Data({ name, symbol, uri, isMutable = false }) {
  const ix = new Uint8Array([33]); // CreateMetadataAccountV3
  const sellerFeeBasisPoints = new Uint8Array([0, 0]); // 0%
  const none = new Uint8Array([0]); // Option::None
  const mutableFlag = new Uint8Array([isMutable ? 1 : 0]);
  return concatBytes(
    ix,
    encodeBorshString(String(name || '').slice(0, 32)),
    encodeBorshString(String(symbol || '').slice(0, 10)),
    encodeBorshString(String(uri || '').slice(0, 200)),
    sellerFeeBasisPoints,
    none, // creators
    none, // collection
    none, // uses
    mutableFlag,
    none // collectionDetails
  );
}

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

  let metadataDyn = '';
  if (useMetadata) {
    metadataDyn = encodeStringDynamic(metadataUri);
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

  const selector = useMetadata ? BEP20_CREATE_SELECTOR_WITH_METADATA : BEP20_CREATE_SELECTOR_LEGACY;
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
  return found ? found.trim() : '';
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

function extractCreatedTokenAddress(receipt) {
  const logs = Array.isArray(receipt?.logs) ? receipt.logs : [];
  const eventLog = logs.find((log) => String(log?.topics?.[0] || '').toLowerCase() === BEP20_TOKEN_CREATED_TOPIC);
  const topicAddress = String(eventLog?.topics?.[1] || '').replace(/^0x/i, '').slice(-40);
  return /^[a-fA-F0-9]{40}$/.test(topicAddress) ? `0x${topicAddress}` : null;
}

export default function CreateTokenPanel() {
  const { account, walletType, wcProvider } = useWallet();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDirectMinting, setIsDirectMinting] = React.useState(false);
  const [isDirectBep20Creating, setIsDirectBep20Creating] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [directResult, setDirectResult] = React.useState(null);
  const [directBep20Result, setDirectBep20Result] = React.useState(null);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [form, setForm] = React.useState({
    chain: 'bep20',
    name: '',
    symbol: '',
    decimals: '18',
    initialSupply: '1000000',
    ownerAddress: '',
    logoUrl: '',
    metadataUri: '',
    description: '',
    revokeMintAuthority: true,
    revokeFreezeAuthority: true,
    immutableMetadata: true,
  });

  React.useEffect(() => {
    if (!account) return;
    setForm((prev) => ({ ...prev, ownerAddress: prev.ownerAddress || account }));
  }, [account]);

  React.useEffect(() => {
    setForm((prev) => {
      if (prev.chain === 'solana' && String(prev.decimals) !== '9') {
        return { ...prev, decimals: '9' };
      }
      if (prev.chain === 'bep20' && String(prev.decimals) === '9') {
        return { ...prev, decimals: '18' };
      }
      return prev;
    });
  }, [form.chain]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateCreateForm = React.useCallback((chain = form.chain) => {
    const errors = {};
    const tokenName = String(form.name || '').trim();
    const tokenSymbol = String(form.symbol || '').trim().toUpperCase();
    const owner = String(form.ownerAddress || '').trim();

    if (!tokenName) errors.name = 'Token name is required';
    if (!tokenSymbol) errors.symbol = 'Symbol is required';
    if (!owner) {
      errors.ownerAddress = 'Owner address is required';
    } else if (chain === 'bep20' && !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      errors.ownerAddress = 'Owner must be a valid EVM address (0x...)';
    } else if (chain === 'solana' && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(owner)) {
      errors.ownerAddress = 'Owner must be a valid Solana address';
    }

    setFieldErrors(errors);
    return { valid: Object.keys(errors).length === 0, tokenName, tokenSymbol, owner };
  }, [form]);

  const getConnectedSolanaProvider = React.useCallback(() => {
    const candidates = [
      window?.phantom?.solana,
      window?.solflare?.solana || window?.solflare,
      window?.backpack?.solana || window?.backpack,
      window?.solana,
    ].filter(Boolean);

    for (const p of candidates) {
      const pub = p?.publicKey;
      const addr =
        (typeof pub?.toBase58 === 'function' && pub.toBase58()) ||
        (typeof pub?.toString === 'function' && pub.toString()) ||
        '';
      if (addr && account && String(addr) === String(account) && typeof p?.signTransaction === 'function') {
        return p;
      }
    }
    return candidates.find((p) => typeof p?.signTransaction === 'function') || null;
  }, [account]);

  const getConnectedEvmProvider = React.useCallback(async (targetAccount = '') => {
    const wanted = String(targetAccount || '').toLowerCase();
    if (walletType === 'walletconnect' && wcProvider?.request) return wcProvider;

    const injected = window?.ethereum;
    const providers = Array.isArray(injected?.providers) && injected.providers.length > 0
      ? injected.providers.filter((p) => typeof p?.request === 'function')
      : (injected?.request ? [injected] : []);

    if (!providers.length) return null;

    const matches = [];
    for (const p of providers) {
      try {
        const accounts = await p.request({ method: 'eth_accounts' });
        const hasMatch = Array.isArray(accounts) && accounts.some((a) => String(a || '').toLowerCase() === wanted);
        if (hasMatch) matches.push(p);
      } catch {
        // ignore provider probe failure
      }
    }

    if (matches.length > 1) {
      const nonPhantom = matches.find((p) => !p?.isPhantom && !String(p?.providerName || '').toLowerCase().includes('phantom'));
      if (nonPhantom) return nonPhantom;
    }
    if (matches.length > 0) return matches[0];

    // Prefer non-Phantom when no direct account match exists.
    const nonPhantom = providers.find((p) => !p?.isPhantom && !String(p?.providerName || '').toLowerCase().includes('phantom'));
    return nonPhantom || providers[0];
  }, [wcProvider, walletType]);

  const getHealthySolanaConnection = React.useCallback(async () => {
    const { Connection } = await import('@solana/web3.js');
    let lastError = null;
    if (!SOLANA_RPC_FALLBACKS.length) {
      throw new Error('No Solana RPC configured. Set VITE_SOLANA_RPC_URL or run API proxy.');
    }
    for (const rpcUrl of SOLANA_RPC_FALLBACKS) {
      try {
        const conn = new Connection(rpcUrl, 'confirmed');
        await conn.getLatestBlockhash('confirmed');
        return conn;
      } catch (error) {
        lastError = error;
      }
    }
    const msg = String(lastError?.message || lastError || '');
    if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
      throw new Error('Solana RPC proxy unreachable. Start API server with `npm run dev:api`.');
    }
    throw lastError || new Error('No Solana RPC endpoint is reachable');
  }, []);

  const handleDirectSolanaMint = async () => {
    if (form.chain !== 'solana') {
      toast.error('Direct mint is only available for Solana in this build');
      return;
    }

    setIsDirectMinting(true);
    setDirectResult(null);
    try {
      const check = validateCreateForm('solana');
      if (!check.valid) {
        throw new Error('Please fix highlighted fields');
      }
      const { tokenName, tokenSymbol } = check;

      const provider = getConnectedSolanaProvider();
      if (!provider) {
        throw new Error('Connected Solana provider not found');
      }

      if (!provider.publicKey && typeof provider.connect === 'function') {
        try {
          await provider.connect({ onlyIfTrusted: true });
        } catch {
          await provider.connect();
        }
      }
      if (!provider.publicKey) {
        throw new Error('Connect your Solana wallet and try again');
      }

      const {
        PublicKey,
        Keypair,
        SystemProgram,
        Transaction,
        TransactionInstruction,
      } = await import('@solana/web3.js');

      const connection = await getHealthySolanaConnection();
      const payer = provider.publicKey;
      const mintKeypair = Keypair.generate();
      const tokenProgram = new PublicKey(TOKEN_PROGRAM_ID);
      const metadataProgram = new PublicKey(TOKEN_METADATA_PROGRAM_ID);
      const associatedProgram = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
      const rentSysvar = new PublicKey(SYSVAR_RENT_PUBKEY);
      const explicitMetadataUri = String(form.metadataUri || '').trim();
      let metadataUri = explicitMetadataUri;
      if (!metadataUri) {
        const metadataRes = await fetch(apiUrl('/api/token-metadata'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: tokenName,
            symbol: tokenSymbol,
            description: String(form.description || '').trim(),
            image: String(form.logoUrl || '').trim(),
          }),
        });
        const metadataData = await metadataRes.json();
        if (!metadataRes.ok || !metadataData?.uri) {
          throw new Error(metadataData?.error || 'Failed to auto-create metadata URI');
        }
        metadataUri = String(metadataData.uri);
      }
      const [metadataAddress] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode('metadata'),
          metadataProgram.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        metadataProgram
      );

      const [associatedTokenAddress] = PublicKey.findProgramAddressSync(
        [payer.toBuffer(), tokenProgram.toBuffer(), mintKeypair.publicKey.toBuffer()],
        associatedProgram
      );

      const decimals = Number(form.decimals);
      const initialSupply = BigInt(String(form.initialSupply || '0'));
      const multiplier = 10n ** BigInt(decimals);
      const mintAmount = initialSupply * multiplier;
      const rentForMint = await connection.getMinimumBalanceForRentExemption(MINT_ACCOUNT_SIZE);

      const tx = new Transaction();
      tx.add(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_ACCOUNT_SIZE,
          lamports: rentForMint,
          programId: tokenProgram,
        })
      );

      tx.add(
        new TransactionInstruction({
          programId: tokenProgram,
          keys: [
            { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: rentSysvar, isSigner: false, isWritable: false },
          ],
          data: buildInitializeMintData(decimals, payer, payer),
        })
      );

      tx.add(
        new TransactionInstruction({
          programId: metadataProgram,
          keys: [
            { pubkey: metadataAddress, isSigner: false, isWritable: true },
            { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
            { pubkey: payer, isSigner: true, isWritable: false },
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: payer, isSigner: true, isWritable: false }, // update authority
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: rentSysvar, isSigner: false, isWritable: false },
          ],
          data: buildCreateMetadataV3Data({
            name: tokenName,
            symbol: tokenSymbol,
            uri: metadataUri,
            isMutable: !form.immutableMetadata,
          }),
        })
      );

      tx.add(
        new TransactionInstruction({
          programId: associatedProgram,
          keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: false, isWritable: false },
            { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: tokenProgram, isSigner: false, isWritable: false },
          ],
          data: new Uint8Array([]),
        })
      );

      tx.add(
        new TransactionInstruction({
          programId: tokenProgram,
          keys: [
            { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: true, isWritable: false },
          ],
          data: buildMintToData(mintAmount),
        })
      );

      if (form.revokeMintAuthority) {
        tx.add(
          new TransactionInstruction({
            programId: tokenProgram,
            keys: [
              { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true },
              { pubkey: payer, isSigner: true, isWritable: false },
            ],
            data: buildSetAuthorityData(0, null),
          })
        );
      }

      if (form.revokeFreezeAuthority) {
        tx.add(
          new TransactionInstruction({
            programId: tokenProgram,
            keys: [
              { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true },
              { pubkey: payer, isSigner: true, isWritable: false },
            ],
            data: buildSetAuthorityData(1, null),
          })
        );
      }

      const latest = await connection.getLatestBlockhash('confirmed');
      tx.feePayer = payer;
      tx.recentBlockhash = latest.blockhash;
      tx.partialSign(mintKeypair);

      let signature = null;
      if (typeof provider.signAndSendTransaction === 'function') {
        const resultValue = await provider.signAndSendTransaction(tx);
        signature = typeof resultValue === 'string' ? resultValue : resultValue?.signature;
      } else {
        const signed = await provider.signTransaction(tx);
        signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      }

      if (!signature) {
        throw new Error('Failed to submit transaction');
      }

      await connection.confirmTransaction({
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }, 'confirmed');

      const payload = {
        mintAddress: mintKeypair.publicKey.toBase58(),
        metadataAddress: metadataAddress.toBase58(),
        tokenAccount: associatedTokenAddress.toBase58(),
        txHash: signature,
        name: tokenName,
        symbol: tokenSymbol,
        logoUrl: metadataUri || '',
        metadataUri,
        authorities: {
          mintAuthority: form.revokeMintAuthority ? null : payer.toBase58(),
          freezeAuthority: form.revokeFreezeAuthority ? null : payer.toBase58(),
        },
      };
      try {
        const storageKey = 'nexus_created_tokens';
        const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const nextItem = {
          symbol: tokenSymbol,
          name: tokenName,
          address: payload.mintAddress,
          logo_url: String(form.logoUrl || '').trim() || '/save-meme-logo.png',
          network: 'solana',
          price_usd: 0,
          price_change_24h: 0,
          volume_24h: 0,
          liquidity: 0,
          market_cap: 0,
          created_at: Date.now(),
        };
        const deduped = [nextItem, ...current.filter((t) => String(t?.address || '').toLowerCase() !== nextItem.address.toLowerCase())];
        localStorage.setItem(storageKey, JSON.stringify(deduped.slice(0, 200)));
      } catch {
        // ignore local storage failures
      }
      setDirectResult(payload);
      const successMessage = `Solana token created: ${payload.mintAddress}`;
      toast.success(successMessage, { duration: 12000 });
    } catch (error) {
      console.error('Direct Solana mint failed:', error);
      const msg = String(error?.message || error || 'Direct mint failed');
      toast.error(msg);
    } finally {
      setIsDirectMinting(false);
    }
  };

  const handleDirectBep20Create = async () => {
    if (form.chain !== 'bep20') {
      toast.error('Direct create is only available for BEP20 in this section');
      return;
    }
    console.log('[BEP20] Create clicked', {
      chain: form.chain,
      walletType,
      account,
      ownerAddress: form.ownerAddress,
      factoryAddress: import.meta.env.VITE_BEP20_FACTORY_ADDRESS,
    });
    toast.message('Preparing BEP20 transaction...');

    const factoryAddress = import.meta.env.VITE_BEP20_FACTORY_ADDRESS;
    if (!factoryAddress) {
      toast.error('Set VITE_BEP20_FACTORY_ADDRESS in .env.local');
      return;
    }

    setIsDirectBep20Creating(true);
    setDirectBep20Result(null);
    try {
      console.log('[BEP20] Step 1: validating inputs');
      const check = validateCreateForm('bep20');
      if (!check.valid) {
        throw new Error('Please fix highlighted fields');
      }
      const { tokenName, tokenSymbol } = check;

      const provider = await getConnectedEvmProvider(account || form.ownerAddress);
      if (!provider?.request) {
        throw new Error('No EVM wallet provider found. Use MetaMask/Trust/Binance extension.');
      }
      console.log('[BEP20] Provider selected', {
        providerName: provider?.providerName || provider?.name || 'unknown',
        isPhantom: !!provider?.isPhantom,
        isMetaMask: !!provider?.isMetaMask,
        isTrust: !!provider?.isTrust || !!provider?.isTrustWallet,
        isBinance: !!provider?.isBinance || !!provider?.isBinanceWallet || !!provider?.isBinanceChain,
      });

      console.log('[BEP20] Step 2: resolving account');
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
      console.log('[BEP20] Accounts resolved', { accounts, senderBeforeFallback: sender });
      if (!Array.isArray(accounts) || !accounts.length) {
        throw new Error('No EVM account available. Unlock your wallet and retry.');
      }
      if (!sender) sender = String(accounts[0] || '');
      if (!/^0x[a-fA-F0-9]{40}$/.test(sender)) {
        throw new Error('Active wallet account is not a valid EVM address.');
      }

      console.log('[BEP20] Step 3: ensuring BSC network');
      const chainId = String(await provider.request({ method: 'eth_chainId' }) || '').toLowerCase();
      console.log('[BEP20] Chain ID before switch', { chainId });
      if (chainId !== '0x38') {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      }
      const finalChain = String(await provider.request({ method: 'eth_chainId' }) || '').toLowerCase();
      console.log('[BEP20] Chain ID final', { finalChain });

      console.log('[BEP20] Step 4: creating/reading metadata URI');
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
            body: JSON.stringify({
              name: tokenName,
              symbol: tokenSymbol,
              description: String(form.description || '').trim(),
              image: String(form.logoUrl || '').trim(),
            }),
          });
          const metadataData = await metadataRes.json();
          if (metadataRes.ok && metadataData?.uri) {
            metadataUri = String(metadataData.uri);
          }
        } catch {
          // Metadata endpoint is optional for BEP20 creation.
        }
      }

      console.log('[BEP20] Step 5: factory contract check');
      const codeAtFactory = await provider.request({
        method: 'eth_getCode',
        params: [factoryAddress, 'latest'],
      });
      console.log('[BEP20] Factory code check', {
        factoryAddress,
        codePrefix: String(codeAtFactory || '').slice(0, 18),
        codeLength: String(codeAtFactory || '').length,
      });
      if (!codeAtFactory || String(codeAtFactory).toLowerCase() === '0x') {
        throw new Error('Factory contract not found at VITE_BEP20_FACTORY_ADDRESS on BSC.');
      }

      console.log('[BEP20] Step 6: encoding calldata');
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
      console.log('[BEP20] Step 7: selecting supported factory method');
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
        // keep legacy fallback for factories without metadata support
      }
      console.log('[BEP20] Method selected', { methodUsed, hasMetadataUri: !!metadataUri });

      console.log('[BEP20] Step 8: estimating gas');
      let gas = null;
      try {
        gas = await provider.request({
          method: 'eth_estimateGas',
          params: [{
            from: sender,
            to: factoryAddress,
            data: dataToSend,
          }],
        });
      } catch {
        // some wallets estimate internally; ignore
      }
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
      const tokenAddress = extractCreatedTokenAddress(receipt);
      setDirectBep20Result({ txHash, factoryAddress, metadataUri, methodUsed, tokenAddress });
      toast.success(tokenAddress
        ? `BEP20 token created: ${tokenAddress}`
        : 'BEP20 create transaction submitted');
    } catch (error) {
      const message = extractEvmErrorMessage(error) || String(error || '');
      const debugPayload = {
        message,
        code: error?.code,
        reason: error?.reason,
        shortMessage: error?.shortMessage,
        data: error?.data,
        error: error?.error,
        info: error?.info,
        stack: error?.stack,
      };
      let debugJson = '';
      try {
        debugJson = JSON.stringify(debugPayload, null, 2);
      } catch {
        debugJson = '[unserializable error payload]';
      }
      console.error('[BEP20] Create failed', {
        ...debugPayload,
        raw: error,
      });
      console.error('[BEP20] Create failed details', debugJson);
      if (error?.code === 4001 || message.toLowerCase().includes('user rejected')) {
        return;
      }
      toast.error(message || 'BEP20 direct create failed');
    } finally {
      setIsDirectBep20Creating(false);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    try {
      const check = validateCreateForm(form.chain);
      if (!check.valid) {
        throw new Error('Please fix highlighted fields');
      }
      const { tokenName, tokenSymbol } = check;

      const response = await fetch(apiUrl('/api/create-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: form.chain,
          name: tokenName,
          symbol: tokenSymbol,
          decimals: Number(form.decimals),
          initialSupply: Number(form.initialSupply),
          ownerAddress: form.ownerAddress,
          logoUrl: form.logoUrl || '',
          description: form.description,
          revokeMintAuthority: !!form.revokeMintAuthority,
          revokeFreezeAuthority: !!form.revokeFreezeAuthority,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to generate token package');
      }
      setResult(data);
      toast.success('Token package generated');
    } catch (error) {
      toast.error(error?.message || 'Failed to create token package');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-8 border border-white/10 mb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Create Token</h2>
          <p className="text-sm text-gray-400">Generate deployment package for Solana or BEP20</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label>Chain</Label>
            <select
              value={form.chain}
              onChange={(e) => onChange('chain', e.target.value)}
              className="w-full mt-2 h-10 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="bep20" className="bg-slate-950 text-white">BEP20 (BNB Smart Chain)</option>
              <option value="solana" className="bg-slate-950 text-white">Solana</option>
            </select>
          </div>
          <div>
            <Label>Owner Address</Label>
            <Input value={form.ownerAddress} onChange={(e) => onChange('ownerAddress', e.target.value)} className="mt-2" required />
            {fieldErrors.ownerAddress && <p className="text-xs text-red-400 mt-1">{fieldErrors.ownerAddress}</p>}
          </div>
          <div>
            <Label>Token Name</Label>
            <Input value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="My Token" className="mt-2" required />
            {fieldErrors.name && <p className="text-xs text-red-400 mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <Label>Symbol</Label>
            <Input value={form.symbol} onChange={(e) => onChange('symbol', e.target.value.toUpperCase())} placeholder="MTK" className="mt-2" required />
            {fieldErrors.symbol && <p className="text-xs text-red-400 mt-1">{fieldErrors.symbol}</p>}
          </div>
          <div>
            <Label>Decimals</Label>
            <Input
              type="number"
              min="0"
              max={form.chain === 'solana' ? '9' : '18'}
              value={form.decimals}
              onChange={(e) => onChange('decimals', e.target.value)}
              className="mt-2"
              required
            />
            {form.chain === 'solana' && <p className="text-xs text-gray-400 mt-1">Solana defaults to 9 decimals for standard SPL token display.</p>}
          </div>
          <div>
            <Label>Initial Supply</Label>
            <Input type="number" min="1" value={form.initialSupply} onChange={(e) => onChange('initialSupply', e.target.value)} className="mt-2" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label>Logo URL (Optional)</Label>
            <Input value={form.logoUrl} onChange={(e) => onChange('logoUrl', e.target.value)} placeholder="https://..." className="mt-2" />
          </div>
          <div>
            <Label>Metadata URI (Optional, Advanced)</Label>
            <Input value={form.metadataUri} onChange={(e) => onChange('metadataUri', e.target.value)} placeholder="Auto-generated if empty" className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Description (Optional)</Label>
            <Input value={form.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Optional notes" className="mt-2" />
          </div>
        </div>

        {form.chain === 'solana' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.revokeMintAuthority}
                onChange={(e) => onChange('revokeMintAuthority', e.target.checked)}
              />
              Revoke mint authority after creation (set to null)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.revokeFreezeAuthority}
                onChange={(e) => onChange('revokeFreezeAuthority', e.target.checked)}
              />
              Revoke freeze authority after creation (set to null)
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={!!form.immutableMetadata}
                onChange={(e) => onChange('immutableMetadata', e.target.checked)}
              />
              Lock metadata after creation (recommended). Uncheck to keep metadata editable.
            </label>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Generate Package
        </Button>
      </form>

      {result && (
        <div className="mt-7 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Package ready ({result.chain.toUpperCase()})</span>
          </div>

          <div className="space-y-2">
          {Array.isArray(result.nextSteps) && result.nextSteps.map((step, idx) => (
              <p key={idx} className="text-sm text-gray-300">{idx + 1}. {step}</p>
            ))}
          </div>

          {result.contractSource && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">BEP20 Contract Template</p>
                <button onClick={() => copyText(result.contractSource)} className="text-xs text-cyan-400 inline-flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="text-xs overflow-auto rounded-lg p-3 bg-black/40 border border-white/10 max-h-72">{result.contractSource}</pre>
            </div>
          )}

          {result.commandHint && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Solana CLI Commands</p>
                <button onClick={() => copyText(result.commandHint)} className="text-xs text-cyan-400 inline-flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="text-xs overflow-auto rounded-lg p-3 bg-black/40 border border-white/10">{result.commandHint}</pre>
            </div>
          )}
        </div>
      )}

      {form.chain === 'solana' && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
          <p className="text-sm text-emerald-300">Direct Wallet Mint (Solana)</p>
          <Button
            type="button"
            onClick={handleDirectSolanaMint}
            disabled={isDirectMinting}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
          >
            {isDirectMinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create & Mint To Connected Wallet
          </Button>
          <p className="text-xs text-gray-400">Requires a Solana wallet (Phantom/Solflare/Backpack) and enough SOL for fees.</p>

          {directResult && (
            <div className="text-xs text-gray-200 space-y-1">
              <p>Mint: {directResult.mintAddress}</p>
              <p>Metadata: {directResult.metadataAddress}</p>
              <p>Metadata URI: {directResult.metadataUri}</p>
              <p>Token Account: {directResult.tokenAccount}</p>
              <p>Tx: {directResult.txHash}</p>
              <p>Mint Authority: {String(directResult.authorities?.mintAuthority)}</p>
              <p>Freeze Authority: {String(directResult.authorities?.freezeAuthority)}</p>
            </div>
          )}
        </div>
      )}

      {form.chain === 'bep20' && (
        <div className="mt-4 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-3">
          <p className="text-sm text-cyan-300">Direct Wallet Create (BEP20)</p>
          <Button
            type="button"
            onClick={handleDirectBep20Create}
            disabled={isDirectBep20Creating}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
          >
            {isDirectBep20Creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create & Mint To Connected Wallet
          </Button>
          {(!account || !['bnb', 'walletconnect'].includes(walletType)) && (
            <p className="text-xs text-gray-400">Connect a BNB wallet to use direct create.</p>
          )}
          {!import.meta.env.VITE_BEP20_FACTORY_ADDRESS && (
            <p className="text-xs text-gray-400">Missing `VITE_BEP20_FACTORY_ADDRESS` in your env.</p>
          )}

          {directBep20Result && (
            <div className="text-xs text-gray-200 space-y-1">
              <p>BEP20 token created successfully.</p>
              {directBep20Result.tokenAddress && <p>Contract: {directBep20Result.tokenAddress}</p>}
              <p>Tx: {directBep20Result.txHash}</p>
              <a
                href={`https://bscscan.com/tx/${directBep20Result.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 hover:text-cyan-200 underline"
              >
                View on BscScan
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
