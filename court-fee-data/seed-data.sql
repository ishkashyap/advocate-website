-- ============================================================
-- INDIAN COURT FEE DATA — SQL INSERT STATEMENTS
-- ============================================================
-- Run after schema.sql
-- ============================================================

-- STATES
INSERT OR IGNORE INTO states (id, state_name, state_code, act_name, act_year, calc_type, min_fee, max_fee, rounding_rule, effective_date, notes) VALUES
(1,'Delhi','DL','Court Fees Act (as applicable to Delhi)',1870,'slab',100,150000,'ceil','01-01-1992','Schedule I Table A with Delhi amendments'),
(2,'Maharashtra','MH','Maharashtra Court Fees Act',1959,'slab',50,150000,'ceil','01-06-1960','Schedule I with Maharashtra amendments'),
(3,'Karnataka','KA','Karnataka Court Fees and Suits Valuation Act',1958,'slab',100,150000,'ceil','01-10-1958','Sections 23-26'),
(4,'Tamil Nadu','TN','Tamil Nadu Court Fees and Suits Valuation Act',1955,'slab',50,100000,'ceil','01-06-1955','Schedule I'),
(5,'Uttar Pradesh','UP','Uttar Pradesh Court Fees Act (as amended)',1870,'total_pct',25,125000,'ceil','01-01-1998','Percentage-of-total structure'),
(6,'Kerala','KL','Kerala Court Fees and Suits Valuation Act',1959,'slab',50,100000,'ceil','01-02-1960','Schedule I'),
(7,'Gujarat','GJ','Gujarat Court Fees Act',2004,'slab',50,100000,'ceil','01-04-2004','Replaced Bombay CFA'),
(8,'Rajasthan','RJ','Rajasthan Court Fees and Suits Valuation Act',1961,'slab',100,150000,'ceil','01-11-1961','Sections 23-27'),
(9,'Haryana','HR','Court Fees Act (Haryana Adaptation)',1870,'slab',50,100000,'ceil','01-11-1966','Central Act adapted'),
(10,'Punjab','PB','Court Fees Act (Punjab Adaptation)',1870,'slab',50,100000,'ceil','01-11-1966','Central Act adapted'),
(11,'West Bengal','WB','West Bengal Court Fees Act (as amended)',1870,'slab',50,150000,'ceil','01-01-1993','Amended slab structure'),
(12,'Telangana','TS','Telangana Court Fees and Suits Valuation Act',1956,'slab',50,100000,'ceil','02-06-2014','Continued from AP Act'),
(13,'Andhra Pradesh','AP','Andhra Pradesh Court Fees and Suits Valuation Act',1956,'slab',50,100000,'ceil','01-04-1956','Parent Act'),
(14,'Madhya Pradesh','MP','Court Fees Act (MP Adaptation)',1870,'slab',50,100000,'ceil','01-11-1956','Central Act adapted'),
(15,'Bihar','BR','Court Fees Act (Bihar Adaptation)',1870,'slab',50,100000,'ceil','01-01-1994','Central Act adapted'),
(16,'Odisha','OD','Court Fees Act (Odisha Adaptation)',1870,'slab',50,100000,'ceil','01-04-1936','Central Act adapted'),
(17,'Assam','AS','Court Fees Act (Assam Adaptation)',1870,'slab',50,100000,'ceil','01-01-1948','Central Act adapted'),
(18,'Jharkhand','JH','Court Fees Act (Jharkhand Adaptation)',1870,'slab',50,100000,'ceil','15-11-2000','Continued Bihar Act'),
(19,'Chhattisgarh','CG','Court Fees Act (Chhattisgarh Adaptation)',1870,'slab',50,100000,'ceil','01-11-2000','Continued MP Act'),
(20,'Goa','GA','Goa Court Fees Act',1970,'slab',50,100000,'ceil','01-01-1971','Separate Act');

