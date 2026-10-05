# Laytime & Demurrage Calculation Mechanics

This document provides an in-depth mathematical walkthrough of how laytime, allowable deductions, and financial demurrage are evaluated.

---

## 1. Mathematical Formulas & Variables

### 1. Allowed Laytime ($M_{\text{allowed}}$)
Allowed laytime is the contractual time window granted to the charterer to complete cargo handling operations without incurring additional fees.

$$M_{\text{allowed}} = \text{round}\left(\frac{\text{Cargo Quantity (MT)}}{\text{Contractual Handling Rate (MT/Day)}} \times 1440\right)$$

- **Cargo Quantity**: Total metric tons loaded or discharged at the berth.
- **Handling Rate**: Agreed rate per weather working day of 24 consecutive hours (WWD 24 CH).
- **1440**: Conversion multiplier (24 hours × 60 minutes).

---

### 2. Statement of Facts (SoF) Event Accounting
For each logged operational event $i$:

$$M_{\text{gross}, i} = \text{round}\left(\frac{T_{\text{stop}, i} - T_{\text{start}, i}}{60000}\right)$$

$$M_{\text{counted}, i} = \text{round}\left(M_{\text{gross}, i} \times \frac{P_{\text{count}, i}}{100} \times \frac{\text{Prorata}_i}{100}\right)$$

$$M_{\text{deducted}, i} = M_{\text{gross}, i} - M_{\text{counted}, i}$$

- $P_{\text{count}, i}$: Percentage of the duration counted against laytime (e.g. 100% for active discharge; 0% for breakdown or strike).
- $\text{Prorata}_i$: Allocation share when vessel handles cargo for multiple receivers simultaneously (default 100%).

---

### 3. Net Laytime Used & Time Exceeded / Saved
Summing across all logged activities:

$$M_{\text{net}} = \sum_{i} M_{\text{counted}, i}$$

$$\text{Time Exceeded (Demurrage Minutes)}: M_{\text{exceeded}} = \max(0, M_{\text{net}} - M_{\text{allowed}})$$

$$\text{Time Saved (Despatch Minutes)}: M_{\text{saved}} = \max(0, M_{\text{allowed}} - M_{\text{net}})$$

---

### 4. Financial Valuation
The demurrage rate is pro-rated to an exact per-minute monetary value:

$$R_{\text{min}} = \frac{\text{Demurrage Rate Per Day (\$/day)}}{1440}$$

$$\text{Demurrage Incurred (\$)} = \text{round}(M_{\text{exceeded}} \times R_{\text{min}} \times 100) / 100$$

$$\text{Despatch Earned (\$)} = \text{round}\left(M_{\text{saved}} \times \frac{R_{\text{min}}}{2} \times 100\right) / 100$$

$$\text{Final Payable Amount (\$)} = \max(0, \text{Demurrage Incurred} - \text{Despatch Earned})$$

---

## 2. Step-by-Step Worked Example (DEMO / SAMPLE DATA)

Consider synthetic claim **`CLM-2024-001` (MV Ocean Titan)**:

### Parameters:
- **Contractual Demurrage Rate**: $32,000 / day
- **Rate per Minute ($R_{\text{min}}$)**: $\frac{\$32,000}{1440} = \$22.2222... \text{/ minute}$
- **Cargo Quantity**: 65,000 Metric Tons
- **Discharge Rate**: 45,000 MT / Day
- **Prorata Share**: 100%

### Step 1: Compute Allowed Laytime
$$M_{\text{allowed}} = \text{round}\left(\frac{65,000}{45,000} \times 1440\right) = \text{round}(1.4444... \times 1440) = 2,080 \text{ minutes (1d 10h 40m)}$$

### Step 2: Operational Activities Logged (SoF)
1. **Activity 1 — Discharging Commenced (Normal Ops)**:
   - Duration: 1,800 minutes (30 hours)
   - Percentage Counted: 100%
   - $M_{\text{counted}} = 1,800 \times 1.0 = 1,800 \text{ min}$
2. **Activity 2 — Rain Delay / Weather Interruption**:
   - Duration: 360 minutes (6 hours)
   - Deduction Category: `Weather Delay`
   - Percentage Counted: 0%
   - $M_{\text{counted}} = 360 \times 0.0 = 0 \text{ min}$ (360 min deducted)
3. **Activity 3 — Discharge Continued (Normal Ops)**:
   - Duration: 1,500 minutes (25 hours)
   - Percentage Counted: 100%
   - $M_{\text{counted}} = 1,500 \times 1.0 = 1,500 \text{ min}$

### Step 3: Compute Net Laytime Used
$$\text{Gross Time Elapsed} = 1,800 + 360 + 1,500 = 3,660 \text{ minutes}$$
$$\text{Total Deductions} = 360 \text{ minutes}$$
$$\text{Net Laytime Used } (M_{\text{net}}) = 1,800 + 0 + 1,500 = 3,300 \text{ minutes (2d 07h 00m)}$$

### Step 4: Compute Exceeded Laytime (Demurrage)
$$M_{\text{exceeded}} = M_{\text{net}} - M_{\text{allowed}} = 3,300 - 2,080 = 1,220 \text{ minutes (0d 20h 20m)}$$

### Step 5: Financial Settlement
$$\text{Demurrage Amount} = 1,220 \times \$22.2222... = \$27,111.11 \text{ USD}$$
$$\text{Despatch Amount} = \$0.00 \text{ USD}$$
$$\mathbf{Final\ Payable\ Claim\ Amount} = \mathbf{\$27,111.11\ USD}$$

---

## 3. Edge Cases & Validation Rules

1. **Zero Handling Rate**: If `loadRate <= 0` or missing, system falls back to 1 allowable day (1440 minutes) to avoid division-by-zero runtime crashes.
2. **Negative Elapsed Time**: If an entered event has `stopTime <= startTime`, `calculateGrossMinutes()` returns 0 and `detectDiscrepancies()` flags an error.
3. **Clamping**: Percentage counted and prorata factors are strictly bounded to `[0, 100]`.
4. **Despatch Rate Assumption**: In accordance with standard worldwide charter party practices (unless overridden), despatch is computed at exactly 50% of the demurrage daily rate.
