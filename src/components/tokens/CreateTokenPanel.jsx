import React from 'react';
import { Wand2, Loader2, Copy, CheckCircle2, ExternalLink, ShieldCheck, Upload, Sparkles } from 'lucide-react';
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
  const message = found ? found.trim() : '';
  const lower = message.toLowerCase();

  if (lower.includes('insufficient funds') || lower.includes('insufficient balance') || lower.includes('exceeds balance')) {
    return 'Insufficient BNB to deploy the token contract. Add more BNB for gas and try again.';
  }

  if (lower.includes('intrinsic gas too low') || lower.includes('gas required exceeds allowance') || lower.includes('cannot estimate gas')) {
    return 'The wallet could not estimate enough gas for this token creation. Make sure you have enough BNB and try again.';
  }

  if (lower.includes('execution reverted')) {
    return 'The SaveMeme factory rejected this token creation request. Check the token details and wallet balance, then try again.';
  }

  if (lower.includes('user rejected')) {
    return 'Token creation was cancelled in the wallet before signing.';
  }

  return message;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SOLANA_MINT_METADATA_BUFFER_LAMPORTS = 16000000;

const DEFAULT_SOLANA_VANITY_PREFIXES = ['save', 'meme'];

function parseVanityPrefixes(value) {
  const raw = String(value || '').trim().toLowerCase();
  const source = raw || DEFAULT_SOLANA_VANITY_PREFIXES.join(',');
  return Array.from(new Set(source.split(',').map((item) => item.trim()).filter(Boolean)));
}

function formatVanityPrefixes(prefixes) {
  return Array.isArray(prefixes) ? prefixes.join(', ') : '';
}

function renderHighlightedAddress(address, term) {
  const rawAddress = String(address || '');
  const rawTerm = String(term || '');
  if (!rawAddress || !rawTerm) return rawAddress;

  const lowerAddress = rawAddress.toLowerCase();
  const lowerTerm = rawTerm.toLowerCase();
  const matchIndex = lowerAddress.indexOf(lowerTerm);
  if (matchIndex === -1) return rawAddress;

  const before = rawAddress.slice(0, matchIndex);
  const match = rawAddress.slice(matchIndex, matchIndex + rawTerm.length);
  const after = rawAddress.slice(matchIndex + rawTerm.length);

  return (
    <>
      {before}
      <span className="rounded-md bg-amber-300 px-1.5 py-0.5 font-semibold text-slate-950 shadow-[0_0_14px_rgba(252,211,77,0.45)]">{match}</span>
      {after}
    </>
  );
}

function formatLamportsAsSol(lamports) {
  return `${(Number(lamports || 0) / 1_000_000_000).toFixed(4)} SOL`;
}

async function extractSolanaMintErrorMessage(error) {
  const message = String(error?.message || error || 'Direct mint failed');
  let logs = [];
  if (typeof error?.getLogs === 'function') {
    try {
      logs = await error.getLogs();
    } catch {
      logs = [];
    }
  }
  const combined = `${message}` + (Array.isArray(logs) && logs.length ? `\n${logs.join('\n')}` : '');
  const insufficient = combined.match(/insufficient lamports\s+(\d+), need\s+(\d+)/i);
  if (insufficient) {
    const haveLamports = Number(insufficient[1]);
    const needLamports = Number(insufficient[2]);
    return `Insufficient SOL for token metadata creation. Wallet has ${formatLamportsAsSol(haveLamports)} but needs about ${formatLamportsAsSol(needLamports)}.`;
  }
  if (combined.toLowerCase().includes('insufficient lamports')) {
    return 'Insufficient SOL to create the mint and metadata accounts. Fund the wallet with more SOL and try again.';
  }
  return message;
}

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

