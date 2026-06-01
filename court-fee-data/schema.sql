-- ============================================================
-- INDIAN COURT FEE CALCULATOR - PRODUCTION DATABASE SCHEMA
-- ============================================================
-- Compliance: Court Fees Act 1870 and state-wise amendments
-- Engine: SQLite / PostgreSQL compatible
-- ============================================================

-- 1. STATES
CREATE TABLE states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_name TEXT NOT NULL UNIQUE,
    state_code TEXT NOT NULL UNIQUE,
    act_name TEXT NOT NULL,
    act_year INTEGER NOT NULL,
    calc_type TEXT NOT NULL CHECK(calc_type IN ('slab','total_pct','fixed','percentage')),
    min_fee REAL NOT NULL DEFAULT 0,
    max_fee REAL,
    rounding_rule TEXT NOT NULL DEFAULT 'ceil' CHECK(rounding_rule IN ('ceil','floor','round')),
    effective_date TEXT NOT NULL,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_states_code ON states(state_code);
CREATE INDEX idx_states_active ON states(is_active);

-- 2. CASE TYPES
CREATE TABLE case_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_type_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('civil','criminal','family','commercial','constitutional','succession','consumer','corporate','rent','arbitration')),
    fee_type TEXT NOT NULL CHECK(fee_type IN ('slab','fixed','total_pct','percentage','flat_with_slab')),
    valuation_method TEXT NOT NULL,
    default_formula TEXT NOT NULL,
    slab_applicable INTEGER NOT NULL DEFAULT 0,
    market_value_required INTEGER NOT NULL DEFAULT 0,
    share_based INTEGER NOT NULL DEFAULT 0,
    annual_rent_based INTEGER NOT NULL DEFAULT 0,
    agreement_value_based INTEGER NOT NULL DEFAULT 0,
    fixed_fee_default REAL NOT NULL DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_case_types_category ON case_types(category);
CREATE INDEX idx_case_types_active ON case_types(is_active);

-- 3. FEE RULES (master link between state + case type)
CREATE TABLE fee_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id INTEGER NOT NULL REFERENCES states(id),
    case_type_id INTEGER NOT NULL REFERENCES case_types(id),
    fee_type TEXT NOT NULL CHECK(fee_type IN ('slab','fixed','total_pct','percentage','flat_with_slab','certificate')),
    minimum_fee REAL,
    maximum_fee REAL,
    valuation_formula TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    effective_from TEXT,
    effective_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(state_id, case_type_id, fee_type)
);
CREATE INDEX idx_fee_rules_state ON fee_rules(state_id);
CREATE INDEX idx_fee_rules_case ON fee_rules(case_type_id);
CREATE INDEX idx_fee_rules_active ON fee_rules(is_active);
CREATE INDEX idx_fee_rules_lookup ON fee_rules(state_id, case_type_id, is_active);

-- 4. FEE SLABS (detailed slab structure per rule)
CREATE TABLE fee_slabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fee_rule_id INTEGER NOT NULL REFERENCES fee_rules(id),
    slab_start REAL NOT NULL CHECK(slab_start >= 0),
    slab_end REAL NOT NULL CHECK(slab_end >= slab_start),
    percentage_rate REAL DEFAULT 0 CHECK(percentage_rate >= 0),
    fixed_component REAL DEFAULT 0 CHECK(fixed_component >= 0),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_fee_slabs_rule ON fee_slabs(fee_rule_id);
CREATE INDEX idx_fee_slabs_active ON fee_slabs(is_active);
CREATE INDEX idx_fee_slabs_order ON fee_slabs(fee_rule_id, sort_order);

