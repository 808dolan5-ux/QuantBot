import { ComposedChart, Area, Line, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ChartCard, { axisProps, tooltipStyle, dateTick, dateTimeLabel } from './ChartCard';
import { downsample } from '@/lib/backtest/metrics';

export default function PriceLiquidityChart({ price, trades }) {
  const data = downsample(price, 700);
  const maxVol = Math.max(...data.map((d) => d.volume));
  const longs = trades.filter((t) => t.side === 'long').map((t) => ({ t: t.entryTime, close: t.entry }));
  const shorts = trades.filter((t) => t.side === 'short').map((t) => ({ t: t.entryTime, close: t.entry }));
  const exits = trades.map((t) => ({ t: t.exitTime, close: t.exit }));
  return (
    <ChartCard title="Price, trades & tick-volume liquidity" right="Triangles: green long, red short entries. Dots: exits">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={dateTick} {...axisProps} />
          <YAxis yAxisId="p" domain={['auto', 'auto']} width={60} {...axisProps} />
          <YAxis yAxisId="v" orientation="right" domain={[0, maxVol * 4]} hide />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={dateTimeLabel} />
          <Area yAxisId="v" dataKey="volume" name="Tick volume" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.25} dot={false} />
          <Line yAxisId="p" dataKey="close" name="Close" stroke="hsl(var(--foreground))" strokeWidth={1.2} dot={false} />
          <Scatter yAxisId="p" data={longs} dataKey="close" name="Long entry" fill="hsl(var(--chart-2))" shape="triangle" />
          <Scatter yAxisId="p" data={shorts} dataKey="close" name="Short entry" fill="hsl(var(--destructive))" shape="triangle" />
          <Scatter yAxisId="p" data={exits} dataKey="close" name="Exit" fill="hsl(var(--chart-4))" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}