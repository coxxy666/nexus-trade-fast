import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function SwapSuccessRateChart({ transactions }) {
  const data = React.useMemo(() => {
    const successful = transactions.filter(t => t.status === 'completed').length;
    const failed = transactions.filter(t => t.status === 'failed').length;
    const pending = transactions.filter(t => t.status === 'pending').length;

    return [
      { name: 'Successful', value: successful, color: '#10b981' },
      { name: 'Failed', value: failed, color: '#ef4444' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [transactions]);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-xl font-bold mb-4">Transaction Status</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1a1a2e', 
                border: '1px solid #00d4ff50',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No data available
        </div>
      )}
    </div>
  );
}
