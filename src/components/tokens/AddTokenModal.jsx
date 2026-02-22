import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AddTokenModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    contract_address: '',
    logo_url: '',
    price_usd: '',
  });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const addTokenMutation = useMutation({
    mutationFn: async (tokenData) => {
      const data = {
        ...tokenData,
        price_usd: parseFloat(tokenData.price_usd) || 0,
        is_custom: true,
        is_listed: true,
        change_24h: 0,
        market_cap: 0,
        volume_24h: 0,
      };
      return appClient.entities.Token.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tokens']);
      setFormData({
        symbol: '',
        name: '',
        contract_address: '',
        logo_url: '',
        price_usd: '',
      });
      setError('');
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Failed to add token');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.symbol || !formData.name || !formData.contract_address) {
      setError('Please fill in all required fields');
      return;
    }

    addTokenMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">Add Custom Token</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contract_address" className="text-gray-300">
              Contract Address <span className="text-red-400">*</span>
            </Label>
            <Input
              id="contract_address"
              placeholder="0x..."
              value={formData.contract_address}
              onChange={(e) => handleChange('contract_address', e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol" className="text-gray-300">
              Token Symbol <span className="text-red-400">*</span>
            </Label>
            <Input
              id="symbol"
              placeholder="ETH"
              value={formData.symbol}
              onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
              className="bg-white/5 border-white/10 text-white rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              Token Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ethereum"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url" className="text-gray-300">
              Logo URL (optional)
            </Label>
            <Input
              id="logo_url"
              placeholder="https://..."
              value={formData.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_usd" className="text-gray-300">
              Initial Price (USD)
            </Label>
            <Input
              id="price_usd"
              type="number"
              step="0.000001"
              placeholder="0.00"
              value={formData.price_usd}
              onChange={(e) => handleChange('price_usd', e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 hover:bg-white/5 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addTokenMutation.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl"
            >
              {addTokenMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Token'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
