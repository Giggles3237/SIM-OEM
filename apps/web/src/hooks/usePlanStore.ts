import { create } from 'zustand';

type PricingPlan = {
  trimId: number;
  marketId: number;
  incentivePerUnit?: number;
};

type PlanState = {
  pricing: PricingPlan[];
  setPricing: (pricing: PricingPlan[]) => void;
};

export const usePlanStore = create<PlanState>((set) => ({
  pricing: [],
  setPricing: (pricing) => set({ pricing }),
}));
