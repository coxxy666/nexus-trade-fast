import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function MiniChart({ data, isPositive = true }) {
  const color = isPositive ? '#00D4FF' : '#ef4444';

  return (
    <div className="h-16 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${isPositive}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${isPositive})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
