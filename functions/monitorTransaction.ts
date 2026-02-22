export async function monitorTransaction(req) {
  try {
    const { chain, txHash } = await req.json();

    if (!chain || !txHash) {
      return Response.json({ error: 'Missing chain or txHash' }, { status: 400 });
    }

    if (chain === 'solana') {
      return await checkSolanaTransaction(txHash);
    }

    if (chain === 'bsc' || chain === 'ethereum') {
      return await checkEVMTransaction(txHash, chain);
    }

    return Response.json({ error: 'Unsupported chain' }, { status: 400 });
  } catch (error) {
    console.error('Transaction monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function checkSolanaTransaction(txHash) {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignatureStatuses',
        params: [[txHash], { searchTransactionHistory: true }]
      })
    });

    if (!response.ok) throw new Error('Failed to check Solana transaction');

    const data = await response.json();
    const status = data?.result?.value?.[0];

    if (!status) {
      return Response.json({
        success: true,
        status: 'pending',
        chain: 'solana',
        txHash
      });
    }

    if (status.err) {
      return Response.json({
        success: true,
        status: 'failed',
        chain: 'solana',
        txHash,
        error: status.err
      });
    }

    const confirmationStatus = String(status.confirmationStatus || '').toLowerCase();
    const isConfirmed = confirmationStatus === 'confirmed' || confirmationStatus === 'finalized';

    return Response.json({
      success: true,
      status: isConfirmed ? 'confirmed' : 'pending',
      chain: 'solana',
      txHash,
      confirmations: typeof status.confirmations === 'number' ? status.confirmations : 0
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}

async function checkEVMTransaction(txHash, chain) {
  try {
    const rpcUrls = {
      'bsc': 'https://bsc-dataseed.binance.org/',
      'ethereum': 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
    };

    const rpcUrl = rpcUrls[chain];
    if (!rpcUrl) throw new Error('Unsupported chain');

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
    });

    if (!response.ok) throw new Error('Failed to check transaction');

    const data = await response.json();
    const receipt = data.result;

    if (!receipt) {
      return Response.json({
        success: true,
        status: 'pending',
        chain,
        txHash
      });
    }

    return Response.json({
      success: true,
      status: receipt.status === '0x1' ? 'confirmed' : 'failed',
      chain,
      txHash,
      blockNumber: parseInt(receipt.blockNumber, 16),
      gasUsed: parseInt(receipt.gasUsed, 16)
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}