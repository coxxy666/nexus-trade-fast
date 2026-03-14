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

function buildBep20Template(name: string, symbol: string, decimals: number, ownerAddress: string, initialSupply: number): string {
  const mintAmount = toBigIntAmount(initialSupply, decimals).toString();
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ${symbol}Token is ERC20, Ownable {
    uint8 private immutable _customDecimals;

    constructor() ERC20("${name}", "${symbol}") Ownable(msg.sender) {
        _customDecimals = ${decimals};
        _mint(${ownerAddress}, ${mintAmount});
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }
}`;
}

export async function createToken(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const chainRaw = sanitizeText(body?.chain, "").toLowerCase();
    const chain = chainRaw === "solana" ? "solana" : chainRaw === "bep20" ? "bep20" : "";
    const name = sanitizeText(body?.name);
    const symbol = sanitizeText(body?.symbol).toUpperCase();
    const ownerAddress = sanitizeText(body?.ownerAddress);
    const decimals = clampNumber(body?.decimals, 0, 18, chain === "solana" ? 9 : 18);
    const initialSupply = clampNumber(body?.initialSupply, 1, 1_000_000_000_000, 1_000_000);
    const description = sanitizeText(body?.description);
    const logoUrl = sanitizeText(body?.logoUrl);
    const revokeMintAuthority = Boolean(body?.revokeMintAuthority);
    const revokeFreezeAuthority = Boolean(body?.revokeFreezeAuthority);

    if (!chain) {
      return Response.json({ error: "Invalid chain. Use 'solana' or 'bep20'." }, { status: 400 });
    }
    if (!name || name.length > MAX_NAME_LENGTH) {
      return Response.json({ error: `Token name is required and must be <= ${MAX_NAME_LENGTH} chars.` }, { status: 400 });
    }
    if (!symbol || symbol.length > MAX_SYMBOL_LENGTH) {
      return Response.json({ error: `Token symbol is required and must be <= ${MAX_SYMBOL_LENGTH} chars.` }, { status: 400 });
    }

    if (chain === "bep20") {
      if (!EVM_ADDRESS_RE.test(ownerAddress)) {
        return Response.json({ error: "BEP20 ownerAddress must be a valid EVM address (0x...)." }, { status: 400 });
      }

      const contractSource = buildBep20Template(name, symbol, decimals, ownerAddress, initialSupply);
      return Response.json({
        success: true,
        chain: "bep20",
        mode: "manual_deploy_package",
        token: {
          name,
          symbol,
          decimals,
          initialSupply,
          ownerAddress,
          logoUrl,
          description,
          revokeMintAuthority,
          revokeFreezeAuthority,
        },
        nextSteps: [
          "Open Remix (or Hardhat) and compile the generated contract using Solidity 0.8.20.",
          "Deploy on BNB Smart Chain Mainnet (chainId 56) from the same owner wallet.",
          "Verify contract on BscScan and add liquidity before listing.",
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
      mode: "manual_deploy_package",
      token: {
        name,
        symbol,
        decimals,
        initialSupply,
        ownerAddress,
        logoUrl,
        description,
        revokeMintAuthority,
        revokeFreezeAuthority,
      },
      nextSteps: [
        "Create mint with SPL Token CLI or your preferred Solana token launcher.",
        "Create recipient token account owned by your wallet.",
        "Mint the initial supply and store the returned mint address.",
      ],
      mintAmountBaseUnits: mintAmount,
      commandHint,
    });
  } catch (error) {
    console.error("Create token error:", error);
    return Response.json({ error: error?.message || "Failed to create token package" }, { status: 500 });
  }
}
