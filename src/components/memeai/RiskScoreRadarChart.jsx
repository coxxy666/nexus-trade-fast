import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function RiskScoreRadarChart({ riskBreakdown }) {
  if (!riskBreakdown) return null;

  const data = [
    {
      category: 'Liquidity',
      value: 100 - (riskBreakdown.liquidity_risk || 0),
      fullMark: 100
    },
    {
      category: 'Volatility',
      value: 100 - (riskBreakdown.volatility_risk || 0),
      fullMark: 100
    },
    {
      category: 'Tokenomics',
      value: 100 - (riskBreakdown.tokenomics_risk || 0),
      fullMark: 100
    },
    {
      category: 'Social',
      value: 100 - (riskBreakdown.social_risk || 0),
      fullMark: 100
    },
    {
      category: 'Technical',
      value: 100 - (riskBreakdown.technical_risk || 0),
      fullMark: 100
    }
  ];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
          <PolarAngleAxis 
            dataKey="category" 
            stroke="rgba(255, 255, 255, 0.6)"
            tick={{ fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            stroke="rgba(255, 255, 255, 0.4)"
          />
          <Radar 
            name="Safety Score" 
            dataKey="value" 
            stroke="#00D4FF" 
            fill="#00D4FF" 
            fillOpacity={0.3}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(10, 10, 15, 0.9)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            formatter={(value) => `${value.toFixed(0)}/100`}
            labelStyle={{ color: '#fff' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
