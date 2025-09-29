import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KpiTile } from '../components/KpiTile';
import { HistoryChart } from '../components/HistoryChart';
import { fetchHistory, startNewSim, tickSim } from '../hooks/useSimApi';

function formatCurrency(value?: number) {
  if (!value && value !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function DashboardView() {
  const queryClient = useQueryClient();
  const historyQuery = useQuery({ queryKey: ['history'], queryFn: fetchHistory });

  const newGame = useMutation({
    mutationFn: startNewSim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['state'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const tick = useMutation({
    mutationFn: tickSim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['state'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const snapshot = historyQuery.data?.[0];
  const kpis = snapshot?.kpis;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-white shadow-sm hover:bg-slate-800"
          onClick={() => newGame.mutate()}
        >
          New Game
        </button>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-500"
          onClick={() => tick.mutate()}
        >
          Advance Month
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile label="EBITDA %" value={kpis ? `${(kpis.ebitdaPct * 100).toFixed(1)}%` : '—'} />
        <KpiTile label="Cash" value={formatCurrency(kpis?.cash)} helper="Current cash balance" />
        <KpiTile label="Warranty $/unit" value={kpis ? formatCurrency(kpis.warrantyPerUnit) : '—'} />
      </div>
      <HistoryChart
        data={(historyQuery.data ?? []).map((item: any) => ({
          month: item.month,
          cash: item.kpis.cash,
          sales: Object.values(item.deltas.sales ?? {}).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0),
        }))}
      />
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
          <h2 className="text-lg font-semibold">Market Allocation</h2>
          <p className="mt-2 text-sm text-slate-600">
            Quick overview of demand and supply by market. This prototype renders aggregated values from the latest snapshot.
          </p>
          <pre className="mt-4 overflow-auto rounded bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(kpis?.marketShare ?? {}, null, 2)}
          </pre>
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
          <h2 className="text-lg font-semibold">CO₂ Compliance</h2>
          <p className="mt-2 text-sm text-slate-600">Track the gap to market targets and identify the need for credits or fines.</p>
          <pre className="mt-4 overflow-auto rounded bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(kpis?.co2Gap ?? {}, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}
