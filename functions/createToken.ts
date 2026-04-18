const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 10;

function sanitizeText(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function toBigIntAmount(initialSupply: number, decimals: number): bigint {
  const base = BigInt(Math.floor(initialSupply));
  const multiplier = BigInt(10) ** BigInt(decimals);
  return base * multiplier;
}

function buildBep20Template(name: string, symbol: string, decimals: number, ownerAddress: string, initialSupply: number, metadataUri: string): string {
  const mintAmount = toBigIntAmount(initialSupply, decimals).toString();
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ${symbol}Token is ERC20 {
    string public metadataURI;

    constructor() ERC20("${name}", "${symbol}") {
        metadataURI = "${metadataUri}";
        _mint(${ownerAddress}, ${mintAmount});
    }
}`;
}

export async function createToken(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const chainRaw = sanitizeText(body?.chain, "").toLowerCase();
    const chain = chainRaw === "solana" ? "solana" : ["bep20", "bsc", "bnb"].includes(chainRaw) ? "bsc" : "";
    const name = sanitizeText(body?.name);
    const symbol = sanitizeText(body?.symbol).toUpperCase();
    const ownerAddress = sanitizeText(body?.ownerAddress || body?.creator_wallet);
    const decimals = clampNumber(body?.decimals, 0, 18, chain === "solana" ? 9 : 18);
    const initialSupply = clampNumber(body?.initialSupply, 1, 1_000_000_000_000, 1_000_000);
    const description = sanitizeText(body?.description);
    const logoUrl = sanitizeText(body?.logoUrl);
    const metadataUri = sanitizeText(body?.metadataUri);
    const category = sanitizeText(body?.category, "meme") || "meme";
    const revokeMintAuthority = Boolean(body?.revokeMintAuthority);
    const revokeFreezeAuthority = Boolean(body?.revokeFreezeAuthority);
    const vanityPrefix = chain === "solana" && Boolean(body?.enableVanityPrefix ?? body?.enable_vanity_prefix)
      ? sanitizeText(body?.vanityPrefix || body?.vanity_prefix || "save").toLowerCase()
      : "";
    const createdAt = new Date().toISOString();

    if (!chain) {
      return Response.json({ error: "Invalid chain. Use 'solana' or 'bsc'." }, { status: 400 });
    }
    if (!name || name.length > MAX_NAME_LENGTH) {
      return Response.json({ error: `Token name is required and must be <= ${MAX_NAME_LENGTH} chars.` }, { status: 400 });
    }
    if (!symbol || symbol.length > MAX_SYMBOL_LENGTH) {
      return Response.json({ error: `Token symbol is required and must be <= ${MAX_SYMBOL_LENGTH} chars.` }, { status: 400 });
    }

    const saveMemeMetadata = {
      created_via: "SaveMeme",
      launch_source: "SaveMeme",
      category,
      creator_wallet: ownerAddress,
      timestamp: createdAt,
      chain,
      description,
      image: logoUrl,
      vanity_prefix: vanityPrefix || undefined,
      creator_authority: chain === "solana" ? ownerAddress : undefined,
      attribution_program: chain === "solana" ? "SaveMeme SPL launcher" : undefined,
      factory_address: chain === "bsc" ? "Bep20Factory.sol" : undefined,
      verified_source: chain === "bsc" ? "SaveMeme factory / verified source" : "SaveMeme metadata + registry",
    };

    if (chain === "bsc") {
      if (!EVM_ADDRESS_RE.test(ownerAddress)) {
        return Response.json({ error: "BSC ownerAddress must be a valid EVM address (0x...)." }, { status: 400 });
      }

      const contractSource = buildBep20Template(name, symbol, decimals, ownerAddress, initialSupply, metadataUri || "set-after-deploy");
      return Response.json({
        success: true,
        chain: "bsc",
        mode: "savememe_factory_package",
        created_via: "SaveMeme",
        token: {
          name,
          symbol,
          decimals,
          initialSupply,
          ownerAddress,
          logoUrl,
          description,
          metadataUri,
          category,
        },
        saveMeme: {
          platform: "SaveMeme",
          event: 'TokenCreated(address token, address creator, string platform)',
          factoryContract: 'Bep20Factory.sol',
          verifiedSourceAttribution: 'Create through the verified SaveMeme Bep20Factory so explorers and users can tie the launch to SaveMeme.',
          metadata: saveMemeMetadata,
        },
        nextSteps: [
          "Deploy the SaveMeme BSC factory and set VITE_BEP20_FACTORY_ADDRESS.",
          "Create the token through the verified SaveMeme factory so the TokenCreated event emits platform = SaveMeme.",
          "Verify the factory and token source on BscScan and keep metadataURI pointing at the SaveMeme metadata record.",
          "Register the created token in the SaveMeme backend registry via /api/tokens/register-savememe-mint.",
        ],
        contractSource,
      });
    }

    if (!SOLANA_ADDRESS_RE.test(ownerAddress)) {
      return Response.json({ error: "Solana ownerAddress must be a valid base58 address." }, { status: 400 });
    }

    const mintAmount = toBigIntAmount(initialSupply, decimals).toString();
    const commandHint = [
      "# Requires Solana CLI + SPL Token CLI",
      "solana config set --url https://api.mainnet-beta.solana.com",
      "spl-token create-token",
      `spl-token create-account <MINT_ADDRESS> --owner ${ownerAddress}`,
      `spl-token mint <MINT_ADDRESS> ${mintAmount} <TOKEN_ACCOUNT_ADDRESS>`,
    ].join("\n");

    return Response.json({
      success: true,
      chain: "solana",
      mode: "savememe_spl_package",
      created_via: "SaveMeme",
      token: {
        name,
        symbol,
        decimals,
        initialSupply,
        ownerAddress,
        logoUrl,
        description,
        metadataUri,
        category,
        revokeMintAuthority,
        revokeFreezeAuthority,
      },
      saveMeme: {
        platform: "SaveMeme",
        attributionStrategy: "Controlled creator authority plus SaveMeme metadata and backend registry.",
        creatorAuthority: ownerAddress,
        attributionProgram: "SaveMeme SPL launcher",
        vanityPrefix: vanityPrefix || null,
        metadata: saveMemeMetadata,
      },
      nextSteps: [
        vanityPrefix ? `Optionally grind a vanity mint prefix '${vanityPrefix}' before minting if you want a SaveMeme-style Solana address.` : "Create the mint as a normal SPL token and point metadata to the SaveMeme metadata URI.",
        "Use the SaveMeme-controlled creator authority or update-authority policy in production if you deploy the companion Solana program.",
        "Register the minted token in the SaveMeme backend registry via /api/tokens/register-savememe-mint.",
      ],
      mintAmountBaseUnits: mintAmount,
      commandHint,
    });
  } catch (error) {
    console.error("Create token error:", error);
    return Response.json({ error: (error as Error)?.message || "Failed to create token package" }, { status: 500 });
  }
}
