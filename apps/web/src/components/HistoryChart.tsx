import { Card } from 'ui-kit';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type HistoryChartProps = {
  data: Array<{ month: number; cash: number; sales: number }>;
};

export function HistoryChart({ data }: HistoryChartProps) {
  return (
    <Card title="Financial History">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Line type="monotone" dataKey="cash" stroke="#0f172a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sales" stroke="#1d4ed8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
