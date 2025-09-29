import seedrandom from 'seedrandom';
import {
  AllocationRule,
  DealerInventory,
  MacroContext,
  Plant,
  ProductionPlanEntry,
  SimConfig,
  SimInputPlan,
  SimSnapshot,
  SimState,
  Trim,
} from './types';

const WORK_MINS_IN_MONTH = 30 * 24 * 60;

export type DemandContext = {
  trim: Trim;
  segmentElasticity: number;
  macro: MacroContext;
  baseSegmentDemand: number;
  brandAffinity: number;
  priceGap: number;
  featureScore: number;
  daysSupply: number;
  campaignLift: number;
};

export function demandFormula(ctx: DemandContext, cfg: SimConfig): number {
  const macroMultiplier =
    1 +
    cfg.rules.macroWeights.gdp * (ctx.macro.gdpIdx - 1) +
    cfg.rules.macroWeights.interest * (ctx.macro.interestRateIdx - 1) +
    cfg.rules.macroWeights.fuel * (ctx.macro.fuelPriceIdx - 1);
  const priceMultiplier = 1 - ctx.priceGap * ctx.segmentElasticity;
  const availability = availabilityFactor(ctx.daysSupply, cfg);
  return (
    ctx.baseSegmentDemand *
    macroMultiplier *
    ctx.brandAffinity *
    priceMultiplier *
    ctx.featureScore *
    availability *
    (1 + ctx.campaignLift)
  );
}

export function availabilityFactor(daysSupply: number, cfg: SimConfig): number {
  const { mid, steepness } = cfg.rules.availabilitySigmoid;
  const exponent = -steepness * (daysSupply - mid);
  const logistic = 1 / (1 + Math.exp(exponent));
  return 0.4 + 0.6 * logistic;
}

export function featureScore(trim: Trim): number {
  const features = Object.values(trim.featureVector ?? {});
  if (features.length === 0) return 1;
  const avg = features.reduce((acc, val) => acc + val, 0) / features.length;
  const rangeBoost = trim.rangeMiles ? Math.min(trim.rangeMiles / 300, 1.2) : 1;
  const adasBoost = 1 + trim.adasLevel * 0.05;
  return Math.min(1.3, Math.max(0.7, avg * rangeBoost * adasBoost));
}

export function computeMarginPerUnit(trim: Trim, incentive: number, warrantyAccrual: number, cfg: SimConfig): number {
  const buildCost = Object.values(trim.buildCost ?? {}).reduce((sum, val) => sum + val, 0);
  const logistics = cfg.rules.logisticCostPerUnit;
  return trim.msrp - (buildCost + logistics + incentive + warrantyAccrual);
}

export function warrantyAccrual(trim: Trim, model: SimState['warrantyModel']): number {
  const complexity = model.complexityFactor + Object.keys(trim.featureVector ?? {}).length * 0.02;
  const powertrainComplexity = model.complexityFactor * (trim.powertrain === 'bev' ? 1.3 : trim.powertrain === 'phev' ? 1.2 : trim.powertrain === 'hev' ? 1.1 : 1);
  return model.baseRate * complexity * powertrainComplexity * model.supplierPpmFactor * model.oeeFactor;
}

export function co2Gap(salesMix: Record<string, number>, target: number): number {
  const weighted = Object.values(salesMix).reduce((acc, val) => acc + val, 0);
  if (weighted === 0) return 0;
  return weighted - target;
}

export function bottleneckThroughput(plant: Plant, plannedVolume: number, switches: number): number {
  const stationCapacities = Object.values(plant.bottlenecks ?? {});
  if (stationCapacities.length === 0) return plannedVolume;
  const base = Math.min(...stationCapacities);
  const changeoverLoss = (plant.changeoverMins * switches) / WORK_MINS_IN_MONTH;
  const effective = base * (1 - changeoverLoss) * plant.oee;
  return Math.max(0, Math.min(plannedVolume, effective));
}

export function allocationScores(
  inventories: DealerInventory[],
  salesHistory: Record<string, number>,
  rule: AllocationRule,
  rng: seedrandom.prng
): Record<string, number> {
  const scores: Record<string, number> = {};
  inventories.forEach((inv) => {
    const sales = salesHistory[inv.dealerId] ?? 0.1;
    const invQty = Math.max(inv.qty, rule.fairnessMin);
    const marketWeight = rule.marketPriority[inv.marketId] ?? 1;
    const jitter = 0.95 + rng() * 0.1;
    scores[inv.dealerId] = ((sales / invQty) * marketWeight * rule.dealerCSIWeight) * jitter;
  });
  return scores;
}

export function applyProduction(
  plan: ProductionPlanEntry[],
  plants: Plant[],
  rng: seedrandom.prng
): { produced: Record<string, number>; messages: SimSnapshot['messages'] } {
  const produced: Record<string, number> = {};
  const messages: SimSnapshot['messages'] = [];
  plan.forEach((entry) => {
    const plant = plants.find((p) => p.id === entry.plantId);
    if (!plant) {
      messages.push({ severity: 'warning', text: `Unknown plant ${entry.plantId}`, ref: 'production' });
      return;
    }
    const switches = Math.max(0, Math.round(rng() * 3));
    const throughput = bottleneckThroughput(plant, entry.volume, switches);
    produced[entry.trimId] = (produced[entry.trimId] ?? 0) + throughput;
    if (throughput < entry.volume) {
      messages.push({
        severity: 'warning',
        text: `Plant ${plant.id} limited ${entry.trimId} to ${Math.round(throughput)} units due to bottleneck`,
        ref: 'bottleneck',
      });
    }
  });
  return { produced, messages };
}

