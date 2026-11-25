# Lay-Time demo dataset

A realistic, internally consistent dataset for **all 23 tables** of the Lay-Time database
(the SRS lists 20; negotiation threads, negotiation messages and audit logs were added later).
Everything is generated with the project's own calculation engines, so the stored numbers equal what the app computes live.

## Files
| File | Purpose |
|---|---|
| `laytime_dataset.sql` | Schema + all data, inserted in foreign-key order. Loadable with the `sqlite3` CLI or the loader script. |
| `load-dataset.js` | Copy to `scripts/`. Rebuilds the database, checks foreign keys, prints row counts. |
| `generator/` | `generate_dataset.mjs` + engine copies. Regenerates the SQL for any date (see "Regenerate"). |

## Load it
```bash
# from the Lay-Time repo root
cp <this folder>/laytime_dataset.sql .
cp <this folder>/load-dataset.js scripts/
node scripts/load-dataset.js           # or: sqlite3 data/laytime.db < laytime_dataset.sql
npm run dev
```
`DATABASE_PATH` is honoured if set. The app only seeds itself when the users table is empty, so this data is never overwritten.

## Demo logins (all use the same demo password: `Demo@12345`)
| Role | Email | What to try |
|---|---|---|
| Admin | admin@laytime.demo | Users, settings, delete, everything |
| Supervisor | supervisor@laytime.demo | Overrides, RAC authorise/close, confirm settlements |
| Claim Processor | processor1@laytime.demo / processor2@laytime.demo | Sees only own claims (22 / 20) |
| Reviewer | reviewer@laytime.demo | Read-only (edits return 403) |
| Finance | finance@laytime.demo | Invoices and payments |
| Client | client1@laytime.demo … client6@laytime.demo | Own-company claims only (client1 sees 8), negotiation portal |

Change the password before any shared deployment.

## What is in each table (and which function it exercises)
| # | Table | Rows |
|---|---|---|
| 1 | clients | 6 |
| 2 | users | 12 |
| 3 | claims | 42 |
| 4 | ports | 46 |
| 5 | berths | 47 |
| 6 | statement_of_facts | 334 |
| 7 | deductions | 4 |
| 8 | laytime_calculations | 42 |
| 9 | owner_comparisons | 20 |
| 10 | documents | 225 |
| 11 | document_revisions | 2 |
| 12 | discrepancies | 11 |
| 13 | notifications | 58 |
| 14 | email_followups | 46 |
| 15 | incoming_emails | 14 |
| 16 | oil_chem_calculations | 8 |
| 17 | timesheet_imports | 4 |
| 18 | business_rules | 3 |
| 19 | rac_cases | 10 |
| 20 | rac_calculations | 10 |
| 21 | rac_status_history | 22 |
| 22 | negotiation_threads | 10 |
| 23 | negotiation_messages | 27 |
| 24 | audit_logs | 166 |

| Function | Data that exercises it |
|---|---|
| Login / RBAC / ownership scoping | 12 users across 6 roles, 6 clients, claims split between 2 processors |
| Claims ledger, filters, CSV, dashboard | 42 claims, 14 different statuses, 6 clients, dry-bulk and tanker voyages, amounts USD 4k – 74k |
| Multi-port / multi-berth / prorata | CLM-002 (2 berths at one port), CLM-003 (load + discharge port, combined) and several routine claims with two ports |
| SoF, deductions, laytime engine | 334 SoF events: rain, equipment breakdown, shifting, waiting for berth (counted and excluded), NOR notice time, Sunday/holiday deduction records |
| Demurrage, despatch, nil | demurrage (most), despatch (CLM-004), within laytime (CLM-005, CLM-031) |
| Timebar alarms | Normal, Approaching (CLM-007), Critical (CLM-006), Expired/timebarred (CLM-008) |
| Chasers | 30/60/90-day reminders sent or scheduled, 120-day legal escalation (CLM-009) |
| Documents, versions, OCR | SoF OCR completed / failed / low-confidence, v1.0 and v1.1 revisions, missing charter party (CLM-013) |
| Discrepancy detection | CLM-013: missing berth, impossible duration, low OCR confidence, invalid sequence, duplicate, start-after-stop; some resolved |
| Owner vs internal comparison | 20 comparisons with hour and amount variances and clause explanations |
| Oil and chemical pumping warranty | 3 claim-linked tankers (crude, gasoil, methanol) + 2 standalone calculator results |
| Timesheet import | 4 imports, 3 approved, 1 pending |
| RAC module | 10 cases, all 6 statuses and all 7 types, calculations via the RAC engine, status history in valid order, one standalone case |
| Negotiations | open + pending counter-offer, accepted awaiting supervisor, supervisor-confirmed settlement (claim becomes Settled) |
| Notifications, inbound e-mail, audit trail | 58 notifications (read/unread), 14 inbound mails, 166 audit entries in time order |
| Settings | `laytime_defaults`, `timebar_rules`, `chaser_schedule` |

