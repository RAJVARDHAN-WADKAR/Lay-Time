export const SCHEMA_SQL = `
-- =========================================================
-- LAYTIME & DEMURRAGE CALCULATION SYSTEM DATABASE SCHEMA
-- =========================================================

PRAGMA foreign_keys = ON;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Admin', 'Claim Processor', 'Supervisor', 'Reviewer')),
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
  role_description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  claim_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  broker_name TEXT NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'Submitted',
  claim_type TEXT NOT NULL,
  ship_name TEXT NOT NULL,
  cp_type TEXT NOT NULL,
  voyage_number TEXT,
  assigned_to TEXT NOT NULL,
  days_open INTEGER NOT NULL DEFAULT 0,
  claim_closed INTEGER NOT NULL DEFAULT 0,
  contentions TEXT,
  claim_notes TEXT,
  document_links TEXT, -- JSON Array
  demurrage_rate_per_day REAL NOT NULL DEFAULT 0,
  counterparty_name TEXT,
  counterparty_type TEXT,
  claim_filed_amount REAL NOT NULL DEFAULT 0,
  received_claim_amount REAL DEFAULT 0,
  agreed_amount REAL DEFAULT 0,
  billable_amount REAL DEFAULT 0,
  payment_received REAL DEFAULT 0,
  payment_concluded INTEGER NOT NULL DEFAULT 0,
  layday TEXT,
  cancelling_date TEXT,
  voyage_end_date TEXT,
  instruction_received_date TEXT,
  notice_received_date TEXT,
  claim_received_date TEXT,
  notice_timebar_days INTEGER DEFAULT 30,
  claim_timebar_days INTEGER DEFAULT 90,
  timebarred INTEGER NOT NULL DEFAULT 0,
  claim_agreed_date TEXT,
  charterparty_date TEXT,
  days_awaiting_payment INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. PORTS TABLE
CREATE TABLE IF NOT EXISTS ports (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  name TEXT NOT NULL,
  port_type TEXT NOT NULL,
  load_rate REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 4. BERTHS TABLE
CREATE TABLE IF NOT EXISTS berths (
  id TEXT PRIMARY KEY,
  port_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  prorata_share REAL NOT NULL DEFAULT 100,
  is_prorata_overridden INTEGER NOT NULL DEFAULT 0,
  load_rate REAL NOT NULL DEFAULT 0,
  cargo_type TEXT,
  receiver_name TEXT,
  FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE
);

-- 5. STATEMENT OF FACTS (SOF EVENTS) TABLE
CREATE TABLE IF NOT EXISTS statement_of_facts (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  port_id TEXT,
  berth_id TEXT,
  activity_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  stop_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  duration_formatted TEXT NOT NULL,
  percentage_counted REAL NOT NULL DEFAULT 100,
  prorata REAL NOT NULL DEFAULT 100,
  deduction_category TEXT NOT NULL DEFAULT 'Other',
  remarks TEXT,
  is_ocr_extracted INTEGER NOT NULL DEFAULT 0,
  is_corrected INTEGER NOT NULL DEFAULT 0,
  ocr_confidence REAL DEFAULT 1.0,
  original_ocr_values TEXT, -- JSON
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 6. DEDUCTIONS TABLE
CREATE TABLE IF NOT EXISTS deductions (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  type TEXT NOT NULL,
  start_time TEXT NOT NULL,
  stop_time TEXT NOT NULL,
  percentage_time REAL NOT NULL DEFAULT 100,
  prorata REAL NOT NULL DEFAULT 100,
  deduction_hours REAL NOT NULL DEFAULT 0,
  remarks TEXT,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 7. LAYTIME CALCULATIONS PERSISTENCE TABLE
CREATE TABLE IF NOT EXISTS laytime_calculations (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL UNIQUE,
  demurrage_rate_per_day REAL NOT NULL,
  total_gross_minutes INTEGER NOT NULL,
  total_deductions_minutes INTEGER NOT NULL,
  total_net_laytime_minutes INTEGER NOT NULL,
  total_allowed_minutes INTEGER NOT NULL,
  net_demurrage_minutes INTEGER NOT NULL,
  net_despatch_minutes INTEGER NOT NULL,
  calculated_demurrage_amount REAL NOT NULL,
  calculated_despatch_amount REAL NOT NULL,
  final_payable_amount REAL NOT NULL,
  port_calculations_json TEXT NOT NULL,
  timebar_compliance_json TEXT,
  assumptions_json TEXT,
  calculated_by TEXT,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 8. OWNER VS INTERNAL COMPARISON TABLE
CREATE TABLE IF NOT EXISTS owner_comparisons (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL UNIQUE,
  owner_demurrage_amount REAL NOT NULL DEFAULT 0,
  owner_laytime_hours REAL NOT NULL DEFAULT 0,
  internal_demurrage_amount REAL NOT NULL DEFAULT 0,
  internal_laytime_hours REAL NOT NULL DEFAULT 0,
  difference_amount REAL NOT NULL DEFAULT 0,
  difference_hours REAL NOT NULL DEFAULT 0,
  explanation TEXT,
  berth_comparisons_json TEXT,
  port_comparisons_json TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 9. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  claim_id TEXT,
  claim_name TEXT,
  rac_case_id TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  modified_by TEXT,
  modified_at TEXT,
  status TEXT NOT NULL DEFAULT 'Uploaded',
  ocr_confidence REAL DEFAULT 0,
  extracted_items_count INTEGER DEFAULT 0,
  error_reason TEXT,
  file_path TEXT
);

-- 10. DOCUMENT REVISIONS TABLE
CREATE TABLE IF NOT EXISTS document_revisions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  change_summary TEXT,
  file_path TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 11. DISCREPANCIES TABLE
CREATE TABLE IF NOT EXISTS discrepancies (
  id TEXT PRIMARY KEY,
  claim_id TEXT,
  rac_case_id TEXT,
  activity_id TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  field TEXT,
  current_value TEXT,
  suggested_value TEXT,
  is_resolved INTEGER NOT NULL DEFAULT 0,
  resolved_by TEXT,
  resolved_at TEXT
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  claim_id TEXT,
  claim_name TEXT,
  rac_case_id TEXT,
  rac_reference TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 13. EMAIL FOLLOWUPS & CLAIM CHASERS TABLE
CREATE TABLE IF NOT EXISTS email_followups (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  days_awaiting_payment INTEGER NOT NULL DEFAULT 0,
  scheduled_date TEXT NOT NULL,
  sent_at TEXT,
  sent_by TEXT,
  response_received INTEGER NOT NULL DEFAULT 0,
  response_notes TEXT,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 14. INCOMING EMAILS QUEUE TABLE
CREATE TABLE IF NOT EXISTS incoming_emails (
  id TEXT PRIMARY KEY,
  claim_id TEXT,
  rac_case_id TEXT,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  received_at TEXT NOT NULL,
  requires_response INTEGER NOT NULL DEFAULT 1,
  tag TEXT NOT NULL DEFAULT 'Pending Review',
  is_handled INTEGER NOT NULL DEFAULT 0,
  handled_by TEXT,
  handled_at TEXT,
  content TEXT NOT NULL
);

-- 15. OIL & CHEMICAL CALCULATIONS TABLE
CREATE TABLE IF NOT EXISTS oil_chem_calculations (
  id TEXT PRIMARY KEY,
  claim_id TEXT,
  cargo_name TEXT NOT NULL,
  cargo_type TEXT NOT NULL,
  quantity_metric_tons REAL NOT NULL DEFAULT 0,
  density_15c REAL NOT NULL DEFAULT 0.85,
  temperature_c REAL NOT NULL DEFAULT 25.0,
  vcf_factor REAL NOT NULL DEFAULT 1.0,
  corrected_quantity REAL NOT NULL DEFAULT 0,
  pumping_warranty_rate_m3h REAL NOT NULL DEFAULT 1000,
  pumping_warranty_pressure_bar REAL NOT NULL DEFAULT 7.0,
  cow_allowed_hours REAL NOT NULL DEFAULT 2.0,
  manifold_connection_hours REAL NOT NULL DEFAULT 1.0,
  actual_pumping_hours REAL NOT NULL DEFAULT 0,
  allowed_pumping_hours REAL NOT NULL DEFAULT 0,
  excess_pumping_hours REAL NOT NULL DEFAULT 0,
  excess_pumping_demurrage REAL NOT NULL DEFAULT 0,
  hourly_rate REAL NOT NULL DEFAULT 1500,
  notes TEXT,
  created_at TEXT NOT NULL
);

-- 16. TIMESHEET IMPORTS TABLE
CREATE TABLE IF NOT EXISTS timesheet_imports (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  parsed_rows_json TEXT NOT NULL,
  is_approved INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 17. BUSINESS RULES & SETTINGS TABLE
CREATE TABLE IF NOT EXISTS business_rules (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

-- =========================================================
-- RAC MODULE PERSISTENT TABLES
-- =========================================================

-- 18. RAC CASES TABLE
CREATE TABLE IF NOT EXISTS rac_cases (
  id TEXT PRIMARY KEY,
  rac_reference TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  ship_name TEXT NOT NULL,
  voyage_number TEXT,
  counterparty_name TEXT NOT NULL,
  rac_type TEXT NOT NULL,
  relevant_date TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Submitted', 'Under Review', 'Correction Required', 'Reviewed', 'Closed')),
  total_amount REAL NOT NULL DEFAULT 0,
  agreed_amount REAL NOT NULL DEFAULT 0,
  outstanding_amount REAL NOT NULL DEFAULT 0,
  deadline_date TEXT,
  description TEXT,
  notes TEXT,
  supporting_docs_count INTEGER DEFAULT 0,
  claim_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

-- 19. RAC CALCULATIONS TABLE
CREATE TABLE IF NOT EXISTS rac_calculations (
  id TEXT PRIMARY KEY,
  rac_case_id TEXT NOT NULL UNIQUE,
  rule_version TEXT NOT NULL DEFAULT '1.0',
  parameters_json TEXT NOT NULL,
  inputs_json TEXT NOT NULL,
  adjustments_json TEXT NOT NULL,
  calculated_result REAL NOT NULL DEFAULT 0,
  formula_breakdown_json TEXT NOT NULL,
  explanation TEXT,
  calculation_status TEXT NOT NULL DEFAULT 'Preliminary',
  reviewed_by TEXT,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (rac_case_id) REFERENCES rac_cases(id) ON DELETE CASCADE
);

-- 20. RAC STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS rac_status_history (
  id TEXT PRIMARY KEY,
  rac_case_id TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  remarks TEXT,
  FOREIGN KEY (rac_case_id) REFERENCES rac_cases(id) ON DELETE CASCADE
);

-- =========================================================
-- PERFORMANCE INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_claims_account ON claims(account_name);
CREATE INDEX IF NOT EXISTS idx_claims_ship ON claims(ship_name);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_claims_assigned ON claims(assigned_to);
CREATE INDEX IF NOT EXISTS idx_claims_created ON claims(created_at);

CREATE INDEX IF NOT EXISTS idx_ports_claim ON ports(claim_id);
CREATE INDEX IF NOT EXISTS idx_berths_port ON berths(port_id);
CREATE INDEX IF NOT EXISTS idx_sof_claim ON statement_of_facts(claim_id);
CREATE INDEX IF NOT EXISTS idx_deductions_claim ON deductions(claim_id);
CREATE INDEX IF NOT EXISTS idx_documents_claim ON documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_claim ON discrepancies(claim_id);

CREATE INDEX IF NOT EXISTS idx_rac_reference ON rac_cases(rac_reference);
CREATE INDEX IF NOT EXISTS idx_rac_client ON rac_cases(client_name);
CREATE INDEX IF NOT EXISTS idx_rac_status ON rac_cases(status);
CREATE INDEX IF NOT EXISTS idx_rac_assigned ON rac_cases(assigned_to);
`;
