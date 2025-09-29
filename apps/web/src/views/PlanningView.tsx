import { useMutation } from '@tanstack/react-query';
import { usePlanStore } from '../hooks/usePlanStore';
import { submitPlan } from '../hooks/useSimApi';

export function PlanningView() {
  const pricing = usePlanStore((state) => state.pricing);
  const setPricing = usePlanStore((state) => state.setPricing);
  const mutation = useMutation({ mutationFn: submitPlan });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Planning Drawer</h2>
        <p className="text-sm text-slate-600">Create incentive or pricing updates for the next month.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold">Pricing Overrides</h3>
        <button
          className="mt-3 rounded border border-dashed border-slate-400 px-3 py-2 text-sm"
          onClick={() => setPricing([...pricing, { trimId: 1, marketId: 1, incentivePerUnit: 500 }])}
        >
          Add Example Incentive
        </button>
        <pre className="mt-4 rounded bg-slate-900 p-4 text-xs text-slate-100">{JSON.stringify(pricing, null, 2)}</pre>
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => mutation.mutate({ pricing, allocationRules: { marketPriority: { 1: 1 }, dealerCSIWeight: 1, fairnessMin: 5 } })}
        >
          Submit Plan
        </button>
      </div>
      {mutation.error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(mutation.error as any)?.response?.data?.error?.message ?? 'Validation failed'}
        </div>
      )}
      {mutation.isSuccess && <div className="text-sm text-green-600">Plan accepted for next tick.</div>}
    </div>
  );
}
