# Timebar Compliance & Monitoring Engine

This document provides complete documentation of the **Time-Bar Monitor** module ([app/timebar/page.tsx](file:///C:/Lay%20time/app/timebar/page.tsx)) and calculation function ([lib/calculations/timebar.ts](file:///C:/Lay%20time/lib/calculations/timebar.ts)).

---

## 1. Maritime Business Context & Legal Purpose

In commercial shipping, charter parties incorporate strict **Timebar Clauses** (e.g. BPVOY4 Clause 20, SHELLVOY6 Clause 22, ASBATANKVOY Clause 19). These clauses mandate that:
1. **Notice of Claim**: The shipowner or charterer must tender written notice of their intent to file a demurrage claim within a set number of days (typically **30 days**) following completion of discharge / voyage end.
2. **Formal Claim Presentation**: The complete claim documentation package (signed Statement of Facts, pumping logs, notice of readiness, charter party, and detailed calculation) must be formally submitted within an agreed window (typically **90 days**).

> [!CAUTION]
> **Extinguishment of Claim**: Under English Maritime Law and international arbitration precedents, failure to tender either notice or the full claim package prior to the expiration of the deadline **completely invalidates and legally extinguishes the claim**, reducing recoverable sums to **$0**, regardless of the operational merits.

---

## 2. Calculation Logic & Alarm Levels

The evaluation function `calculateTimebarCompliance(claim, assumptions)` in [lib/calculations/timebar.ts](file:///C:/Lay%20time/lib/calculations/timebar.ts) executes the following sequence:

### 1. Base Anchor Timestamp
The baseline date $T_{\text{base}}$ is determined using the first valid date from:
$$T_{\text{base}} = \text{claim.voyageEndDate} \parallel \text{claim.layday} \parallel \text{claim.charterpartyDate}$$

### 2. Notice Deadline Calculation
$$T_{\text{notice\_deadline}} = T_{\text{base}} + (\text{claim.noticeTimebarDays} \times 86,400,000\text{ ms})$$

$$\text{Days Remaining}_{\text{notice}} = \text{round}\left(\frac{T_{\text{notice\_deadline}} - T_{\text{notice\_submitted}}}{86,400,000}\right)$$

### 3. Claim Deadline Calculation
$$T_{\text{claim\_deadline}} = T_{\text{base}} + (\text{claim.claimTimebarDays} \times 86,400,000\text{ ms})$$

$$\text{Days Remaining}_{\text{claim}} = \text{round}\left(\frac{T_{\text{claim\_deadline}} - T_{\text{claim\_submitted}}}{86,400,000}\right)$$

### 4. Categorical Alarm Thresholds

| Alarm Level | Notice Criteria | Claim Criteria | Visual Indicator | Status Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Normal** | $> 14$ days remaining | $> 25$ days remaining | 🟢 Green Badge | Comfortable compliance window |
| **Approaching** | $6 - 14$ days remaining | $11 - 25$ days remaining | 🟡 Amber Badge | Upcoming deadline; documents required |
| **Critical** | $1 - 5$ days remaining | $1 - 10$ days remaining | 🔴 Red Pulsing Badge | Urgent priority; immediate filing needed |
| **Expired** | $\le 0$ days remaining or late | $\le 0$ days remaining or late | ⬛ Dark Red / Black | **Timebarred: Claim forfeited** |

---

## 3. Impact on Claim Ledger & Settlements

1. **`timebarred` State Flag**: If either Notice or Claim submission deadline is exceeded, `isTimebarred = true`.
2. **Notification Trigger**: System automatically registers an alert record in the `notifications` table (`Time-Bar Approaching` or `Claim Timebarred`).
3. **Ledger Visuals**: In the Claims Ledger ([app/claims/page.tsx](file:///C:/Lay%20time/app/claims/page.tsx)) and Overview Tab, the status is highlighted in bold red font: **Timebarred (Expired)**, and financial settlement actions are blocked.
4. **Summary Explanation Generation**: The engine automatically crafts a legal audit statement:
   - *"Both Notice and Claim submission are timebarred."*
   - *"Notice of Claim submitted late by X days."*
   - *"Formal Claim submission exceeded C/P timebar by X days."*
   - *"Claim submitted within allowed C/P timebars."*
