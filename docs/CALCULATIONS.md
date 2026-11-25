# Comprehensive Calculation Engine Documentation

This document catalogs every mathematical formula, business calculation, and aggregation rule implemented across the codebase.

---

## 1. Master Calculation Catalog Table

| Calculation Name | Mathematical Formula | Key Inputs | Output Unit | Source Code File | Used Where |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gross Elapsed Time** | $$\Delta T = \text{round}\left(\frac{T_{\text{stop}} - T_{\text{start}}}{60000}\right)$$ | ISO Start/Stop Timestamps | Minutes (Integer) | [lib/calculations/deductions.ts](file:///C:/Lay%20time/lib/calculations/deductions.ts) (`calculateGrossMinutes`) | Statement of Facts timeline, Berth calculations |
| **Activity Counted Laytime** | $$M_{\text{counted}} = \text{round}\left(M_{\text{gross}} \times \frac{P_{\text{count}}}{100} \times \frac{\text{Prorata}}{100}\right)$$ | Gross Minutes, % Counted, Prorata % | Minutes (Integer) | [lib/calculations/deductions.ts](file:///C:/Lay%20time/lib/calculations/deductions.ts) (`calculateActivityDeduction`) | SoF events, deduction logging |
| **Activity Deduction** | $$M_{\text{deducted}} = M_{\text{gross}} - M_{\text{counted}}$$ | Gross Minutes, Counted Minutes | Minutes (Integer) | [lib/calculations/deductions.ts](file:///C:/Lay%20time/lib/calculations/deductions.ts) | Deduction breakdown by category |
| **Berth Allowed Laytime** | $$M_{\text{allowed}} = \text{round}\left(\frac{\text{Cargo Quantity}}{\text{Load Rate}} \times 1440\right)$$ | Quantity (MT), Load Rate (MT/Day) | Minutes (Integer) | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) (`calculateBerthLaytime`) | Port & Berth laytime tabs |
| **Net Laytime Used** | $$M_{\text{net}} = \sum M_{\text{counted}}$$ | Sum of all counted activity minutes | Minutes (Integer) | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) | Berth, Port, and Claim Laytime |
| **Time Exceeded (Demurrage Time)** | $$M_{\text{exceeded}} = \max(0, M_{\text{net}} - M_{\text{allowed}})$$ | Net Used Minutes, Allowed Minutes | Minutes (Integer) | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) | Demurrage calculation |
| **Time Saved (Despatch Time)** | $$M_{\text{saved}} = \max(0, M_{\text{allowed}} - M_{\text{net}})$$ | Allowed Minutes, Net Used Minutes | Minutes (Integer) | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) | Despatch calculation |
| **Demurrage Rate Per Minute** | $$R_{\text{min}} = \frac{\text{Demurrage Rate/Day}}{1440}$$ | Daily Demurrage Rate ($/day) | USD / Minute | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) | Financial calculations |
| **Demurrage Incurred ($)** | $$\$_{\text{demurrage}} = \text{round}(M_{\text{exceeded}} \times R_{\text{min}} \times 100) / 100$$ | Exceeded Minutes, Rate/Min | USD ($) | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) | Claim financial settlement |
| **Despatch Earned ($)** | $$\$_{\text{despatch}} = \text{round}\left(M_{\text{saved}} \times \frac{R_{\text{min}}}{2} \times 100\right) / 100$$ | Saved Minutes, Rate/Min (50%) | USD ($) | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) | Despatch credits |
| **Final Payable Demurrage** | $$\$_{\text{final}} = \max(0, \$_{\text{demurrage}} - \$_{\text{despatch}})$$ | Total Demurrage, Total Despatch | USD ($) | [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) | Claim Overview, PDF Reports |
| **Notice Timebar Deadline** | $$T_{\text{notice\_dl}} = T_{\text{voyage\_end}} + (D_{\text{notice}} \times 86400000)$$ | Voyage End Date, Notice Limit Days | Date String | [lib/calculations/timebar.ts](file:///C:/Lay%20time/lib/calculations/timebar.ts) | Timebar monitor |
| **Claim Timebar Deadline** | $$T_{\text{claim\_dl}} = T_{\text{voyage\_end}} + (D_{\text{claim}} \times 86400000)$$ | Voyage End Date, Claim Limit Days | Date String | [lib/calculations/timebar.ts](file:///C:/Lay%20time/lib/calculations/timebar.ts) | Timebar monitor |
| **Timebar Days Remaining** | $$D_{\text{rem}} = \text{round}\left(\frac{T_{\text{deadline}} - T_{\text{submitted}}}{86400000}\right)$$ | Deadline Timestamp, Submitted Date | Days (Integer) | [lib/calculations/timebar.ts](file:///C:/Lay%20time/lib/calculations/timebar.ts) | Countdown badges |
| **ASTM 54B VCF Factor** | $$\text{VCF} = 1 - 0.00065 \times (\text{Temp} - 15.0)$$ | Temperature (°C), Alpha coefficient | Ratio | [lib/calculations/oilChem.ts](file:///C:/Lay%20time/lib/calculations/oilChem.ts) | Oil & Chemical calculator |
| **Corrected Cargo Volume** | $$V = \frac{\text{Quantity} \times \text{VCF}}{\text{Density}_{15\text{C}}}$$ | Quantity (MT), VCF, Density | Cubic Meters ($m^3$) | [lib/calculations/oilChem.ts](file:///C:/Lay%20time/lib/calculations/oilChem.ts) | Oil & Chemical calculator |
| **Allowed Pumping Hours** | $$H_{\text{pump\_allowed}} = \frac{V}{\text{Warranty Rate}} + \text{COW} + \text{Manifold}$$ | Volume ($m^3$), Warranty Rate, Allowances | Hours (Float) | [lib/calculations/oilChem.ts](file:///C:/Lay%20time/lib/calculations/oilChem.ts) | Tanker Pumping Warranty tab |
| **Excess Pumping Demurrage** | $$\$_{\text{pump\_dem}} = \max(0, H_{\text{actual}} - H_{\text{allowed}}) \times \text{Hourly Rate}$$ | Actual Hours, Allowed Hours, Rate | USD ($) | [lib/calculations/oilChem.ts](file:///C:/Lay%20time/lib/calculations/oilChem.ts) | Pumping dispute settlement |
| **RAC Itemized Gross** | $$\text{Gross}_{\text{RAC}} = \sum (\text{UnitCost} \times \text{Qty} \times (1 - \text{Deductible}\%))$$ | Array of cost categories | USD ($) | [lib/rac/calculations.ts](file:///C:/Lay%20time/lib/rac/calculations.ts) | RAC Review Engine |
| **RAC Grace Allowance** | $$\text{GraceDeduction} = H_{\text{grace}} \times \left(\frac{\text{DailyRate}}{24}\right)$$ | Grace Hours, Daily Rate | USD ($) | [lib/rac/calculations.ts](file:///C:/Lay%20time/lib/rac/calculations.ts) | RAC Review Engine |
| **RAC Final Claim** | $$\text{Result} = (\text{Subtotal} + \text{VAT} - \text{Deductibles}) \times \text{Prorata}$$ | Subtotal, VAT %, Adjustments | USD ($) | [lib/rac/calculations.ts](file:///C:/Lay%20time/lib/rac/calculations.ts) | RAC Settlement Case |
| **Total Exposure ($)** | $$\text{Exposure} = \sum (\text{Filed Amount} - \text{Payment Received})$$ | Array of claims | USD ($) | [lib/mock/aggregate.ts](file:///C:/Lay%20time/lib/mock/aggregate.ts) | Dashboard KPI cards |
| **Amount Under Contention** | $$\text{Contention} = \sum \text{Filed Amount for Status 'Disputed'}$$| Array of claims | USD ($) | [lib/mock/aggregate.ts](file:///C:/Lay%20time/lib/mock/aggregate.ts) | Dashboard KPI cards |
| **Average Processing Time** | $$\text{AvgDays} = \text{round}\left(\frac{\sum \text{Days Open}}{\text{Count of Claims}}\right)$$ | Array of claims | Days (Integer) | [lib/mock/aggregate.ts](file:///C:/Lay%20time/lib/mock/aggregate.ts) | Dashboard KPI cards |

---

## 2. Deduction Records and SoF Non-Duplication Rule

To prevent double-counting of deductions when both Statement of Facts (SoF) events and dedicated deduction records are present:

1. **Activity Deductions**:
   Each SoF activity deducts time based on its percentage counted and prorata:
   $$M_{\text{deducted, act}} = M_{\text{gross}} \times \left(1 - \frac{\text{percentageCounted}}{100} \times \frac{\text{prorata}}{100}\right)$$

2. **Deduction Records Non-Duplication**:
   When a deduction record has explicit `startTime` and `stopTime`, it is evaluated against all overlapping SoF activities. If an overlapping SoF activity already has $\text{percentageCounted} < 100$, the minutes already deducted during the overlap window are calculated:
   $$M_{\text{overlap\_deducted}} = \sum_{\text{overlapping acts}} M_{\text{overlap}} \times \left(1 - \frac{\text{percentageCounted}}{100} \times \frac{\text{prorata}}{100}\right)$$
   The net deduction added by the deduction record is:
   $$M_{\text{deduction\_record\_net}} = \max\left(0, M_{\text{deduction\_record}} - M_{\text{overlap\_deducted}}\right)$$
   This guarantees that an event below 100% and a deduction record for the same time window never subtract twice.

---

## 3. Port-Level and Claim-Level Agreement Rule

To ensure financial and temporal integrity, minutes and money must always originate from the same single source of truth:

1. **Allowed Laytime Agreement**:
   $$\sum_{p \in \text{ports}} M_{\text{allowed, } p} = M_{\text{allowed, claim}}$$
2. **Net Laytime Agreement**:
   $$\sum_{p \in \text{ports}} M_{\text{net, } p} = M_{\text{net, claim}}$$
3. **Financial Demurrage Agreement**:
   $$\sum_{p \in \text{ports}} \$_{\text{demurrage, } p} = \$_{\text{demurrage, claim}}$$
4. **Financial Despatch Agreement**:
   $$\sum_{p \in \text{ports}} \$_{\text{despatch, } p} = \$_{\text{despatch, claim}}$$
5. **Rate Consistency**:
   Demurrage rate per minute $R_{\text{min}} = \frac{\text{Rate/Day}}{1440}$ is uniformly applied across all levels, ensuring that port-level totals and claim-level totals agree exactly.

