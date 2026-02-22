import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ArrowDownUp, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@/components/WalletContext';
import { toast } from 'sonner';
import { useMemeTokens, DEFAULT_TOKENS } from '@/components/services/useMemeTokens';
import MemeTokenSelector from '@/components/swap/MemeTokenSelector';
import { createLocalPool } from '@/lib/localPools';

const FALLBACK_POOL_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    address: 'So11111111111111111111111111111111111111112',
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    address: '0xbb4CdB9CBd36B01bD1cbaB777c5e04c0334f63C3',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
];

const FEE_TIERS = [
  { value: 0.01, label: '0.01% - Best for stablecoins', description: 'Lowest risk, minimal price movement' },
  { value: 0.05, label: '0.05% - Best for stable pairs', description: 'Low risk, correlated assets' },
  { value: 0.3, label: '0.30% - Best for most pairs', description: 'Standard fee tier' },
  { value: 1.0, label: '1.00% - Best for exotic pairs', description: 'Higher risk, volatile assets' },
];

export default function CreatePoolModal({ isOpen, onClose, onSuccess }) {
  const { account, accountBalances } = useWallet();
  
  const [step, setStep] = useState(1);
  const [selectingFor, setSelectingFor] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({
    token_a: '',
    token_b: '',
    amount_a: '',
    amount_b: '',
    fee_tier: 0.3
  });

  // Use the same token source as Swap so contract addresses stay consistent.
  const { data: memeTokens = [] } = useMemeTokens();

  // Convert to pool token format
  const AVAILABLE_TOKENS = React.useMemo(() => {
    const map = new Map();
    const resolveFallbackAddress = (symbol) =>
      String(
        DEFAULT_TOKENS.find((t) => String(t?.symbol || '').toUpperCase() === symbol)?.address || ''
      );

    for (const token of memeTokens) {
      const symbol = String(token?.symbol || '').toUpperCase();
      if (!symbol) continue;
      if (!map.has(symbol)) {
        map.set(symbol, {
          symbol,
          name: token?.name || symbol,
          logo: token?.image || token?.logo_url || 'https://via.placeholder.com/40',
          address: token?.address || resolveFallbackAddress(symbol),
          network: token?.network || '',
        });
      }
    }
    for (const token of FALLBACK_POOL_TOKENS) {
      if (!map.has(token.symbol)) {
        map.set(token.symbol, token);
      }
    }
    return Array.from(map.values());
  }, [memeTokens]);

  const inferChainFromAddress = (address = '') => {
    if (!address) return 'multi-chain';
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return 'evm';
    if (!address.startsWith('0x') && address.length >= 32 && address.length <= 44) return 'solana';
    return 'multi-chain';
  };

  const handleSubmit = async () => {
    setCreateError('');
    // Validate that user has sufficient balance
    const amountA = parseFloat(formData.amount_a);
    const amountB = parseFloat(formData.amount_b);

    if (isNaN(amountA) || isNaN(amountB) || amountA <= 0 || amountB <= 0) {
      toast.error('Please enter valid amounts');
      return;
    }

    if (!selectedTokenA || !selectedTokenB) {
      toast.error('Please select valid token pair');
      return;
    }

    if (!account) {
      const message = 'Connect wallet first to create a pool.';
      setCreateError(message);
      toast.error(message);
      return;
    }

    const balanceA = Number(accountBalances?.[formData.token_a] ?? 0);
    const balanceB = Number(accountBalances?.[formData.token_b] ?? 0);
    if (!Number.isFinite(balanceA) || !Number.isFinite(balanceB)) {
      const message = 'Unable to verify token balances. Please refresh wallet balances and retry.';
      setCreateError(message);
      toast.error(message);
      return;
    }

    if (balanceA < amountA || balanceB < amountB) {
      const message = `Insufficient balance. Need ${amountA} ${formData.token_a} and ${amountB} ${formData.token_b}, but wallet has ${balanceA} ${formData.token_a} and ${balanceB} ${formData.token_b}.`;
      setCreateError(message);
      toast.error('Insufficient balance for pool creation');
      return;
    }

    setIsCreating(true);
    try {
      // Best-effort lookup for token prices from fetched token list.
      const tokenAPrice = Number(
        memeTokens.find((t) => String(t.symbol || '').toUpperCase() === formData.token_a)?.price_usd || 0
      );
      const tokenBPrice = Number(
        memeTokens.find((t) => String(t.symbol || '').toUpperCase() === formData.token_b)?.price_usd || 0
      );

      const tvl =
        (Number.isFinite(tokenAPrice) ? tokenAPrice : 0) * amountA +
        (Number.isFinite(tokenBPrice) ? tokenBPrice : 0) * amountB;

      const fullPayload = {
        token_a: formData.token_a,
        token_b: formData.token_b,
        token_a_logo: selectedTokenA.logo,
        token_b_logo: selectedTokenB.logo,
        token_a_address: selectedTokenA.address || '',
        token_b_address: selectedTokenB.address || '',
        token_a_network: selectedTokenA.network || inferChainFromAddress(selectedTokenA.address),
        token_b_network: selectedTokenB.network || inferChainFromAddress(selectedTokenB.address),
        token_source: 'swap_token_api',
        token_a_amount: amountA,
        token_b_amount: amountB,
        fee_tier: Number(formData.fee_tier),
        tvl,
        volume_24h: 0,
        apr: 0,
        owner_wallet: account || 'local-pool-owner',
        status: 'active'
      };

      const created = createLocalPool(fullPayload);
      if (!created) {
        throw new Error('Failed to save pool locally');
      }

      toast.success('Pool created successfully');
      setStep(3);
      onSuccess?.();
    } catch (error) {
      console.error('Create pool failed:', error);
      const message = error?.message || 'Failed to create pool';
      setCreateError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCreateError('');
    setFormData({
      token_a: '',
      token_b: '',
      amount_a: '',
      amount_b: '',
      fee_tier: 0.3
    });
    onClose();
  };

  const canProceedToStep2 = formData.token_a && formData.token_b && formData.token_a !== formData.token_b;
  const canCreate = formData.amount_a && formData.amount_b && parseFloat(formData.amount_a) > 0 && parseFloat(formData.amount_b) > 0;

  const selectedTokenA = AVAILABLE_TOKENS.find(t => t.symbol === formData.token_a);
  const selectedTokenB = AVAILABLE_TOKENS.find(t => t.symbol === formData.token_b);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Liquidity Pool</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 mt-4"
          >
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Token Pair</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">First Token</Label>
                  <button
                    onClick={() => setSelectingFor('token_a')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
                  >
                    {selectedTokenA ? (
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <img src={selectedTokenA.logo} alt={selectedTokenA.symbol} className="w-6 h-6 rounded-full" />
                          <span className="font-semibold text-sm">{selectedTokenA.symbol}</span>
                          <span className="text-gray-500 text-sm">{selectedTokenA.name}</span>
                        </div>
                        {selectedTokenA.address ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="font-mono">
                              {selectedTokenA.address.slice(0, 6)}...{selectedTokenA.address.slice(-4)}
                            </span>
                            <Copy
                              className="w-3 h-3 cursor-pointer hover:text-cyan-400 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(selectedTokenA.address);
                                toast.success('Address copied');
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Select token</span>
                    )}
                  </button>
                </div>

                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">Second Token</Label>
                  <button
                    onClick={() => setSelectingFor('token_b')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
                  >
                    {selectedTokenB ? (
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <img src={selectedTokenB.logo} alt={selectedTokenB.symbol} className="w-6 h-6 rounded-full" />
                          <span className="font-semibold text-sm">{selectedTokenB.symbol}</span>
                          <span className="text-gray-500 text-sm">{selectedTokenB.name}</span>
                        </div>
                        {selectedTokenB.address ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="font-mono">
                              {selectedTokenB.address.slice(0, 6)}...{selectedTokenB.address.slice(-4)}
                            </span>
                            <Copy
                              className="w-3 h-3 cursor-pointer hover:text-cyan-400 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(selectedTokenB.address);
                                toast.success('Address copied');
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Select token</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Select Fee Tier</Label>
              <div className="space-y-2">
                {FEE_TIERS.map(tier => (
                  <button
                    key={tier.value}
                    onClick={() => setFormData({ ...formData, fee_tier: tier.value })}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      formData.fee_tier === tier.value
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{tier.label}</span>
                      {formData.fee_tier === tier.value && (
                        <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{tier.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-white/20">
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                Next: Set Amounts
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 mt-4"
          >
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-gray-400 mb-2">You're creating a pool for</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <img src={selectedTokenA?.logo} alt={formData.token_a} className="w-8 h-8 rounded-full" />
                  <span className="font-bold">{formData.token_a}</span>
                </div>
                <Plus className="w-4 h-4 text-gray-500" />
                <div className="flex items-center gap-2">
                  <img src={selectedTokenB?.logo} alt={formData.token_b} className="w-8 h-8 rounded-full" />
                  <span className="font-bold">{formData.token_b}</span>
                </div>
              </div>
              <p className="text-xs text-cyan-400 mt-2">Fee Tier: {formData.fee_tier}%</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Deposit {formData.token_a}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.amount_a}
                    onChange={(e) => setFormData({ ...formData, amount_a: e.target.value })}
                    className="bg-white/5 border-white/10 h-14 pr-20 text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={selectedTokenA?.logo} alt={formData.token_a} className="w-6 h-6 rounded-full" />
                    <span className="font-semibold">{formData.token_a}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Balance: {Number(accountBalances?.[formData.token_a] ?? 0)} {formData.token_a}
                </p>
              </div>

              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <ArrowDownUp className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Deposit {formData.token_b}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.amount_b}
                    onChange={(e) => setFormData({ ...formData, amount_b: e.target.value })}
                    className="bg-white/5 border-white/10 h-14 pr-20 text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={selectedTokenB?.logo} alt={formData.token_b} className="w-6 h-6 rounded-full" />
                    <span className="font-semibold">{formData.token_b}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Balance: {Number(accountBalances?.[formData.token_b] ?? 0)} {formData.token_b}
                </p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
             <div className="flex items-start gap-2">
               <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
               <div className="text-sm">
                 <p className="text-blue-400 font-semibold mb-1">Balance Check Note</p>
                 <p className="text-gray-300">Pool creation now requires wallet connection and sufficient token balances for both assets.</p>
               </div>
             </div>
            </div>

            {createError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-red-400 font-semibold mb-1">Create Pool Error</p>
                    <p className="text-red-200 break-words">{createError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-white/20">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canCreate || isCreating}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                {isCreating ? 'Creating Pool...' : 'Create Pool'}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Pool Created!</h3>
            <p className="text-gray-400 mb-6">
              Your {formData.token_a}/{formData.token_b} liquidity pool has been successfully created
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Deposited {formData.token_a}</span>
                  <span className="font-semibold">{formData.amount_a}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Deposited {formData.token_b}</span>
                  <span className="font-semibold">{formData.amount_b}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee Tier</span>
                  <span className="font-semibold">{formData.fee_tier}%</span>
                </div>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600">
              Done
            </Button>
          </motion.div>
        )}
      </DialogContent>

      <MemeTokenSelector
        isOpen={selectingFor !== null}
        onClose={() => setSelectingFor(null)}
        selectedNetwork="bsc"
        selectedToken={selectingFor === 'token_a' ? selectedTokenA : selectedTokenB}
        onSelect={(token) => {
          const symbol = String(token?.symbol || '').toUpperCase();
          if (!symbol) return;
          if (selectingFor === 'token_a') {
            if (symbol === formData.token_b) {
              toast.error('Please select a different token');
              return;
            }
            setFormData((prev) => ({ ...prev, token_a: symbol }));
          } else {
            if (symbol === formData.token_a) {
              toast.error('Please select a different token');
              return;
            }
            setFormData((prev) => ({ ...prev, token_b: symbol }));
          }
          setSelectingFor(null);
        }}
      />
    </Dialog>
  );
}

