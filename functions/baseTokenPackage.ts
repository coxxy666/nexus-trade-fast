const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 10;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function toBigIntAmount(initialSupply: number, decimals: number): bigint {
  const base = BigInt(Math.floor(initialSupply));
  const multiplier = BigInt(10) ** BigInt(decimals);
  return base * multiplier;
}

function buildBaseErc20Template(
  name: string,
  symbol: string,
  decimals: number,
  ownerAddress: string,
  initialSupply: number,
  metadataUri: string,
): string {
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

export function buildBaseTokenPackageResponse(input: {
  name: string;
  symbol: string;
  decimals: number;
  ownerAddress: string;
  initialSupply: number;
  logoUrl: string;
  description: string;
  metadataUri: string;
  category: string;
  createdAt: string;
}) {
  const { name, symbol, decimals, ownerAddress, initialSupply, logoUrl, description, metadataUri, category, createdAt } = input;

  if (!name || name.length > MAX_NAME_LENGTH) {
    return Response.json({ error: `Token name is required and must be <= ${MAX_NAME_LENGTH} chars.` }, { status: 400 });
  }
  if (!symbol || symbol.length > MAX_SYMBOL_LENGTH) {
    return Response.json({ error: `Token symbol is required and must be <= ${MAX_SYMBOL_LENGTH} chars.` }, { status: 400 });
  }
  if (!EVM_ADDRESS_RE.test(ownerAddress)) {
    return Response.json({ error: "Base ownerAddress must be a valid EVM address (0x...)." }, { status: 400 });
  }

  const saveMemeMetadata = {
    created_via: "SaveMeme",
    launch_source: "SaveMeme",
    category,
    creator_wallet: ownerAddress,
    timestamp: createdAt,
    chain: "base",
    description,
    image: logoUrl,
    factory_address: "BaseErc20Factory.sol",
    verified_source: "SaveMeme Base factory / verified source",
  };

  return Response.json({
    success: true,
    chain: "base",
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
      factoryContract: 'BaseErc20Factory.sol',
      verifiedSourceAttribution: 'Create through the verified SaveMeme BaseErc20Factory so explorers and users can tie the launch to SaveMeme.',
      metadata: saveMemeMetadata,
    },
    nextSteps: [
      "Deploy the SaveMeme Base factory and set VITE_BASE_ERC20_FACTORY_ADDRESS.",
      "Create the token through the verified SaveMeme Base factory so the TokenCreated event emits platform = SaveMeme.",
      "Verify the factory and token source on Basescan and keep metadataURI pointing at the SaveMeme metadata record.",
      "Register the created token in the SaveMeme backend registry via /api/tokens/register-savememe-mint with chain = base.",
    ],
    contractSource: buildBaseErc20Template(name, symbol, decimals, ownerAddress, initialSupply, metadataUri || "set-after-deploy"),
  });
}
