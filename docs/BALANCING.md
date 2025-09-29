# Balancing & Tuning Guide

The `SimConfig.rules` JSON stores coefficients surfaced here for quick tuning. Modify the Prisma seed or admin UI (future) to adjust.

## Demand
- `availabilitySigmoid.mid`: Days-supply midpoint where availability factor equals ~0.7. Lower it for more aggressive stocking penalties.
- `availabilitySigmoid.steepness`: Sharpness of the sigmoid. Increase for harsher swings.
- `elasticityBySegment`: Price sensitivity (0.6–1.4). Higher numbers mean incentives materially lift demand.
- `campaignLiftScalar`: Converts marketing spend to demand lift. Default `0.00015` ≈ +1.5% per $1M.

## Macro Weights
- `macroWeights.gdp`: GDP index sensitivity (positive).
- `macroWeights.interest`: Interest rate penalty (negative).
- `macroWeights.fuel`: Fuel price impact (positive for efficient vehicles).

## Manufacturing
- `logisticCostPerUnit`: Included in margin calculation, representing freight + port costs.
- Plant `bottlenecks`: Units-per-month per station. The engine takes the minimum after changeover loss.
- `changeoverMins`: Larger changeovers reduce throughput when mix is volatile.

## Warranty
- `warranty.baseRate`: Baseline accrual in dollars per unit.
- `warranty.complexityBase`: Scalar added per feature count.
- `warranty.powertrainComplexity`: Multipliers by powertrain type.

## CO₂
- `co2.finePerGram`: Penalty for each gram over target. Combine with `co2Gap` output for fines/credits.

### Difficulty Nudges
- Increase `boardExpectations` cash/EBITDA targets in the save payload.
- Adjust scenario JSON weights to spawn more negative events.
- Modify `brandAffinity` or macro indices per market to simulate economic shocks.
