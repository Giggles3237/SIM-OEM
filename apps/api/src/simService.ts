import { PrismaClient } from '@prisma/client';
import { advanceMonth, SimConfig as EngineSimConfig, SimInputPlan, SimState, SimSnapshot } from 'engine';
import { z } from 'zod';

const planSchema = z.object({
  pricing: z
    .array(
      z.object({
        trimId: z.number(),
        marketId: z.number(),
        msrp: z.number().optional(),
        incentivePerUnit: z.number().optional(),
        aprSubvent: z.number().optional(),
        leaseMF: z.number().optional(),
        residualPct: z.number().optional(),
      })
    )
    .default([]),
  rAndD: z
    .array(
      z.object({
        techNodeId: z.number(),
        action: z.enum(['start', 'pause', 'cancel']),
      })
    )
    .default([]),
  contracts: z
    .array(
      z.object({
        supplierId: z.number(),
        partId: z.number().optional(),
        action: z.enum(['sign', 'renegotiate', 'terminate']),
        terms: z.any(),
      })
    )
    .default([]),
  productionPlan: z
    .array(
      z.object({
        plantId: z.number(),
        trimId: z.number(),
        volume: z.number(),
        month: z.number(),
      })
    )
    .default([]),
  campaigns: z
    .array(
      z.object({
        marketId: z.number(),
        type: z.string(),
        spend: z.number(),
        startMonth: z.number(),
        endMonth: z.number(),
      })
    )
    .default([]),
  allocationRules: z.object({
    marketPriority: z.record(z.number()),
    dealerCSIWeight: z.number(),
    fairnessMin: z.number(),
  }),
});

export type ValidatedPlan = z.infer<typeof planSchema>;

export class SimService {
  private prisma: PrismaClient;
  private currentConfig: EngineSimConfig | null = null;
  private activeState: SimState | null = null;
  private lastSnapshot: SimSnapshot | null = null;
  private pendingPlan: ValidatedPlan | null = null;
  private rngSeed = 'sim-oem';

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getConfig(): Promise<EngineSimConfig> {
    if (!this.currentConfig) {
      const record = await this.prisma.simConfig.findFirst();
      this.currentConfig = (record?.rules as EngineSimConfig['rules'])
        ? ({ name: record?.name ?? 'default', rules: record?.rules as EngineSimConfig['rules'] } as EngineSimConfig)
        : {
            name: 'default',
            rules: {
              availabilitySigmoid: { mid: 60, steepness: 0.05 },
              elasticityBySegment: { 'suv-c': 1.0 },
              baseSegmentDemand: { 'suv-c': 20000 },
              macroWeights: { gdp: 0.4, interest: -0.5, fuel: 0.3 },
              logisticCostPerUnit: 650,
              campaignLiftScalar: 0.00015,
              warranty: {
                complexityBase: 1.05,
                powertrainComplexity: { bev: 1.3, phev: 1.2, hev: 1.15, ice: 1 },
              },
              co2: { finePerGram: 50 },
            },
          };
    }
    return this.currentConfig;
  }