export function advanceMonth(
  prevState: SimState,
  plan: SimInputPlan,
  cfg: SimConfig,
  rngSeed: string
): { nextState: SimState; snapshot: SimSnapshot } {
  const rng = seedrandom(rngSeed + prevState.currentMonth);
  const producedInfo = applyProduction(plan.productionPlan, prevState.plants, rng);
  const inventoryUpdates: DealerInventory[] = prevState.inventories.map((inv) => ({
    ...inv,
    qty: inv.qty + Math.floor((producedInfo.produced[inv.trimId] ?? 0) / prevState.inventories.length),
    ageDays: inv.ageDays + 30,
  }));

  const salesByMarket: Record<string, number> = {};
  const daysSupplyByMarket: Record<string, number> = {};
  const messages = [...producedInfo.messages];

  const planPricingMap = new Map<string, number>();
  plan.pricing.forEach((p) => {
    planPricingMap.set(`${p.trimId}:${p.marketId}`, p.msrp ?? 0);
  });

  inventoryUpdates.forEach((inv) => {
    const trim = prevState.trims.find((t) => t.id === inv.trimId);
    if (!trim) return;
    const macro = prevState.macro[inv.marketId];
    const baseDemand = cfg.rules.baseSegmentDemand[trim.segmentId] ?? 1000;
    const elasticity = cfg.rules.elasticityBySegment[trim.segmentId] ?? 1.0;
    const brandAffinity = prevState.brandAffinity[inv.marketId] ?? 1;
    const marketInventory = inventoryUpdates
      .filter((item) => item.marketId === inv.marketId)
      .reduce((sum, item) => sum + item.qty, 0);
    const daysSupply = marketInventory / Math.max(1, baseDemand / 12);
    daysSupplyByMarket[inv.marketId] = daysSupply;
    const campaign = plan.campaigns.find((c) => c.marketId === inv.marketId && c.startMonth <= prevState.currentMonth && c.endMonth >= prevState.currentMonth);
    const msrpOverride = planPricingMap.get(`${trim.id}:${inv.marketId}`);
    const priceGap = msrpOverride ? (msrpOverride - trim.msrp) / trim.msrp : 0;
    const feature = featureScore(trim);
    const demand = demandFormula(
      {
        trim,
        segmentElasticity: elasticity,
        macro,
        baseSegmentDemand: baseDemand,
        brandAffinity,
        priceGap,
        featureScore: feature,
        daysSupply,
        campaignLift: campaign ? campaign.spend * cfg.rules.campaignLiftScalar : 0,
      },
      cfg
    );
    const sales = Math.min(inv.qty, Math.max(0, Math.round(demand / 12)));
    inv.qty -= sales;
    salesByMarket[inv.marketId] = (salesByMarket[inv.marketId] ?? 0) + sales;
  });

  const totalSales = Object.values(salesByMarket).reduce((acc, val) => acc + val, 0);
  const warranty = prevState.trims.map((t) => warrantyAccrual(t, prevState.warrantyModel));
  const avgWarranty = warranty.reduce((sum, val) => sum + val, 0) / Math.max(1, warranty.length);
  const marginPerUnit = prevState.trims.reduce((sum, trim) => {
    const incentive = plan.pricing.find((p) => p.trimId === trim.id)?.incentivePerUnit ?? 0;
    const warrantyCost = warrantyAccrual(trim, prevState.warrantyModel);
    return sum + computeMarginPerUnit(trim, incentive, warrantyCost, cfg);
  }, 0);
  const avgMargin = marginPerUnit / Math.max(prevState.trims.length, 1);
  const revenue = totalSales * avgMargin;
  const ebitdaPct = totalSales === 0 ? 0 : avgMargin / (avgMargin + 1e-6);
  const nextCash = prevState.cash + revenue;
  const snapshot: SimSnapshot = {
    month: prevState.currentMonth + 1,
    kpis: {
      ebitdaPct,
      marketShare: salesByMarket,
      co2Gap: Object.fromEntries(Object.keys(prevState.macro).map((market) => [market, co2Gap({ [market]: salesByMarket[market] ?? 0 }, 1000)])),
      csiAvg: 75,
      warrantyPerUnit: avgWarranty,
      daysSupplyByMarket,
      cash: nextCash,
      freeCashFlow: revenue - 0.1 * revenue,
    },
    deltas: {
      production: producedInfo.produced,
      sales: salesByMarket,
      inventory: inventoryUpdates.map((inv) => ({ dealerId: inv.dealerId, trimId: inv.trimId, qty: inv.qty })),
    },
    messages,
  };

  const nextState: SimState = {
    ...prevState,
    currentMonth: prevState.currentMonth + 1,
    cash: nextCash,
    inventories: inventoryUpdates,
    allocationRule: plan.allocationRules ?? prevState.allocationRule,
  };

  return { nextState, snapshot };
}
