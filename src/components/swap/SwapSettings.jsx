import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sliders } from 'lucide-react';

export default function SwapSettings({ isOpen, onClose, settings, onSettingsChange }) {
  const [slippage, setSlippage] = useState(settings.slippage || 0.5);
  const [gasSpeed, setGasSpeed] = useState(settings.gasSpeed || 'standard');

  const handleSave = () => {
    onSettingsChange({ slippage, gasSpeed });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <DialogTitle>Swap Settings</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Slippage Tolerance */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Slippage Tolerance
            </label>
            <div className="flex items-center gap-2 mb-3">
              <Input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                max="5"
                className="flex-1 bg-white/5 border-white/10 text-white"
              />
              <span className="text-gray-400">%</span>
            </div>
            <div className="flex gap-2">
              {[0.1, 0.5, 1].map((val) => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    slippage === val
                      ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          {/* Gas Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Gas Speed
            </label>
            <div className="space-y-2">
              {['slow', 'standard', 'fast'].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setGasSpeed(speed)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    gasSpeed === speed
                      ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 border-white/10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
              onClick={handleSave}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
