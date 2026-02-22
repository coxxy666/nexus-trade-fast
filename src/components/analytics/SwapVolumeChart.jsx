import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SwapVolumeChart({ transactions }) {
  const chartData = React.useMemo(() => {
    const grouped = {};
    
    transactions.forEach(t => {
      const date = new Date(t.created_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!grouped[date]) {
        grouped[date] = 0;
      }
      grouped[date] += parseFloat(t.amount_from) || 0;
    });

    return Object.entries(grouped)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-30)
      .map(([date, volume]) => ({
        date,
        volume: parseFloat(volume.toFixed(2)),
      }));
  }, [transactions]);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-xl font-bold mb-4">Swap Volume Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1a1a2e', 
              border: '1px solid #00d4ff50',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Line 
            type="monotone" 
            dataKey="volume" 
            stroke="#00D4FF" 
            strokeWidth={2}
            dot={{ fill: '#00D4FF', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
