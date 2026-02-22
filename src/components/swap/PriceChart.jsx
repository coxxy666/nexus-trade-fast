import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function PriceChart({ token }) {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    
    const generateMockPriceData = () => {
      const basePrice = token.price_usd || 1;
      const data = [];
      const now = Date.now();
      
      // Generate 24 data points (hourly)
      for (let i = 24; i >= 0; i--) {
        const variation = (Math.random() - 0.5) * 0.1 * basePrice;
        const price = basePrice + variation;
        data.push({
          time: new Date(now - i * 3600000).toLocaleTimeString('en-US', { hour: '2-digit' }),
          price: parseFloat(price.toFixed(6))
        });
      }
      return data;
    };

    setIsLoading(true);
    const timer = setTimeout(() => {
      setChartData(generateMockPriceData());
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [token?.symbol]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!chartData.length) return null;

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const priceChange = ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price * 100).toFixed(2);

  return (
    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">{token.symbol} Price (24h)</h3>
        <span className={priceChange > 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
          {priceChange > 0 ? '+' : ''}{priceChange}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" stroke="#999" style={{ fontSize: '0.75rem' }} />
          <YAxis stroke="#999" style={{ fontSize: '0.75rem' }} domain={[minPrice * 0.98, maxPrice * 1.02]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#00D4FF" 
            dot={false}
            isAnimationActive={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
