import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function BotConfigModal({ isOpen, onClose, botToEdit }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    strategy: 'buy_the_dip',
    token_symbol: '',
    buy_threshold: 5,
    sell_threshold: 10,
    max_trade_amount: 100,
    daily_trade_limit: 10,
    pump_detection_threshold: 50,
    dump_detection_threshold: 30,
    rebalance_target_percentage: 50,
    rebalance_interval_hours: 24,
    is_ai_enabled: true,
  });

  useEffect(() => {
    if (botToEdit) {
      setFormData(botToEdit);
    } else {
      setFormData({
        name: '',
        strategy: 'buy_the_dip',
        token_symbol: '',
        buy_threshold: 5,
        sell_threshold: 10,
        max_trade_amount: 100,
        daily_trade_limit: 10,
        pump_detection_threshold: 50,
        dump_detection_threshold: 30,
        rebalance_target_percentage: 50,
        rebalance_interval_hours: 24,
        is_ai_enabled: true,
      });
    }
  }, [botToEdit, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.TradingBot.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => appClient.entities.TradingBot.update(botToEdit.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (botToEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{botToEdit ? 'Edit Bot' : 'Create Trading Bot'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-cyan-400">Basic Information</h3>

            <div>
              <Label className="text-sm text-gray-400 mb-2 block">Bot Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., BONK Dip Buyer"
                className="bg-white/5 border-white/10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-400 mb-2 block">Strategy</Label>
                <Select value={formData.strategy} onValueChange={(val) => setFormData({ ...formData, strategy: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#12121a] border-white/10 text-white">
                    <SelectItem value="buy_the_dip">Buy the Dip</SelectItem>
                    <SelectItem value="pump_dump_detection">Pump & Dump Detection</SelectItem>
                    <SelectItem value="portfolio_rebalancing">Portfolio Rebalancing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-gray-400 mb-2 block">Token Symbol</Label>
                <Input
                  value={formData.token_symbol}
                  onChange={(e) => setFormData({ ...formData, token_symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., BONK"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Strategy Parameters */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-cyan-400">Strategy Parameters</h3>

            {formData.strategy === 'buy_the_dip' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Buy Threshold (%)</Label>
                    <Input
                      type="number"
                      value={formData.buy_threshold}
                      onChange={(e) => setFormData({ ...formData, buy_threshold: parseFloat(e.target.value) })}
                      className="bg-white/5 border-white/10"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Sell Threshold (%)</Label>
                    <Input
                      type="number"
                      value={formData.sell_threshold}
                      onChange={(e) => setFormData({ ...formData, sell_threshold: parseFloat(e.target.value) })}
                      className="bg-white/5 border-white/10"
                      step="0.1"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.strategy === 'pump_dump_detection' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Pump Threshold (%)</Label>
                    <Input
                      type="number"
                      value={formData.pump_detection_threshold}
                      onChange={(e) => setFormData({ ...formData, pump_detection_threshold: parseFloat(e.target.value) })}
                      className="bg-white/5 border-white/10"
                      step="1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Dump Threshold (%)</Label>
                    <Input
                      type="number"
                      value={formData.dump_detection_threshold}
                      onChange={(e) => setFormData({ ...formData, dump_detection_threshold: parseFloat(e.target.value) })}
                      className="bg-white/5 border-white/10"
                      step="1"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.strategy === 'portfolio_rebalancing' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Target Allocation (%)</Label>
                    <Input
                      type="number"
                      value={formData.rebalance_target_percentage}
                      onChange={(e) => setFormData({ ...formData, rebalance_target_percentage: parseFloat(e.target.value) })}
                      className="bg-white/5 border-white/10"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Check Interval (hours)</Label>
                    <Input
                      type="number"
                      value={formData.rebalance_interval_hours}
                      onChange={(e) => setFormData({ ...formData, rebalance_interval_hours: parseFloat(e.target.value) })}
                      className="bg-white/5 border-white/10"
                      step="1"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Risk Management */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-cyan-400">Risk Management</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-400 mb-2 block">Max Trade Amount ($)</Label>
                <Input
                  type="number"
                  value={formData.max_trade_amount}
                  onChange={(e) => setFormData({ ...formData, max_trade_amount: parseFloat(e.target.value) })}
                  className="bg-white/5 border-white/10"
                  step="10"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-400 mb-2 block">Daily Trade Limit</Label>
                <Input
                  type="number"
                  value={formData.daily_trade_limit}
                  onChange={(e) => setFormData({ ...formData, daily_trade_limit: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10"
                  step="1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ai_enabled"
                checked={formData.is_ai_enabled}
                onChange={(e) => setFormData({ ...formData, is_ai_enabled: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="ai_enabled" className="text-sm cursor-pointer">
                Enable AI predictions for better timing
              </Label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {botToEdit ? 'Update Bot' : 'Create Bot'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
