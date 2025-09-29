import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.inventory.deleteMany();
  await prisma.dealer.deleteMany();
  await prisma.pricing.deleteMany();
  await prisma.market.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.program.deleteMany();
  await prisma.trim.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.techNode.deleteMany();
  await prisma.eventCard.deleteMany();
  await prisma.simConfig.deleteMany();

  const markets = await prisma.market.createMany({
    data: [
      {
        name: 'North America',
        region: 'NA',
        currency: 'USD',
        co2Target: 95,
        zevCreditPrice: 150,
        fuelPriceIdx: 1.0,
        interestRateIdx: 1.0,
        gdpIdx: 1.0,
      },
      {
        name: 'Europe',
        region: 'EU',
        currency: 'EUR',
        co2Target: 80,
        zevCreditPrice: 200,
        fuelPriceIdx: 1.2,
        interestRateIdx: 1.1,
        gdpIdx: 0.98,
      },
      {
        name: 'Asia Pacific',
        region: 'APAC',
        currency: 'JPY',
        co2Target: 100,
        zevCreditPrice: 120,
        fuelPriceIdx: 0.9,
        interestRateIdx: 0.95,
        gdpIdx: 1.05,
      },
    ],
  });

  const segments = await prisma.segment.createMany({
    data: [
      { code: 'SUV-C', name: 'Crossover' },
      { code: 'SUV-D', name: 'Large Crossover' },
      { code: 'PICKUP', name: 'Pickup' },
      { code: 'PERF', name: 'Performance' },
      { code: 'SED-C', name: 'Compact Sedan' },
      { code: 'EV-C', name: 'EV Compact' },
    ],
  });

  const platform = await prisma.platform.create({
    data: {
      name: 'Atlas Modular',
      type: 'BEV',
      startYear: 2020,
      endYear: 2030,
      rAndDCost: 2500000000,
    },
  });

  const platform2 = await prisma.platform.create({
    data: {
      name: 'Everest Body-on-Frame',
      type: 'ICE',
      startYear: 2015,
      endYear: 2028,
      rAndDCost: 1600000000,
    },
  });

  const suvSegment = await prisma.segment.findFirst({ where: { code: 'SUV-C' } });
  const pickupSegment = await prisma.segment.findFirst({ where: { code: 'PICKUP' } });

  const program1 = await prisma.program.create({
    data: {
      name: 'Aurora EV',
      platformId: platform.id,
      segmentId: suvSegment!.id,
      startMonth: 0,
      status: 'production',
    },
  });

  const program2 = await prisma.program.create({
    data: {
      name: 'Frontier Truck',
      platformId: platform2.id,
      segmentId: pickupSegment!.id,
      startMonth: 0,
      status: 'production',
    },
  });

  await prisma.trim.createMany({
    data: [
      {
        programId: program1.id,
        powertrain: 'bev',
        msrp: 52000,
        featureVector: { tech: 1.1, safety: 1.0, range: 1.2 },
        buildCost: { base: 30000, battery: 12000 },
        batteryKWh: 85,
        rangeMiles: 310,
        adasLevel: 2,
        variableMargins: { na: 0.12 },
      },
      {
        programId: program2.id,
        powertrain: 'ice',
        msrp: 42000,
        featureVector: { tech: 0.9, safety: 0.95, towing: 1.3 },
        buildCost: { base: 25000 },
        adasLevel: 1,
        variableMargins: { na: 0.15 },
      },
    ],
  });

  const trimRecords = await prisma.trim.findMany();
  const marketsList = await prisma.market.findMany();

  for (const market of marketsList) {
    for (let i = 0; i < 3; i += 1) {
      const dealer = await prisma.dealer.create({
        data: {
          code: `${market.region}-D${i + 1}`,
          marketId: market.id,
          throughputIndex: 1 + i * 0.1,
          csi: 75 - i * 2,
          evReadiness: 0.6 + i * 0.1,
          facilityScore: 0.7 + i * 0.1,
        },
      });

      await prisma.inventory.createMany({
        data: trimRecords.map((trim) => ({
          dealerId: dealer.id,
          trimId: trim.id,
          ageDays: 20,
          qty: 60 - i * 10,
        })),
      });
    }
  }

  await prisma.plant.createMany({
    data: [
      {
        name: 'Detroit Assembly',
        region: 'NA',
        capacityJobsPerHour: 3000,
        oee: 0.88,
        energyMix: 'grid',
        bottlenecks: { body: 2500, paint: 2300, general: 2800 },
        changeoverMins: 180,
      },
      {
        name: 'Saskatoon Battery Plant',
        region: 'NA',
        capacityJobsPerHour: 1800,
        oee: 0.92,
        energyMix: 'renewable',
        bottlenecks: { pack: 1700, final: 1600 },
        changeoverMins: 120,
      },
    ],
  });

  await prisma.supplier.createMany({
    data: [
      { name: 'Quantum Cells', partCategory: 'Battery', leadTimeMonths: 6, ppm: 15, minOrderQty: 1000, priceCurve: { base: 110 }, riskScore: 0.2 },
      { name: 'Forge Steel', partCategory: 'Frame', leadTimeMonths: 4, ppm: 40, minOrderQty: 2000, priceCurve: { base: 45 }, riskScore: 0.4 },
      { name: 'Bright Optics', partCategory: 'Lighting', leadTimeMonths: 2, ppm: 12, minOrderQty: 1500, priceCurve: { base: 25 }, riskScore: 0.15 },
      { name: 'SkyChip', partCategory: 'Semiconductor', leadTimeMonths: 8, ppm: 35, minOrderQty: 5000, priceCurve: { base: 80 }, riskScore: 0.5 },
      { name: 'DriveLine Co', partCategory: 'Powertrain', leadTimeMonths: 5, ppm: 30, minOrderQty: 2500, priceCurve: { base: 120 }, riskScore: 0.35 },
      { name: 'VisionSafe', partCategory: 'ADAS', leadTimeMonths: 3, ppm: 20, minOrderQty: 1200, priceCurve: { base: 60 }, riskScore: 0.25 },
    ],
  });

  await prisma.techNode.createMany({
    data: [
      { code: 'ICE', name: 'Advanced ICE', cost: 200000000, timeMonths: 12, risk: 0.1, featureImpact: { efficiency: 0.02 }, regScoreImpact: -5, prereqs: [] },
      { code: '48V', name: '48V Mild Hybrid', cost: 400000000, timeMonths: 16, risk: 0.2, featureImpact: { efficiency: 0.05 }, regScoreImpact: -10, prereqs: ['ICE'] },
      { code: 'HEV', name: 'Full Hybrid', cost: 600000000, timeMonths: 18, risk: 0.25, featureImpact: { efficiency: 0.08 }, regScoreImpact: -15, prereqs: ['48V'] },
      { code: 'PHEV', name: 'Plug-in Hybrid', cost: 850000000, timeMonths: 20, risk: 0.3, featureImpact: { evRange: 40 }, regScoreImpact: -25, prereqs: ['HEV'] },
      { code: 'BEV', name: 'Battery Electric', cost: 1200000000, timeMonths: 24, risk: 0.35, featureImpact: { evRange: 250 }, regScoreImpact: -40, prereqs: ['PHEV'] },
      { code: 'ADAS-L2', name: 'ADAS Level 2', cost: 180000000, timeMonths: 12, risk: 0.2, featureImpact: { safety: 0.1 }, regScoreImpact: 5, prereqs: [] },
      { code: 'ADAS-L3', name: 'ADAS Level 3', cost: 420000000, timeMonths: 18, risk: 0.35, featureImpact: { safety: 0.2 }, regScoreImpact: 10, prereqs: ['ADAS-L2'] },
    ],
  });

  await prisma.eventCard.createMany({
    data: [
      { code: 'chip_shortage', name: 'Chip Shortage', description: 'Global semiconductor crunch cuts supply 20%', effects: { production: 0.8 }, weight: 0.4 },
      { code: 'port_strike', name: 'Port Strike', description: 'Logistics slowdown adds 15 days to shipping', effects: { logisticsDelay: 15 }, weight: 0.2 },
      { code: 'ncap_downgrade', name: 'NCAP Downgrade', description: 'Safety downgrade hits CSI', effects: { csi: -5 }, weight: 0.15 },
    ],
  });

  await prisma.simConfig.create({
    data: {
      name: 'default',
      rules: {
        availabilitySigmoid: { mid: 60, steepness: 0.05 },
        elasticityBySegment: { 'SUV-C': 1.2, PICKUP: 0.9 },
        baseSegmentDemand: { 'SUV-C': 24000, PICKUP: 18000 },
        macroWeights: { gdp: 0.4, interest: -0.5, fuel: 0.25 },
        logisticCostPerUnit: 650,
        campaignLiftScalar: 0.00015,
        warranty: { complexityBase: 1.05, powertrainComplexity: { bev: 1.3, phev: 1.2, hev: 1.1, ice: 1.0 } },
        co2: { finePerGram: 50 },
      },
    },
  });

  const trimsFinal = await prisma.trim.findMany();
  const dealers = await prisma.dealer.findMany();
  for (const dealer of dealers) {
    for (const trim of trimsFinal) {
      await prisma.pricing.create({
        data: {
          trimId: trim.id,
          marketId: dealer.marketId,
          msrp: trim.msrp,
          incentivePerUnit: 500,
          aprSubvent: 0.02,
          leaseMF: 0.0015,
          residualPct: 0.55,
        },
      });
    }
  }

  console.log('Seeded core datasets');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
