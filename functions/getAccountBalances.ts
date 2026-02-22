import { Connection, PublicKey, LAMPORTS_PER_SOL } from 'npm:@solana/web3.js';

export async function getAccountBalances(req) {
  try {
    const { address, chain } = await req.json();

    if (!address || !chain) {
      return Response.json({ error: 'Address and chain are required' }, { status: 400 });
    }

    let balances = {};

    if (chain === 'solana') {
      try {
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const publicKey = new PublicKey(address);
        const balanceInLamports = await connection.getBalance(publicKey);
        const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;

        // Fetch all SPL token balances keyed by mint address so frontend can resolve
        // balances for any selected token (e.g. MELANIA) without hardcoded symbols.
        const tokenByAddress: Record<string, number> = {};
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );

        for (const accountInfo of tokenAccounts.value) {
          const parsed: any = accountInfo?.account?.data?.parsed;
          const info = parsed?.info;
          const mint = String(info?.mint || '');
          const amountUi = Number(info?.tokenAmount?.uiAmount || 0);
          if (!mint) continue;
          if (!Number.isFinite(amountUi)) continue;
          tokenByAddress[mint] = (tokenByAddress[mint] || 0) + amountUi;
        }

        balances = { SOL: balanceInSol, tokenByAddress };
      } catch (error) {
        console.error('Error fetching Solana balance:', error);
        balances = { SOL: 0, tokenByAddress: {} };
      }
    } else if (chain === 'bsc') {
      try {
        const response = await fetch('https://bsc-dataseed.binance.org/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1,
          }),
        });
        const data = await response.json();
        const balanceInWei = BigInt(data.result || '0');
        const balanceInBnb = Number(balanceInWei) / 1e18;
        balances = { BNB: balanceInBnb };
      } catch (error) {
        console.error('Error fetching BNB balance:', error);
        balances = { BNB: 0 };
      }
    } else if (chain === 'ethereum') {
      try {
        const ethRpcUrls = [
          'https://ethereum-rpc.publicnode.com',
          'https://cloudflare-eth.com',
          'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        ];

        let balanceInWei = 0n;
        let lastError: any = null;

        for (const rpcUrl of ethRpcUrls) {
          try {
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1,
              }),
            });
            const data = await response.json();
            if (typeof data?.result === 'string') {
              balanceInWei = BigInt(data.result);
              lastError = null;
              break;
            }
          } catch (error) {
            lastError = error;
          }
        }

        if (lastError) {
          throw lastError;
        }

        const balanceInEth = Number(balanceInWei) / 1e18;
        balances = { ETH: Number.isFinite(balanceInEth) ? balanceInEth : 0 };
      } catch (error) {
        console.error('Error fetching ETH balance:', error);
        balances = { ETH: 0 };
      }
    } else if (chain === 'polygon') {
      try {
        const response = await fetch('https://polygon-rpc.com/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1,
          }),
        });
        const data = await response.json();
        const balanceInWei = BigInt(data.result || '0');
        const balanceInMatic = Number(balanceInWei) / 1e18;
        balances = { MATIC: balanceInMatic };
      } catch (error) {
        console.error('Error fetching MATIC balance:', error);
        balances = { MATIC: 0 };
      }
    }

    return Response.json({ balances });
  } catch (error) {
    console.error('Error in getAccountBalances:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

