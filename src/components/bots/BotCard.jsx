import React from 'react';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Pause, Play, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function BotCard({ bot, onEdit, refetch, delay = 0 }) {
  const queryClient = useQueryClient();

  const toggleStatusMutation = useMutation({
    mutationFn: () => {
      const newStatus = bot.status === 'active' ? 'paused' : 'active';
      return appClient.entities.TradingBot.update(bot.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
      refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => appClient.entities.TradingBot.delete(bot.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
      refetch();
    },
  });

  const getStrategyLabel = (strategy) => {
    const labels = {
      buy_the_dip: 'Buy the Dip',
      pump_dump_detection: 'Pump & Dump Detection',
      portfolio_rebalancing: 'Portfolio Rebalancing',
    };
    return labels[strategy] || strategy;
  };

  const getStrategyColor = (strategy) => {
    const colors = {
      buy_the_dip: 'from-blue-500 to-cyan-500',
      pump_dump_detection: 'from-orange-500 to-red-500',
      portfolio_rebalancing: 'from-purple-500 to-pink-500',
    };
    return colors[strategy] || 'from-gray-500 to-gray-600';
  };

  const isActive = bot.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">{bot.name}</h3>
          <p className="text-xs text-gray-400">{bot.token_symbol}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isActive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {bot.status}
        </div>
      </div>

      {/* Strategy Badge */}
      <div className={`bg-gradient-to-r ${getStrategyColor(bot.strategy)} rounded-lg px-3 py-1 text-xs font-semibold mb-4 w-fit`}>
        {getStrategyLabel(bot.strategy)}
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-6 pb-6 border-b border-white/5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Trades Executed</span>
          <span className="font-semibold">{bot.total_trades_executed || 0}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Total P&L</span>
          <span className={`font-semibold ${(bot.total_profit_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${(bot.total_profit_loss || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Win Rate</span>
          <span className="font-semibold">{(bot.win_rate || 0).toFixed(1)}%</span>
        </div>

        {bot.last_execution && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Last Execution</span>
            <span className="text-xs">{format(new Date(bot.last_execution), 'MMM dd, HH:mm')}</span>
          </div>
        )}
      </div>

      {/* Parameters Preview */}
      <div className="text-xs text-gray-400 space-y-1 mb-6">
        {bot.strategy === 'buy_the_dip' && (
          <>
            <p>Buy at -<span className="text-cyan-400 font-semibold">{bot.buy_threshold}%</span></p>
            <p>Sell at +<span className="text-cyan-400 font-semibold">{bot.sell_threshold}%</span></p>
          </>
        )}
        {bot.strategy === 'pump_dump_detection' && (
          <>
            <p>Pump threshold: <span className="text-cyan-400 font-semibold">{bot.pump_detection_threshold}%</span></p>
            <p>Dump threshold: <span className="text-cyan-400 font-semibold">{bot.dump_detection_threshold}%</span></p>
          </>
        )}
        {bot.strategy === 'portfolio_rebalancing' && (
          <p>Target: <span className="text-cyan-400 font-semibold">{bot.rebalance_target_percentage}%</span> every <span className="text-cyan-400 font-semibold">{bot.rebalance_interval_hours}h</span></p>
        )}
        <p className="text-gray-500">Max trade: ${bot.max_trade_amount}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => toggleStatusMutation.mutate()}
          disabled={toggleStatusMutation.isPending}
          size="sm"
          variant="outline"
          className="flex-1 border-white/10 text-xs"
        >
          {isActive ? (
            <>
              <Pause className="w-3 h-3 mr-1" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              Activate
            </>
          )}
        </Button>

        <Button
          onClick={() => onEdit(bot)}
          size="sm"
          variant="outline"
          className="flex-1 border-white/10 text-xs"
        >
          <Edit2 className="w-3 h-3 mr-1" />
          Edit
        </Button>

        <Button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          size="sm"
          variant="outline"
          className="flex-1 border-white/10 text-xs hover:border-red-500/30 hover:text-red-400"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}
