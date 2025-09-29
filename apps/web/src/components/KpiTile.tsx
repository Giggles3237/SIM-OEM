import { Card } from 'ui-kit';

type KpiTileProps = {
  label: string;
  value: string;
  helper?: string;
};

export function KpiTile({ label, value, helper }: KpiTileProps) {
  return (
    <Card className="bg-white">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
    </Card>
  );
}
