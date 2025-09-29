import seedrandom from 'seedrandom';
import {
  advanceMonth,
  allocationScores,
  bottleneckThroughput,
  demandFormula,
  featureScore,
  warrantyAccrual,
} from '../math';
import { SimConfig, SimInputPlan, SimState, Trim } from '../types';

describe('engine math', () => {
  const trim: Trim = {
    id: 'trim-a',
    programId: 'prog-1',
    segmentId: 'suv-c',
    powertrain: 'bev',
    msrp: 45000,
    featureVector: { tech: 1.1, safety: 1.05, range: 1.2 },
    buildCost: { base: 28000, battery: 9000 },
    batteryKWh: 82,
    rangeMiles: 310,
    adasLevel: 2,
    variableMargins: {},
  };
  const cfg: SimConfig = {
    name: 'default',
    rules: {
      availabilitySigmoid: { mid: 60, steepness: 0.05 },
      elasticityBySegment: { 'suv-c': 1.1 },
      baseSegmentDemand: { 'suv-c': 24000 },
      macroWeights: { gdp: 0.4, interest: -0.5, fuel: 0.2 },
      logisticCostPerUnit: 750,
      campaignLiftScalar: 0.0002,
      warranty: {
        complexityBase: 1.1,
        powertrainComplexity: { bev: 1.3 },
      },
      co2: { finePerGram: 50 },
    },
  };

  const baseState: SimState = {
    id: 'sim-1',
    currentMonth: 0,
    cash: 500_000_000,
    debt: 100_000_000,
    boardExpectations: {},
    trims: [trim],
    inventories: [
      { trimId: 'trim-a', marketId: 'na', dealerId: 'dealer-1', qty: 120, ageDays: 20 },
      { trimId: 'trim-a', marketId: 'eu', dealerId: 'dealer-2', qty: 90, ageDays: 20 },
    ],
    macro: {
      na: { gdpIdx: 1.02, interestRateIdx: 0.95, fuelPriceIdx: 1.1 },
      eu: { gdpIdx: 0.99, interestRateIdx: 1.1, fuelPriceIdx: 1.2 },
    },
    brandAffinity: { na: 1.05, eu: 0.97 },
    plants: [
      { id: 'plant-1', oee: 0.9, changeoverMins: 120, bottlenecks: { body: 2800, paint: 2600 } },
    ],
    warrantyModel: {
      baseRate: 800,
      complexityFactor: 1.1,
      supplierPpmFactor: 1.05,
      oeeFactor: 0.98,
    },
    allocationRule: {
      marketPriority: { na: 1.1, eu: 0.9 },
      dealerCSIWeight: 1,
      fairnessMin: 5,
    },
  };

  const plan: SimInputPlan = {
    pricing: [
      { trimId: 'trim-a', marketId: 'na', incentivePerUnit: 500 },
      { trimId: 'trim-a', marketId: 'eu', incentivePerUnit: 300 },
    ],
    rAndD: [],
    contracts: [],
    productionPlan: [{ plantId: 'plant-1', trimId: 'trim-a', volume: 5000, month: 0 }],
    campaigns: [{ marketId: 'na', type: 'awareness', spend: 1_000_000, startMonth: 0, endMonth: 3 }],
    allocationRules: baseState.allocationRule,
  };

  it('calculates demand using macro, price, feature, availability, and campaigns', () => {
    const demand = demandFormula(
      {
        trim,
        segmentElasticity: cfg.rules.elasticityBySegment['suv-c'],
        macro: baseState.macro.na,
        baseSegmentDemand: cfg.rules.baseSegmentDemand['suv-c'],
        brandAffinity: baseState.brandAffinity.na,
        priceGap: -0.02,
        featureScore: featureScore(trim),
        daysSupply: 45,
        campaignLift: plan.campaigns[0].spend * cfg.rules.campaignLiftScalar,
      },
      cfg
    );
    expect(demand).toBeGreaterThan(0);
    expect(demand).toBeGreaterThan(cfg.rules.baseSegmentDemand['suv-c']);
  });

  it('computes warranty accrual scaling with complexity and powertrain', () => {
    const accrual = warrantyAccrual(trim, baseState.warrantyModel);
    expect(accrual).toBeGreaterThan(baseState.warrantyModel.baseRate);
  });

  it('caps production via bottlenecks and changeover loss', () => {
    const throughput = bottleneckThroughput(baseState.plants[0], 5000, 4);
    expect(throughput).toBeLessThanOrEqual(5000);
  });

  it('scores allocation consistent with priorities and fairness', () => {
    const rng = seedrandom('alloc');
    const scores = allocationScores(baseState.inventories, { 'dealer-1': 50, 'dealer-2': 30 }, baseState.allocationRule, rng);
    expect(Object.keys(scores)).toHaveLength(2);
    expect(scores['dealer-1']).toBeGreaterThan(0);
  });

  it('advances deterministically with same seed', () => {
    const first = advanceMonth(baseState, plan, cfg, 'seed');
    const second = advanceMonth(baseState, plan, cfg, 'seed');
    expect(first.snapshot.kpis.cash).toEqual(second.snapshot.kpis.cash);
    expect(first.snapshot.deltas.production).toEqual(second.snapshot.deltas.production);
  });
});