## Scenario guide (first 21 claims)
| Claim | Status | Client | Assigned | Demonstrates |
|---|---|---|---|---|
| CLM-2026-001 | 6. Waiting Charterers Response | Sokana Resources Pte Ltd | Rohan Patil | Rain and shiploader stoppages deducted per Clause 7. |
| CLM-2026-002 | 8. Disputed | Eastport Commodities LLC | Sneha Joshi | Multi-berth prorata. Charterer disputes shifting time. |
| CLM-2026-003 | 5. Claim Filed | Meridian Grain Trading SA | Rohan Patil | Reversible laytime across load and discharge port (combined). Sunday holiday deducted (SHEX). |
| CLM-2026-004 | 7. Agreed | Sokana Resources Pte Ltd | Sneha Joshi | Early completion - despatch earned at half demurrage rate. |
| CLM-2026-005 | 2. Nil Demurrage (No Claim) | Norstar Shipping AS | Rohan Patil | Within laytime - no demurrage due. |
| CLM-2026-006 | 4. Calculation Sent to Owners | Eastport Commodities LLC | Rohan Patil | Notice served late in window - CRITICAL timebar alarm. |
| CLM-2026-007 | 6. Waiting Charterers Response | Peregrine Tankers Ltd | Sneha Joshi | Notice and claim both in APPROACHING range. |
| CLM-2026-008 | Timebarred | Norstar Shipping AS | Rohan Patil | Notice served 41 days after voyage end - claim is timebarred. |
| CLM-2026-009 | 9. Legal | Meridian Grain Trading SA | Sneha Joshi | Unpaid after 120-day chaser. Escalated to legal. |
| CLM-2026-010 | 10. Claim Closed | Peregrine Tankers Ltd | Rohan Patil | Agreed and fully paid. |
| CLM-2026-011 | 11. Commercial Write Off | Eastport Commodities LLC | Sneha Joshi | Commercially settled at a discount; balance written off. |
| CLM-2026-012 | 3. Pending Info from Owners | Aurora Energy Trading DMCC | Rohan Patil | Waiting for owners to send laytime statement and SoF. |
| CLM-2026-013 | Incomplete | Aurora Energy Trading DMCC | Sneha Joshi | Messy OCR SoF with low confidence rows; charter party missing. |
| CLM-2026-014 | Review | Sokana Resources Pte Ltd | Rohan Patil | Supervisor applied manual override after clause review. |
| CLM-2026-015 | 6. Waiting Charterers Response | Sokana Resources Pte Ltd | Rohan Patil | Client negotiating - counter-offer pending. |
| CLM-2026-016 | Settled | Eastport Commodities LLC | Sneha Joshi | Settlement confirmed by supervisor. |
| CLM-2026-017 | 7. Agreed | Peregrine Tankers Ltd | Rohan Patil | Offer accepted by processor; awaiting supervisor confirmation. |
| CLM-2026-018 | 6. Waiting Charterers Response | Norstar Shipping AS | Sneha Joshi | Rebill of owners demurrage to receivers. |
| CLM-2026-019 | 5. Claim Filed | Aurora Energy Trading DMCC | Rohan Patil | Contract of affreightment shipment 3 of 6. |
| CLM-2026-020 | 8. Disputed | Peregrine Tankers Ltd | Sneha Joshi | Pumping warranty contention - backpressure at manifold. |
| CLM-2026-021 | 6. Waiting Charterers Response | Aurora Energy Trading DMCC | Sneha Joshi | Clean products loading with pumping warranty audit. |

CLM-022 is a chemical-tanker claim; CLM-023 onward are 20 routine claims (dry bulk and tankers, mixed statuses) that give the ledger and dashboards depth.

## Insertion order (why it never violates a foreign key)
clients → users (parents before children) → claims → ports → berths → statement_of_facts → deductions → laytime_calculations →
owner_comparisons → documents → document_revisions → discrepancies → notifications → email_followups → incoming_emails →
oil_chem_calculations → timesheet_imports → business_rules → rac_cases → rac_calculations → rac_status_history →
negotiation_threads → negotiation_messages → audit_logs.

## How it was verified
- Loaded with foreign keys enforced: `PRAGMA foreign_key_check` returns nothing; integrity check is `ok`.
- No dates in the future; every SoF event lies inside its claim; SoF port/berth always match.
- The app was started on this data and all 7 roles logged in. For all 42 claims the live `/api/claims/<id>/calculations` result matches the stored calculation exactly (net minutes, demurrage and final payable).
- Verification run used a SQLite stand-in for `better-sqlite3` in a sandbox, so re-run `npm run dev` on your machine as a final check.

## Important: one app bug this dataset exposed
`getDeductionsForClaim()` returned raw snake_case rows (`deduction_hours`), but the engine reads `deductionHours`, so rows in the `deductions` table were ignored (4 claims affected: CLM-003, 010, 019, 021). The included `laytime_fixes.patch` maps the columns correctly. Without that patch those four claims show 10 h more net laytime than the stored value.

## Regenerate (fresh dates)
Timebar alarms depend on dates relative to "today". To re-date the data:
```bash
cd generator
LAYTIME_REPO=/path/to/Lay-Time node --experimental-strip-types generate_dataset.mjs 2026-11-21
# writes laytime_dataset.sql; use any YYYY-MM-DD; DEMO_PASSWORD=... sets the demo password
```
Requires Node 22+ and `bcryptjs` (found in the repo's `node_modules`). The generator is deterministic: the same date gives the same data.
-- Lay-Time realistic demo dataset (generated 2026-11-21). Schema + data in foreign-key order.
-- Demo login password for all demo users: see README_DATASET.md