-- 5. COMMERCIAL COURT RULES (Commercial Courts Act 2015)
CREATE TABLE commercial_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id INTEGER NOT NULL REFERENCES states(id),
    specified_value_threshold REAL NOT NULL DEFAULT 300000,
    include_principal INTEGER NOT NULL DEFAULT 1,
    include_interest INTEGER NOT NULL DEFAULT 1,
    include_damages INTEGER NOT NULL DEFAULT 1,
    include_penalty INTEGER NOT NULL DEFAULT 1,
    arbitration_section_9_fee REAL,
    arbitration_section_11_fee REAL,
    arbitration_section_34_fee REAL,
    arbitration_section_37_fee REAL,
    commercial_appeal_fee_type TEXT NOT NULL DEFAULT 'slab',
    commercial_appeal_same_as_original INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(state_id)
);
CREATE INDEX idx_commercial_state ON commercial_rules(state_id);

-- 6. VALUATION RULES
CREATE TABLE valuation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL UNIQUE,
    formula_expression TEXT NOT NULL,
    description TEXT,
    parameters_required TEXT, -- JSON array of parameter names
    example_calculation TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert standard valuation rules
INSERT INTO valuation_rules (rule_name, formula_expression, description, parameters_required, example_calculation) VALUES
('ad_valorem_progressive', 'Progressive slab calculation where each slab is calculated on the portion of value within that slab range', 'Standard ad valorem progressive fee calculation. Sum of (portion_in_slab * rate) across all applicable slabs.', '["suit_value","slabs"]', '₹1,00,000 in Delhi: ₹50,000*2% + ₹50,000*3% = ₹1,000 + ₹1,500 = ₹2,500'),
('total_percentage', 'Single percentage rate applied to total suit value based on bracket', 'Total percentage applied to entire claim amount. The rate is determined by which bracket the total falls into.', '["suit_value","slabs"]', '₹1,00,000 in UP: ₹1,00,000*6% = ₹6,000 (falls in ₹25,001-₹1,00,000 bracket at 6%)'),
('share_based_valuation', 'valuation = total_market_value * (plaintiff_share_numerator / plaintiff_share_denominator)', 'For partition suits. Fee is calculated on plaintiff''s share of the property, not total property value.', '["total_market_value","plaintiff_share_numerator","plaintiff_share_denominator"]', 'Property worth ₹50,00,000, plaintiff share 1/3: valuation = ₹16,66,667, fee calculated on that'),
('annual_rent_valuation', 'valuation = annual_rent * multiplier', 'For rent-related matters. Fee is valved on a multiple of annual rent.', '["annual_rent","multiplier"]', 'Annual rent ₹1,20,000, multiplier 10: valuation = ₹12,00,000'),
('agreement_value_valuation', 'valuation = agreement_value', 'For specific performance. Fee on the agreement/consideration value.', '["agreement_value"]', 'Agreement value ₹25,00,000: valuation = ₹25,00,000'),
('percentage_of_value', 'fee = value * percentage_rate / 100', 'For probate and succession certificate. Fee is a flat percentage of estate/debt value.', '["value","percentage_rate"]', 'Estate ₹10,00,000 at 2.5%: fee = ₹25,000'),
('flat_fee', 'fee = fixed_amount', 'Fixed fee irrespective of suit value. Used for divorce, bail, writ.', '["fixed_amount"]', 'Divorce: ₹150, Bail: ₹100, Writ: ₹500'),
('market_value_self_assessed', 'valuation = plaintiffs_estimate_of_market_value', 'For declaration/injunction suits. Plaintiff self-assesses market value for court fee purposes.', '["market_value"]', 'Self-assessed market value ₹20,00,000: fee calculated on that'),
('commercial_specified_value', 'specified_value = principal + interest + damages + penalties', 'For commercial suits under Commercial Courts Act 2015. Specified value includes all claims.', '["principal","interest","damages","penalties"]', 'Principal ₹25,00,000 + Interest ₹5,00,000: specified value = ₹30,00,000'),
('consumer_flat_with_slab', 'slab based on claim value under Consumer Protection Act 2019', 'Consumer complaint fee under CP Act 2019: up to ₹5L = ₹0, ₹5L-₹10L = ₹2000, ₹10L-₹50L = ₹5000, above ₹50L = ₹10000', '["claim_value"]', 'Claim ₹15,00,000: fee = ₹5,000 (₹10L-₹50L slab)');

