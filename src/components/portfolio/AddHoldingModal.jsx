import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { appClient } from '@/api/appClient';

export default function AddHoldingModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    balance: '',
    purchase_price: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const holding = await appClient.entities.Holding.create({
        ...formData,
        balance: parseFloat(formData.balance),
        purchase_price: parseFloat(formData.purchase_price)
      });
      
      onAdd?.(holding);
      setFormData({ symbol: '', name: '', balance: '', purchase_price: '' });
      onClose();
    } catch (error) {
      console.error('Failed to add holding:', error);
    }
    
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Token Holding</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="symbol">Token Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., BTC, ETH"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              className="bg-white/5 border-white/10 mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Token Name</Label>
            <Input
              id="name"
              placeholder="e.g., Bitcoin, Ethereum"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-white/5 border-white/10 mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="balance">Balance</Label>
            <Input
              id="balance"
              type="number"
              step="any"
              placeholder="0.00"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              className="bg-white/5 border-white/10 mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="purchase_price">Purchase Price (USD)</Label>
            <Input
              id="purchase_price"
              type="number"
              step="any"
              placeholder="0.00"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              className="bg-white/5 border-white/10 mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
              disabled={isSaving}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSaving ? 'Adding...' : 'Add Holding'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