async function waitForSolanaSignatureConfirmation(connection, signature, attempts = 30, delayMs = 2000) {
  for (let i = 0; i < attempts; i += 1) {
    const statuses = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = statuses?.value?.[0];
    if (status?.err) {
      throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return status;
    }
    await sleep(delayMs);
  }
  throw new Error('Solana transaction confirmation timed out. Check the signature in a Solana explorer.');
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

function explorerTokenUrl(chain, address) {
  if (!address) return '';
  if (chain === 'solana') return `https://solscan.io/token/${address}`;
  return `https://bscscan.com/token/${address}`;
}

function explorerTxUrl(chain, txHash) {
  if (!txHash) return '';
  if (chain === 'solana') return `https://solscan.io/tx/${txHash}`;
  return `https://bscscan.com/tx/${txHash}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file'));
    reader.readAsDataURL(file);
  });
}
async function generateVanitySolanaMintKeypair(Keypair, prefixes = DEFAULT_SOLANA_VANITY_PREFIXES, onProgress = null, shouldStop = null) {
  const wantedPrefixes = Array.isArray(prefixes) ? prefixes.filter(Boolean) : parseVanityPrefixes(prefixes);
  let attempt = 0;
  while (true) {
    attempt += 1;
    const candidate = Keypair.generate();
    const address = candidate.publicKey.toBase58();
    const normalizedAddress = address.toLowerCase();
    const matchedPrefix = wantedPrefixes.find((prefix) => normalizedAddress.includes(String(prefix || '').toLowerCase()));
    if (matchedPrefix) {
      if (typeof onProgress === 'function') onProgress(attempt, address, true, matchedPrefix);
      return { keypair: candidate, matched: true, attempts: attempt, address, matchedPrefix };
    }
    if (attempt % 1000 === 0 && typeof onProgress === 'function') {
      onProgress(attempt, address, false, '');
    }
    if (typeof shouldStop === 'function' && shouldStop()) {
      return { keypair: null, matched: false, attempts: attempt, address, matchedPrefix: '', stopped: true };
    }
    if (attempt % 500 === 0) {
      await sleep(0);
    }
  }
}
function SaveMemeBadge({ children, tone = 'cyan' }) {
  const tones = {
    cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone] || tones.cyan}`}>
      {children}
    </span>
  );
}
export default function CreateTokenPanel() {
  const { account, walletType, wcProvider } = useWallet();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDirectMinting, setIsDirectMinting] = React.useState(false);
  const [isDirectBep20Creating, setIsDirectBep20Creating] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [directResult, setDirectResult] = React.useState(null);
  const [directBep20Result, setDirectBep20Result] = React.useState(null);
  const [recentMints, setRecentMints] = React.useState([]);
  const [isAiScanning, setIsAiScanning] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [vanitySearchStatus, setVanitySearchStatus] = React.useState(null);
  const vanitySkipRequestedRef = React.useRef(false);
  const [form, setForm] = React.useState({
    chain: 'bsc',
    name: '',
    symbol: '',
    decimals: '18',
    initialSupply: '1000000',
    ownerAddress: '',
    logoUrl: '',
    logoFileName: '',
    metadataUri: '',
    description: '',
    category: 'meme',
    aiSafetyScan: true,
    revokeMintAuthority: true,
    revokeFreezeAuthority: true,
    immutableMetadata: true,
    enableVanityPrefix: true,
    vanityPrefix: 'save,meme',
  });

  React.useEffect(() => {
    if (!account) return;
    setForm((prev) => ({ ...prev, ownerAddress: prev.ownerAddress || account }));
  }, [account]);

  React.useEffect(() => {
    setForm((prev) => {
      if (prev.chain === 'solana') {
        const next = { ...prev };
        if (String(prev.decimals) !== '9') next.decimals = '9';
        if (!prev.enableVanityPrefix) next.enableVanityPrefix = true;
        if (!String(prev.vanityPrefix || '').trim()) next.vanityPrefix = 'save,meme';
        return next;
      }
      if (prev.chain === 'bsc' && String(prev.decimals) === '9') {
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
    } else if (chain === 'bsc' && !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      errors.ownerAddress = 'Owner must be a valid EVM address (0x...)';
    } else if (chain === 'solana' && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(owner)) {
      errors.ownerAddress = 'Owner must be a valid Solana address';
    }

    setFieldErrors(errors);
    return { valid: Object.keys(errors).length === 0, tokenName, tokenSymbol, owner };
  }, [form]);


  React.useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/tokens/minted-by-savememe'))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRecentMints(Array.isArray(data?.tokens) ? data.tokens.slice(0, 6) : []);
      })
      .catch(() => {
        if (!cancelled) setRecentMints([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogoFileChange = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((prev) => ({ ...prev, logoUrl: dataUrl, logoFileName: file.name }));
      toast.success('Logo attached');
    } catch (error) {
      toast.error(error?.message || 'Failed to read image file');
    }
  };

  const buildMetadataPayload = React.useCallback(() => ({
    name: String(form.name || '').trim(),
    symbol: String(form.symbol || '').trim().toUpperCase(),
    description: String(form.description || '').trim(),
    image: String(form.logoUrl || '').trim(),
    chain: form.chain,
    category: form.category,
    created_via: 'SaveMeme',
    launch_source: 'SaveMeme',
    creator_wallet: String(form.ownerAddress || account || '').trim(),
    creator_authority: form.chain === 'solana' ? String(form.ownerAddress || account || '').trim() : '',
    attribution_program: form.chain === 'solana' ? 'SaveMeme SPL launcher' : '',
    factory_address: form.chain === 'bsc' ? String(import.meta.env.VITE_BEP20_FACTORY_ADDRESS || '') : '',
    verified_source: form.chain === 'bsc' ? 'SaveMeme factory / verified source' : 'SaveMeme metadata + registry',
    vanity_prefix: form.chain === 'solana' && form.enableVanityPrefix ? formatVanityPrefixes(parseVanityPrefixes(form.vanityPrefix)) : '',
    timestamp: new Date().toISOString(),
  }), [account, form]);

  const registerSaveMemeMint = React.useCallback(async (payload) => {
    const res = await fetch(apiUrl('/api/tokens/register-savememe-mint'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Failed to register SaveMeme token');
    }
    setRecentMints((prev) => [data.token, ...prev.filter((item) => String(item?.token_address || '').toLowerCase() !== String(data.token?.token_address || '').toLowerCase())].slice(0, 6));
    return data.token;
  }, []);

  const runOptionalAiScan = React.useCallback(async ({ address, chain, name, symbol }) => {
    if (!form.aiSafetyScan || !address) return null;
    setIsAiScanning(true);
    try {
      const res = await fetch(apiUrl('/api/token-onchain-analysis'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: { address, chain, name, symbol } }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) return null;
      return data;
    } finally {
      setIsAiScanning(false);
    }
  }, [form.aiSafetyScan]);

  const saveMintRecord = React.useCallback(async ({ address, chain, txHash, metadataUri, name, symbol, aiScan = null, extra = {} }) => {
    return registerSaveMemeMint({
      token_address: address,
      chain,
      creator_wallet: form.ownerAddress || account,
      name,
      symbol,
      created_at: new Date().toISOString(),
      created_via: 'SaveMeme',
      launch_source: 'SaveMeme',
      category: form.category,
      timestamp: new Date().toISOString(),
      tx_hash: txHash,
      metadata_uri: metadataUri,
      logo_url: form.logoUrl || '',
      ai_checked: Boolean(aiScan),
      ai_scan: aiScan,
      creator_authority: chain === 'solana' ? (form.ownerAddress || account) : undefined,
      attribution_program: chain === 'solana' ? 'SaveMeme SPL launcher' : undefined,
      factory_address: chain === 'bsc' ? String(import.meta.env.VITE_BEP20_FACTORY_ADDRESS || '') : undefined,
      verified_source: chain === 'bsc' ? 'SaveMeme factory / verified source' : 'SaveMeme metadata + registry',
      vanity_prefix: chain === 'solana' && form.enableVanityPrefix ? formatVanityPrefixes(parseVanityPrefixes(form.vanityPrefix)) : undefined,
      attributes: { category: form.category, chain, ...extra },
    });
  }, [account, form, registerSaveMemeMint]);

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
        LAMPORTS_PER_SOL,
      } = await import('@solana/web3.js');

      const connection = await getHealthySolanaConnection();
      const payer = provider.publicKey;
      const vanityPrefixes = form.enableVanityPrefix ? parseVanityPrefixes(form.vanityPrefix) : [];
      const vanityPrefix = formatVanityPrefixes(vanityPrefixes);
      let mintKeypair = Keypair.generate();
      let vanityMatched = false;
      let vanityAttempts = 0;
      if (vanityPrefixes.length) {
        toast.message(`Searching strictly for Solana vanity mint prefixes '${vanityPrefix}'... This can take a while.`);
        setVanitySearchStatus({ prefixes: vanityPrefixes, attempts: 0, sampleAddress: '', matched: false, matchedPrefix: '', skipRequested: false });
        const vanityResult = await generateVanitySolanaMintKeypair(Keypair, vanityPrefixes, (attempts, sampleAddress, matched, matchedPrefix) => {
          setVanitySearchStatus({ prefixes: vanityPrefixes, attempts, sampleAddress, matched, matchedPrefix: matchedPrefix || '', skipRequested: vanitySkipRequestedRef.current });
        }, () => vanitySkipRequestedRef.current);
        if (vanityResult.matched && vanityResult.keypair) {
          mintKeypair = vanityResult.keypair;
        }
        vanityMatched = vanityResult.matched;
        vanityAttempts = vanityResult.attempts;
        if (!vanityMatched && !vanityResult.stopped) {
          throw new Error(`Strict vanity search ended without a match for '${vanityPrefix}', which should not happen.`);
        }
        if (vanityResult.stopped) {
          toast.message('Vanity search skipped. Continuing with a standard SaveMeme mint.');
        }
      }
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
          body: JSON.stringify(buildMetadataPayload()),
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
      const payerBalance = await connection.getBalance(payer, 'confirmed');
      const estimatedLamportsNeeded = rentForMint + SOLANA_MINT_METADATA_BUFFER_LAMPORTS;
      if (payerBalance < estimatedLamportsNeeded) {
        throw new Error(`Insufficient SOL for mint + metadata creation. Wallet has ${(payerBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL but needs about ${(estimatedLamportsNeeded / LAMPORTS_PER_SOL).toFixed(4)} SOL.`);
      }

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

      await waitForSolanaSignatureConfirmation(connection, signature);

      const aiScan = await runOptionalAiScan({
        address: mintKeypair.publicKey.toBase58(),
        chain: 'solana',
        name: tokenName,
        symbol: tokenSymbol,
      });
      const matchedVanityTerm = vanityPrefixes.find((prefix) => mintKeypair.publicKey.toBase58().toLowerCase().includes(String(prefix || '').toLowerCase())) || undefined;
      const registryRecord = await saveMintRecord({
        address: mintKeypair.publicKey.toBase58(),
        chain: 'solana',
        txHash: signature,
        metadataUri,
        name: tokenName,
        symbol: tokenSymbol,
        aiScan,
        extra: {
          creatorAuthority: payer.toBase58(),
          attributionProgram: 'SaveMeme SPL launcher',
          vanityPrefix: matchedVanityTerm ? vanityPrefix : undefined,
          vanityMatchedPrefix: matchedVanityTerm,
          vanityMatched: Boolean(matchedVanityTerm),
          vanityAttempts,
        },
      });
      const payload = {
        mintAddress: mintKeypair.publicKey.toBase58(),
        metadataAddress: metadataAddress.toBase58(),
        tokenAccount: associatedTokenAddress.toBase58(),
        txHash: signature,
        name: tokenName,
        symbol: tokenSymbol,
        logoUrl: metadataUri || '',
        metadataUri,
        explorerUrl: explorerTokenUrl('solana', mintKeypair.publicKey.toBase58()),
        txExplorerUrl: explorerTxUrl('solana', signature),
        aiChecked: Boolean(aiScan),
        aiScan,
        registryRecord,
        creatorAuthority: payer.toBase58(),
        attributionProgram: 'SaveMeme SPL launcher',
        vanityPrefix: matchedVanityTerm ? vanityPrefix : undefined,
        vanityMatchedPrefix: matchedVanityTerm,
        vanityMatched: Boolean(matchedVanityTerm),
        vanityAttempts,
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
      const successMessage = `SaveMeme Solana token created: ${payload.mintAddress}`;
      toast.success(successMessage, { duration: 12000 });
    } catch (error) {
      console.error('Direct Solana mint failed:', error);
      const msg = await extractSolanaMintErrorMessage(error);
      toast.error(msg, { duration: 12000 });
    } finally {
      setIsDirectMinting(false);
    }
  };

  const handleDirectBep20Create = async () => {
    if (form.chain !== 'bsc') {
      toast.error('Direct create is only available for BNB Chain in this section');
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
      const check = validateCreateForm('bsc');
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
            body: JSON.stringify(buildMetadataPayload()),
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
      const tokenAddress = extractCreatedTokenAddress(receipt, factoryAddress);
      const aiScan = tokenAddress ? await runOptionalAiScan({
        address: tokenAddress,
        chain: 'bsc',
        name: tokenName,
        symbol: tokenSymbol,
      }) : null;
      const registryRecord = tokenAddress ? await saveMintRecord({
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
        },
      }) : null;
      setDirectBep20Result({
        txHash,
        factoryAddress,
        metadataUri,
        methodUsed,
        tokenAddress,
        explorerUrl: tokenAddress ? explorerTokenUrl('bsc', tokenAddress) : '',
        txExplorerUrl: explorerTxUrl('bsc', txHash),
        aiChecked: Boolean(aiScan),
        aiScan,
        registryRecord,
        verifiedSource: 'SaveMeme factory / verified source',
      });
      toast.success(tokenAddress
        ? `SaveMeme BEP20 token created: ${tokenAddress}`
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
      toast.error(message || 'BEP20 direct create failed', { duration: 12000 });
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
          metadataUri: form.metadataUri || '',
          description: form.description,
          category: form.category,
          enableVanityPrefix: !!form.enableVanityPrefix,
          vanityPrefix: formatVanityPrefixes(parseVanityPrefixes(form.vanityPrefix)),
          revokeMintAuthority: !!form.revokeMintAuthority,
          revokeFreezeAuthority: !!form.revokeFreezeAuthority,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to generate token package');
      }
      setResult(data);
      toast.success('SaveMeme launch package generated');
    } catch (error) {
      toast.error(error?.message || 'Failed to create SaveMeme launch package');
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
          <h2 className="text-2xl font-bold">Create Meme Token</h2>
          <p className="text-sm text-gray-400">Generate SaveMeme launch packages for Solana or BNB Chain</p>
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
              <option value="bsc" className="bg-slate-950 text-white">BNB Chain</option>
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
            <Label>Meme Category</Label>
            <select
              value={form.category}
              onChange={(e) => onChange('category', e.target.value)}
              className="w-full mt-2 h-10 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="meme" className="bg-slate-950 text-white">Meme</option>
              <option value="ai-meme" className="bg-slate-950 text-white">AI Meme</option>
              <option value="animal" className="bg-slate-950 text-white">Animal</option>
              <option value="degen" className="bg-slate-950 text-white">Degen</option>
            </select>
          </div>
          <div>
            <Label>Metadata URI (Optional, Advanced)</Label>
            <Input value={form.metadataUri} onChange={(e) => onChange('metadataUri', e.target.value)} placeholder="Auto-generated if empty" className="mt-2" />
          </div>
          {form.chain === 'solana' && (
            <div>
              <Label>Optional Vanity Mint Prefixes</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!form.enableVanityPrefix}
                    onChange={(e) => onChange('enableVanityPrefix', e.target.checked)}
                  />
                  Try SaveMeme vanity mint prefix
                </label>
                <Input
                  value={form.vanityPrefix}
                  onChange={(e) => onChange('vanityPrefix', e.target.value.toLowerCase())}
                  placeholder="save,meme"
                  className="mt-2"
                  disabled={!form.enableVanityPrefix}
                />
                <p className="text-xs text-gray-400">Strict mode is enabled. SaveMeme will keep searching until the mint address contains one of these terms anywhere. Use comma-separated values like `save,meme` for better odds.</p>
              </div>
            </div>
          )}
          <div>
            <Label>Logo Upload</Label>
            <label className="mt-2 flex h-10 items-center gap-2 rounded-md border border-dashed border-white/15 bg-slate-950 px-3 text-sm text-gray-300 cursor-pointer hover:border-emerald-400/50">
              <Upload className="w-4 h-4" />
              <span>{form.logoFileName || 'Upload logo image'}</span>
              <input type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
            </label>
            {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="mt-3 h-14 w-14 rounded-xl object-cover border border-white/10" />}
          </div>
          <div>
            <Label>Logo URL (Optional)</Label>
            <Input value={form.logoUrl} onChange={(e) => onChange('logoUrl', e.target.value)} placeholder="https://... or use upload" className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Description (Optional)</Label>
            <Input value={form.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Describe the meme token and launch story" className="mt-2" />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={!!form.aiSafetyScan}
              onChange={(e) => onChange('aiSafetyScan', e.target.checked)}
            />
            Run optional AI safety scan after successful creation and mark the token as AI-checked.
          </label>
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
          Generate SaveMeme Package
        </Button>
      </form>

      {result && (
        <div className="mt-7 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">SaveMeme launch package ready ({String(result.chain || '').toUpperCase()})</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <SaveMemeBadge tone="cyan">Minted on SaveMeme</SaveMemeBadge>
            <SaveMemeBadge tone="emerald">Meme Token</SaveMemeBadge>
            {form.aiSafetyScan && <SaveMemeBadge tone="amber">AI-checked</SaveMemeBadge>}
            {result?.saveMeme?.vanityPrefix && <SaveMemeBadge tone="cyan">Vanity: {result.saveMeme.vanityPrefix}</SaveMemeBadge>}
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
          <p className="text-sm text-emerald-300">Direct SaveMeme Mint (Solana)</p>
          <Button
            type="button"
            onClick={handleDirectSolanaMint}
            disabled={isDirectMinting}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
          >
            {isDirectMinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create & Mint on SaveMeme
          </Button>
          <p className="text-xs text-gray-400">Requires a Solana wallet (Phantom/Solflare/Backpack) and enough SOL for fees. Vanity terms like `save,meme` now match anywhere in the Solana address and will keep searching until one appears, unless you switch to a normal mint.</p>
          {isDirectMinting && vanitySearchStatus?.prefixes?.length && (
            <div className="rounded-xl border border-emerald-400/20 bg-black/20 p-3 text-xs text-emerald-100 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Searching for vanity terms <span className="font-semibold text-white">{formatVanityPrefixes(vanitySearchStatus.prefixes)}</span> anywhere in the address</span>
              </div>
              <p>Attempts: {Number(vanitySearchStatus.attempts || 0).toLocaleString()}</p>
              {vanitySearchStatus.sampleAddress && (
                <p className="break-all text-gray-300">Latest checked: {renderHighlightedAddress(vanitySearchStatus.sampleAddress, vanitySearchStatus.matchedPrefix || vanitySearchStatus.prefixes?.find((term) => String(vanitySearchStatus.sampleAddress || '').toLowerCase().includes(String(term || '').toLowerCase())) || '')}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  vanitySkipRequestedRef.current = true;
                  setVanitySearchStatus((prev) => prev ? { ...prev, skipRequested: true } : prev);
                }}
                disabled={!!vanitySearchStatus.skipRequested}
                className="inline-flex items-center justify-center rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {vanitySearchStatus.skipRequested ? 'Switching to normal mint...' : 'Mint in 1 min without prefix'}
              </button>
            </div>
          )}

          {directResult && (
            <div className="rounded-xl border border-emerald-400/20 bg-black/20 p-4 space-y-3 text-sm text-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">SaveMeme token created on Solana</p>
                  <p className="text-xs text-gray-400">Standard SPL mint with SaveMeme attribution metadata and registry entry.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <SaveMemeBadge tone="cyan">Minted on SaveMeme</SaveMemeBadge>
                  <SaveMemeBadge tone="emerald">Meme Token</SaveMemeBadge>
                  {directResult.aiChecked && <SaveMemeBadge tone="amber">AI-checked</SaveMemeBadge>}
                  {directResult.vanityMatchedPrefix && (
                    <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100 shadow-[0_0_14px_rgba(252,211,77,0.16)]">
                      Vanity matched: {directResult.vanityMatchedPrefix}
                    </span>
                  )}
                </div>
              </div>

              <div className={directResult.vanityMatchedPrefix ? "rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-400/20 via-yellow-300/12 to-orange-400/18 p-4 space-y-3 shadow-[0_0_24px_rgba(251,191,36,0.18)]" : "rounded-xl border border-white/10 bg-white/5 p-3 space-y-1"}>
                {directResult.vanityMatchedPrefix ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">Vanity Found</p>
                        <p className="mt-1 text-base font-semibold text-white">
                          Matched term: <span className="text-amber-300">{directResult.vanityMatchedPrefix}</span>
                        </p>
                      </div>
                      <div className="rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                        SaveMeme Hit
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-300/20 bg-black/20 px-3 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100/80">
                        Matched Solana Address
                      </div>
                      <div className="mt-2 break-all font-mono text-sm leading-6 text-white">
                        {renderHighlightedAddress(directResult.mintAddress, directResult.vanityMatchedPrefix)}
                      </div>
                    </div>
                    <p className="text-sm text-amber-50">The minted Solana address contains <span className="font-semibold text-amber-200">{directResult.vanityMatchedPrefix}</span>.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-white">Normal Mint</p>
                    <p className="text-xs text-gray-300">No vanity term was found in the final Solana address.</p>
                  </>
                )}
              </div>

              <div className="grid gap-2 text-xs">
                <p>
                  <span className="text-gray-400">Token address:</span>{' '}
                  <span className="break-all">
                    {directResult.vanityMatchedPrefix
                      ? renderHighlightedAddress(directResult.mintAddress, directResult.vanityMatchedPrefix)
                      : directResult.mintAddress}
                  </span>
                </p>
                <p><span className="text-gray-400">Chain:</span> Solana</p>
                <p><span className="text-gray-400">Creator authority:</span> <span className="break-all">{directResult.creatorAuthority}</span></p>
                <p><span className="text-gray-400">Attribution program:</span> {directResult.attributionProgram}</p>
                {directResult.vanityPrefix && <p><span className="text-gray-400">Vanity terms:</span> {directResult.vanityPrefix}</p>}
                {directResult.vanityMatchedPrefix && <p><span className="text-gray-400">Matched term:</span> {directResult.vanityMatchedPrefix}</p>}
                <p><span className="text-gray-400">Transaction:</span> <span className="break-all">{directResult.txHash}</span></p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <button onClick={() => copyText(directResult.mintAddress)} className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">
                  <Copy className="w-3 h-3" />
                  Copy address
                </button>
                {directResult.explorerUrl && (
                  <a href={directResult.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">
                    <ExternalLink className="w-3 h-3" />
                    View token
                  </a>
                )}
                {directResult.txExplorerUrl && (
                  <a href={directResult.txExplorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">
                    <ExternalLink className="w-3 h-3" />
                    View tx
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {form.chain === 'bsc' && (
        <div className="mt-4 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-3">
          <p className="text-sm text-cyan-300">Direct SaveMeme Create (BNB Chain)</p>
          <Button
            type="button"
            onClick={handleDirectBep20Create}
            disabled={isDirectBep20Creating}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
          >
            {isDirectBep20Creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create & Mint on SaveMeme
          </Button>
          {(!account || !['bnb', 'walletconnect'].includes(walletType)) && (
            <p className="text-xs text-gray-400">Connect a BNB wallet to mint through the SaveMeme factory.</p>
          )}
          {!import.meta.env.VITE_BEP20_FACTORY_ADDRESS && (
            <p className="text-xs text-gray-400">Missing `VITE_BEP20_FACTORY_ADDRESS` in your env.</p>
          )}

          {directBep20Result && (
            <div className="rounded-xl border border-cyan-400/20 bg-black/20 p-4 space-y-3 text-sm text-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">SaveMeme token created on BNB Chain</p>
                  <p className="text-xs text-gray-400">Standard BEP20 contract deployed through the SaveMeme factory and registry.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <SaveMemeBadge tone="cyan">Minted on SaveMeme</SaveMemeBadge>
                  <SaveMemeBadge tone="emerald">Meme Token</SaveMemeBadge>
                  {directBep20Result.aiChecked && <SaveMemeBadge tone="amber">AI-checked</SaveMemeBadge>}
                  <SaveMemeBadge tone="cyan">Verified Factory</SaveMemeBadge>
                </div>
              </div>

              <div className="grid gap-2 text-xs">
                {directBep20Result.tokenAddress && <p><span className="text-gray-400">Token address:</span> <span className="break-all">{directBep20Result.tokenAddress}</span></p>}
                <p><span className="text-gray-400">Chain:</span> BNB Chain</p>
                <p><span className="text-gray-400">Factory address:</span> <span className="break-all">{directBep20Result.factoryAddress}</span></p>
                <p><span className="text-gray-400">Verified source:</span> {directBep20Result.verifiedSource}</p>
                <p><span className="text-gray-400">Transaction:</span> <span className="break-all">{directBep20Result.txHash}</span></p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                {directBep20Result.tokenAddress && (
                  <button onClick={() => copyText(directBep20Result.tokenAddress)} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
                    <Copy className="w-3 h-3" />
                    Copy address
                  </button>
                )}
                {directBep20Result.explorerUrl && (
                  <a href={directBep20Result.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
                    <ExternalLink className="w-3 h-3" />
                    View token
                  </a>
                )}
                {directBep20Result.txExplorerUrl && (
                  <a href={directBep20Result.txExplorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
                    <ExternalLink className="w-3 h-3" />
                    View tx
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!!recentMints.length && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Recent SaveMeme launches</h3>
              <p className="text-sm text-gray-400">Registry-backed tokens indexed by chain, creator, and attribution metadata.</p>
            </div>
            {isAiScanning && (
              <span className="inline-flex items-center gap-2 text-xs text-amber-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI scan running
              </span>
            )}
          </div>

          <div className="grid gap-3">
            {recentMints.map((token) => (
              <div key={`${token.chain}-${token.token_address}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{token.name} ({token.symbol})</p>
                      <SaveMemeBadge tone="cyan">Minted on SaveMeme</SaveMemeBadge>
                      <SaveMemeBadge tone="emerald">{token.category || 'meme'}</SaveMemeBadge>
                      {token.ai_checked && <SaveMemeBadge tone="amber">AI-checked</SaveMemeBadge>}
                    </div>
                    <p className="text-xs text-gray-400">{token.chain === 'solana' ? 'Solana' : 'BNB Chain'}</p>
                    <p className="text-xs text-gray-300 break-all">{token.token_address}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <button onClick={() => copyText(token.token_address)} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    <a
                      href={token.explorer_url || explorerTokenUrl(token.chain, token.token_address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Explorer
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}











