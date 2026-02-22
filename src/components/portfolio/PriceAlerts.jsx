import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PriceAlerts() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    token_symbol: '',
    condition: 'above',
    target_price: ''
  });

  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['priceAlerts'],
    queryFn: () => appClient.entities.PriceAlert.list()
  });

  const createAlert = useMutation({
    mutationFn: (data) => appClient.entities.PriceAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['priceAlerts']);
      setFormData({ token_symbol: '', condition: 'above', target_price: '' });
      setShowForm(false);
    }
  });

  const deleteAlert = useMutation({
    mutationFn: (id) => appClient.entities.PriceAlert.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['priceAlerts'])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createAlert.mutate({
      ...formData,
      target_price: parseFloat(formData.target_price),
      is_active: true
    });
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Price Alerts</h3>
            <p className="text-gray-400 text-sm">{alerts.length} active alerts</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Alert
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Token</Label>
                <Input
                  placeholder="ETH, BTC..."
                  value={formData.token_symbol}
                  onChange={(e) => setFormData({ ...formData, token_symbol: e.target.value.toUpperCase() })}
                  className="bg-white/5 border-white/10 mt-1 h-9"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Target Price</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.target_price}
                  onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
                  className="bg-white/5 border-white/10 mt-1 h-9"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121a] border-white/10">
                  <SelectItem value="above">Price goes above</SelectItem>
                  <SelectItem value="below">Price goes below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1 border-white/20">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="flex-1 bg-cyan-600 hover:bg-cyan-500">
                Create Alert
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No alerts set. Create one to get notified!</p>
        ) : (
          alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                {alert.condition === 'above' ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <p className="font-semibold text-sm">{alert.token_symbol}</p>
                  <p className="text-xs text-gray-400">
                    Alert when {alert.condition} ${alert.target_price}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteAlert.mutate(alert.id)}
                className="text-gray-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
