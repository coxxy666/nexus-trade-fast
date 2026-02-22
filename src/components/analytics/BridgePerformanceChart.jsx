import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BridgePerformanceChart({ bridgeStats }) {
  const data = bridgeStats.map(stat => ({
    provider: stat.provider.length > 15 ? stat.provider.slice(0, 12) + '...' : stat.provider,
    'Success Rate': parseFloat(stat.successRate),
    'Total': stat.count,
  }));

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5">
      <h2 className="text-2xl font-bold mb-4">Bridge Provider Performance</h2>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis 
              dataKey="provider" 
              stroke="#9ca3af"
              angle={-45}
              textAnchor="end"
              height={100}
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1a1a2e', 
                border: '1px solid #00d4ff50',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => value.toFixed(1)}
            />
            <Legend />
            <Bar dataKey="Success Rate" fill="#00D4FF" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No cross-chain swaps yet
        </div>
      )}
    </div>
  );
}