-- 7. ROUNDING RULES
CREATE TABLE rounding_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id INTEGER NOT NULL REFERENCES states(id),
    method TEXT NOT NULL CHECK(method IN ('ceil','floor','round','ceil_to_10','ceil_to_5','floor_to_10')),
    apply_to_total INTEGER NOT NULL DEFAULT 1,
    apply_to_slabs INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(state_id)
);

-- Insert rounding rules for all states
INSERT INTO rounding_rules (state_id, method, apply_to_total, apply_to_slabs, notes) VALUES
(1, 'ceil', 1, 1, 'Delhi: Round up to nearest rupee'),
(2, 'ceil', 1, 1, 'Maharashtra: Round up to nearest rupee'),
(3, 'ceil', 1, 1, 'Karnataka: Round up to nearest rupee'),
(4, 'ceil', 1, 1, 'Tamil Nadu: Round up to nearest rupee'),
(5, 'ceil', 1, 1, 'Uttar Pradesh: Round up to nearest rupee'),
(6, 'ceil', 1, 1, 'Kerala: Round up to nearest rupee'),
(7, 'ceil', 1, 1, 'Gujarat: Round up to nearest rupee'),
(8, 'ceil', 1, 1, 'Rajasthan: Round up to nearest rupee'),
(9, 'ceil', 1, 1, 'Haryana: Round up to nearest rupee'),
(10, 'ceil', 1, 1, 'Punjab: Round up to nearest rupee'),
(11, 'ceil', 1, 1, 'West Bengal: Round up to nearest rupee'),
(12, 'ceil', 1, 1, 'Telangana: Round up to nearest rupee'),
(13, 'ceil', 1, 1, 'Andhra Pradesh: Round up to nearest rupee'),
(14, 'ceil', 1, 1, 'Madhya Pradesh: Round up to nearest rupee'),
(15, 'ceil', 1, 1, 'Bihar: Round up to nearest rupee'),
(16, 'ceil', 1, 1, 'Odisha: Round up to nearest rupee'),
(17, 'ceil', 1, 1, 'Assam: Round up to nearest rupee'),
(18, 'ceil', 1, 1, 'Jharkhand: Round up to nearest rupee'),
(19, 'ceil', 1, 1, 'Chhattisgarh: Round up to nearest rupee'),
(20, 'ceil', 1, 1, 'Goa: Round up to nearest rupee');

-- 8. AMENDMENT HISTORY
CREATE TABLE amendment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id INTEGER NOT NULL REFERENCES states(id),
    amendment_name TEXT NOT NULL,
    amendment_year INTEGER NOT NULL,
    effective_date TEXT NOT NULL,
    change_description TEXT NOT NULL,
    sections_affected TEXT,
    official_reference TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_amendments_state ON amendment_history(state_id);
CREATE INDEX idx_amendments_year ON amendment_history(amendment_year);

-- 9. FIXED FEE SCHEDULE (Schedule II type matters)
CREATE TABLE fixed_fee_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id INTEGER NOT NULL REFERENCES states(id),
    case_type_id INTEGER NOT NULL REFERENCES case_types(id),
    fee_amount REAL NOT NULL,
    schedule_reference TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(state_id, case_type_id)
);
CREATE INDEX idx_fixed_fee_state ON fixed_fee_schedule(state_id);
CREATE INDEX idx_fixed_fee_case ON fixed_fee_schedule(case_type_id);

-- 10. AUDIT LOG (track all fee calculations)
CREATE TABLE calculation_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id INTEGER,
    case_type_id INTEGER,
    suit_value REAL,
    calculated_fee REAL,
    breakup_json TEXT,
    valuation_method TEXT,
    ip_address TEXT,
    user_agent TEXT,
    response_time_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_state ON calculation_audit(state_id);
CREATE INDEX idx_audit_created ON calculation_audit(created_at);
