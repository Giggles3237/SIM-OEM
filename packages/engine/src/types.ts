export type MarketId = string;
export type TrimId = string;
export type PlantId = string;
export type TechNodeId = string;
export type SupplierId = string;

export type SimConfig = {
  name: string;
  rules: {
    availabilitySigmoid: {
      mid: number;
      steepness: number;
    };
    elasticityBySegment: Record<string, number>;
    baseSegmentDemand: Record<string, number>;
    macroWeights: {
      gdp: number;
      interest: number;
      fuel: number;
    };
    logisticCostPerUnit: number;
    campaignLiftScalar: number;
    warranty: {
      complexityBase: number;
      powertrainComplexity: Record<string, number>;
    };
    co2: {
      finePerGram: number;
    };
  };
};

export type BrandAffinity = Record<string, number>;

export type Trim = {
  id: TrimId;
  programId: string;
  segmentId: string;
  powertrain: string;
  msrp: number;
  featureVector: Record<string, number>;
  buildCost: Record<string, number>;
  batteryKWh?: number;
  rangeMiles?: number;
  adasLevel: number;
  variableMargins: Record<string, number>;
};

export type DealerInventory = {
  trimId: TrimId;
  marketId: MarketId;
  dealerId: string;
  qty: number;
  ageDays: number;
};

export type MacroContext = {
  gdpIdx: number;
  interestRateIdx: number;
  fuelPriceIdx: number;
};

export type WarrantyModel = {
  baseRate: number;
  complexityFactor: number;
  supplierPpmFactor: number;
  oeeFactor: number;
};

export type AllocationRule = {
  marketPriority: Record<MarketId, number>;
  dealerCSIWeight: number;
  fairnessMin: number;
};

export type Plant = {
  id: PlantId;
  oee: number;
  changeoverMins: number;
  bottlenecks: Record<string, number>;
};

export type ProductionPlanEntry = {
  plantId: PlantId;
  trimId: TrimId;
  volume: number;
  month: number;
};

export type SimInputPlan = {
  pricing: Array<{
    trimId: TrimId;
    marketId: MarketId;
    msrp?: number;
    incentivePerUnit?: number;
    aprSubvent?: number;
    leaseMF?: number;
    residualPct?: number;
  }>;
  rAndD: Array<{
    techNodeId: TechNodeId;
    action: 'start' | 'pause' | 'cancel';
  }>;
  contracts: Array<{
    supplierId: SupplierId;
    partId?: string;
    action: 'sign' | 'renegotiate' | 'terminate';
    terms: any;
  }>;
  productionPlan: ProductionPlanEntry[];
  campaigns: Array<{
    marketId: MarketId;
    type: string;
    spend: number;
    startMonth: number;
    endMonth: number;
  }>;
  allocationRules: AllocationRule;
};

export type KPIRecord = {
  ebitdaPct: number;
  marketShare: Record<string, number>;
  co2Gap: Record<string, number>;
  csiAvg: number;
  warrantyPerUnit: number;
  daysSupplyByMarket: Record<string, number>;
  cash: number;
  freeCashFlow: number;
};

export type SimSnapshot = {
  month: number;
  kpis: KPIRecord;
  deltas: Record<string, any>;
  messages: Array<{ severity: 'info' | 'warning' | 'critical'; text: string; ref?: string }>;
};

export type SimState = {
  id: string;
  currentMonth: number;
  cash: number;
  debt: number;
  boardExpectations: Record<string, any>;
  trims: Trim[];
  inventories: DealerInventory[];
  macro: Record<MarketId, MacroContext>;
  brandAffinity: BrandAffinity;
  plants: Plant[];
  warrantyModel: WarrantyModel;
  allocationRule: AllocationRule;
};

export type AdvanceResult = {
  nextState: SimState;
  snapshot: SimSnapshot;
};
