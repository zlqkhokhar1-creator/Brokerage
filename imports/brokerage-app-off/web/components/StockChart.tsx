import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const data = [
  { timestamp: '9:30', price: 150.00 },
  { timestamp: '10:00', price: 152.50 },
  { timestamp: '10:30', price: 151.75 },
  { timestamp: '11:00', price: 153.25 },
  { timestamp: '11:30', price: 155.00 },
  { timestamp: '12:00', price: 154.50 },
  { timestamp: '12:30', price: 156.00 },
  { timestamp: '13:00', price: 155.75 },
  { timestamp: '13:30', price: 157.25 },
  { timestamp: '14:00', price: 158.50 },
  { timestamp: '14:30', price: 157.75 },
  { timestamp: '15:00', price: 159.00 },
  { timestamp: '15:30', price: 160.25 },
  { timestamp: '16:00', price: 159.75 },
];

export default function StockChart({ symbol = 'AAPL', interval = '1D' }) {
  return (
    <div className="card h-[400px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">{symbol}</h2>
          <p className="text-text-secondary">$159.75</p>
        </div>
        <div className="space-x-2">
          <button className="btn-secondary">1D</button>
          <button className="btn-secondary">1W</button>
          <button className="btn-secondary">1M</button>
          <button className="btn-secondary">3M</button>
          <button className="btn-secondary">1Y</button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00C805" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00C805" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" />
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#00C805"
            fillOpacity={1}
            fill="url(#colorPrice)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