  async startNewSim(): Promise<SimSnapshot> {
    const config = await this.getConfig();
    const trims = await this.prisma.trim.findMany({ include: { program: { include: { segment: true } } } });
    const markets = await this.prisma.market.findMany({ include: { dealers: true } });
    const plants = await this.prisma.plant.findMany();

    const state: SimState = {
      id: 'active',
      currentMonth: 0,
      cash: 500_000_000,
      debt: 100_000_000,
      boardExpectations: {},
      trims: trims.map((t) => ({
        id: `trim-${t.id}`,
        programId: `prog-${t.programId}`,
        segmentId: t.program.segment.code,
        powertrain: t.powertrain,
        msrp: t.msrp,
        featureVector: t.featureVector as Record<string, number>,
        buildCost: t.buildCost as Record<string, number>,
        batteryKWh: t.batteryKWh ?? undefined,
        rangeMiles: t.rangeMiles ?? undefined,
        adasLevel: t.adasLevel,
        variableMargins: t.variableMargins as Record<string, number>,
      })),
      inventories: markets.flatMap((m) =>
        m.dealers.map((d, index) => ({
          trimId: `trim-${trims[index % trims.length]?.id ?? trims[0]?.id ?? 1}`,
          marketId: `market-${m.id}`,
          dealerId: `dealer-${d.id}`,
          qty: 120,
          ageDays: 15,
        }))
      ),
      macro: Object.fromEntries(markets.map((m) => [`market-${m.id}`, { gdpIdx: m.gdpIdx, interestRateIdx: m.interestRateIdx, fuelPriceIdx: m.fuelPriceIdx }])),
      brandAffinity: Object.fromEntries(markets.map((m) => [`market-${m.id}`, 1])),
      plants: plants.map((p) => ({
        id: `plant-${p.id}`,
        oee: p.oee,
        changeoverMins: p.changeoverMins,
        bottlenecks: p.bottlenecks as Record<string, number>,
      })),
      warrantyModel: {
        baseRate: 700,
        complexityFactor: 1.05,
        supplierPpmFactor: 1,
        oeeFactor: 1,
      },
      allocationRule: {
        marketPriority: Object.fromEntries(markets.map((m) => [`market-${m.id}`, 1])),
        dealerCSIWeight: 1,
        fairnessMin: 5,
      },
    };

    const plan: SimInputPlan = {
      pricing: [],
      rAndD: [],
      contracts: [],
      productionPlan: [],
      campaigns: [],
      allocationRules: state.allocationRule,
    };

    const { nextState, snapshot } = advanceMonth(state, plan, config, this.rngSeed);

    this.activeState = nextState;
    this.lastSnapshot = snapshot;

    return snapshot;
  }

  async getActiveState() {
    return this.activeState;
  }

  async submitPlan(planBody: unknown) {
    const validated = planSchema.parse(planBody);
    this.pendingPlan = validated;
    return validated;
  }

  async advanceTick(): Promise<SimSnapshot> {
    if (!this.activeState) {
      throw new Error('No active state');
    }
    const config = await this.getConfig();
    const plan = this.pendingPlan ?? {
      pricing: [],
      rAndD: [],
      contracts: [],
      productionPlan: [],
      campaigns: [],
      allocationRules: this.activeState.allocationRule,
    };

    const normalizedPlan: SimInputPlan = {
      pricing: plan.pricing.map((p) => ({ ...p, trimId: `trim-${p.trimId}`, marketId: `market-${p.marketId}` })),
      rAndD: plan.rAndD.map((r) => ({ ...r, techNodeId: `tech-${r.techNodeId}` })),
      contracts: plan.contracts.map((c) => ({ ...c, supplierId: `supplier-${c.supplierId}`, partId: c.partId ? `part-${c.partId}` : undefined })),
      productionPlan: plan.productionPlan.map((pr) => ({ ...pr, plantId: `plant-${pr.plantId}`, trimId: `trim-${pr.trimId}` })),
      campaigns: plan.campaigns.map((c) => ({ ...c, marketId: `market-${c.marketId}` })),
      allocationRules: {
        marketPriority: Object.fromEntries(
          Object.entries(plan.allocationRules.marketPriority).map(([key, value]) => [`market-${key}`, value])
        ),
        dealerCSIWeight: plan.allocationRules.dealerCSIWeight,
        fairnessMin: plan.allocationRules.fairnessMin,
      },
    } as unknown as SimInputPlan;

    const { nextState, snapshot } = advanceMonth(this.activeState, normalizedPlan, config, this.rngSeed);
    this.activeState = nextState;
    this.lastSnapshot = snapshot;
    this.pendingPlan = null;
    return snapshot;
  }

  async history(from?: number, to?: number) {
    if (!this.lastSnapshot) return [];
    return [this.lastSnapshot];
  }
}