-- CASE TYPES
INSERT OR IGNORE INTO case_types (id, case_type_name, category, fee_type, valuation_method, default_formula, slab_applicable, market_value_required, share_based, annual_rent_based, agreement_value_based, fixed_fee_default, notes) VALUES
(1,'Money Recovery Suit','civil','slab','suit_value','ad_valorem_progressive',1,1,0,0,0,0,'Section 7(i) CFA'),
(2,'Commercial Suit','commercial','slab','suit_value','ad_valorem_progressive',1,1,0,0,0,0,'Commercial Courts Act 2015'),
(3,'Divorce Petition','family','fixed','fixed','flat_fee',0,0,0,0,0,150,'Section 7 Family Courts Act'),
(4,'Bail Application','criminal','fixed','fixed','flat_fee',0,0,0,0,0,100,'Schedule II Art 1 CFA'),
(5,'Writ Petition','constitutional','fixed','fixed','flat_fee',0,0,0,0,0,500,'Article 226/227'),
(6,'Partition Suit','civil','slab','share_value','share_based_progressive',1,1,1,0,0,0,'Section 7(iv)(b) CFA'),
(7,'Specific Performance','civil','slab','agreement_value','ad_valorem_progressive',1,1,0,0,1,0,'Section 7(x) CFA'),
(8,'Declaration Suit','civil','slab','market_value','ad_valorem_progressive',1,1,0,0,0,0,'Section 7(iv)(c) CFA'),
(9,'Injunction Suit','civil','slab','relief_value','ad_valorem_progressive',1,1,0,0,0,0,'Section 7(iv)(d) CFA'),
(10,'Possession Suit','civil','slab','market_value','ad_valorem_progressive',1,1,0,0,0,0,'Section 7(v) CFA'),
(11,'Arbitration Petition','arbitration','fixed','dispute_value','flat_fee',0,0,0,0,0,650,'Arbitration Act 1996'),
(12,'Commercial Appeal','commercial','slab','appeal_value','ad_valorem_progressive',1,1,0,0,0,0,'Same fee as original suit'),
(13,'Execution Petition','civil','slab','decree_amount','ad_valorem_progressive',1,1,0,0,0,0,'Section 7(xii) CFA'),
(14,'Probate Petition','succession','percentage','estate_value','percentage_of_value',0,1,0,0,0,0,'Section 19-H CFA, 2.5%'),
(15,'Succession Certificate','succession','percentage','debt_value','percentage_of_value',0,1,0,0,0,0,'Part X CFA, 2.5%'),
(16,'Rent Petition','rent','slab','annual_rent','annual_rent_based',0,0,0,1,0,0,'Section 7(xi)(cc) CFA'),
(17,'Consumer Complaint','consumer','flat_with_slab','claim_value','flat_fee_with_slab',1,1,0,0,0,0,'CP Act 2019'),
(18,'Company Petition','corporate','fixed','paid_up_capital','flat_fee',0,0,0,0,0,500,'Companies Act 2013');

-- FEE RULES (Delhi: Money Recovery only — add more as needed)
INSERT OR IGNORE INTO fee_rules (id, state_id, case_type_id, fee_type, minimum_fee, maximum_fee, valuation_formula, is_active) VALUES
(1, 1, 1, 'slab', 100, 150000, 'suit_value', 1),
(2, 1, 3, 'fixed', NULL, NULL, 'fixed_amount:150', 1),
(3, 1, 4, 'fixed', NULL, NULL, 'fixed_amount:100', 1),
(4, 1, 5, 'fixed', NULL, NULL, 'fixed_amount:500', 1),
(5, 1, 11, 'fixed', NULL, NULL, 'fixed_amount:650', 1),
(6, 1, 14, 'percentage', NULL, NULL, 'estate_value*2.5/100', 1),
(7, 1, 15, 'percentage', NULL, NULL, 'debt_value*2.5/100', 1);

-- FEE SLABS (Delhi Money Recovery)
INSERT OR IGNORE INTO fee_slabs (fee_rule_id, slab_start, slab_end, percentage_rate, fixed_component, description, sort_order) VALUES
(1, 0, 50000, 2.0, 0, '2% on first ₹50,000', 1),
(1, 50000, 100000, 3.0, 0, '3% on ₹50,001 – ₹1,00,000', 2),
(1, 100000, 500000, 4.0, 0, '4% on ₹1,00,001 – ₹5,00,000', 3),
(1, 500000, 999999999, 4.0, 0, '4% above ₹5,00,000', 4);

-- COMMERCIAL RULES (all states)
INSERT OR IGNORE INTO commercial_rules (state_id, specified_value_threshold, include_principal, include_interest, include_damages, include_penalty, arbitration_section_9_fee, arbitration_section_11_fee, arbitration_section_34_fee, arbitration_section_37_fee) VALUES
(1,300000,1,1,1,1,650,650,650,650),
(2,300000,1,1,1,1,650,650,650,650),
(3,300000,1,1,1,1,650,650,650,650),
(4,300000,1,1,1,1,650,650,650,650),
(5,300000,1,1,1,1,650,650,650,650),
(6,300000,1,1,1,1,650,650,650,650),
(7,300000,1,1,1,1,650,650,650,650),
(8,300000,1,1,1,1,650,650,650,650),
(9,300000,1,1,1,1,650,650,650,650),
(10,300000,1,1,1,1,650,650,650,650),
(11,300000,1,1,1,1,650,650,650,650),
(12,300000,1,1,1,1,650,650,650,650),
(13,300000,1,1,1,1,650,650,650,650),
(14,300000,1,1,1,1,650,650,650,650),
(15,300000,1,1,1,1,650,650,650,650),
(16,300000,1,1,1,1,650,650,650,650),
(17,300000,1,1,1,1,650,650,650,650),
(18,300000,1,1,1,1,650,650,650,650),
(19,300000,1,1,1,1,650,650,650,650),
(20,300000,1,1,1,1,650,650,650,650);
