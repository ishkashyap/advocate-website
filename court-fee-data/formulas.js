// ============================================================
// INDIAN COURT FEE CALCULATION ENGINE — Node.js
// ============================================================
// Compliant with Court Fees Act 1870 and state amendments
//
// THREE CALCULATION TYPES:
//   'statutory_table' — Direct lookup from predefined fee table
//                       Used by: Delhi, Punjab, Haryana (Schedule I states)
//   'slab'            — Progressive percentage (portion × rate summed)
//                       Used by: Maharashtra, Karnataka, Tamil Nadu, Kerala, etc.
//   'total_pct'       — Single percentage on entire value (bracket-based)
//                       Used by: Uttar Pradesh, Uttarakhand
// ============================================================

'use strict';

// ========== DELHI STATUTORY FEE TABLE ==========
// Exact statutory fee values from Schedule I of the Court Fees Act 1870
// (as applicable to Delhi via Punjab Act 14 of 1958, extended per G.S.R. 842)
// 2012 Delhi Amendment struck down — original 1870 Act rates in force.
// ----------------------------------------------------------------

const DELHI_STATUTORY_TABLE = [
  { from: 0, to: 5, fee: 0.50 },
  { from: 5, to: 10, fee: 0.50 },
  { from: 10, to: 15, fee: 1.00 },
  { from: 15, to: 20, fee: 1.50 },
  { from: 20, to: 25, fee: 2.00 },
  { from: 25, to: 50, fee: 5.00 },
  { from: 50, to: 100, fee: 7.50 },
  { from: 100, to: 200, fee: 10.00 },
  { from: 200, to: 300, fee: 15.00 },
  { from: 300, to: 400, fee: 20.00 },
  { from: 400, to: 500, fee: 25.00 },
  { from: 500, to: 600, fee: 30.00 },
  { from: 600, to: 700, fee: 35.00 },
  { from: 700, to: 800, fee: 40.00 },
  { from: 800, to: 900, fee: 45.00 },
  { from: 900, to: 1000, fee: 50.00 },
  { from: 1000, to: 2000, fee: 75.00 },
  { from: 2000, to: 3000, fee: 100.00 },
  { from: 3000, to: 4000, fee: 125.00 },
  { from: 4000, to: 5000, fee: 150.00 },
  { from: 5000, to: 6000, fee: 200.00 },
  { from: 6000, to: 7000, fee: 250.00 },
  { from: 7000, to: 8000, fee: 300.00 },
  { from: 8000, to: 9000, fee: 350.00 },
  { from: 9000, to: 10000, fee: 400.00 },
  { from: 10000, to: 15000, fee: 500.00 },
  { from: 15000, to: 20000, fee: 700.00 },
  { from: 20000, to: 25000, fee: 900.00 },
  { from: 25000, to: 30000, fee: 1100.00 },
  { from: 30000, to: 40000, fee: 1400.00 },
  { from: 40000, to: 50000, fee: 1700.00 },
  { from: 50000, to: 60000, fee: 2100.00 },
  { from: 60000, to: 70000, fee: 2500.00 },
  { from: 70000, to: 80000, fee: 2900.00 },
  { from: 80000, to: 90000, fee: 3300.00 },
  { from: 90000, to: 100000, fee: 3562.00 },
  { from: 100001, to: 300000, fee: 4588.80 },
  { from: 300001, to: 500000, fee: 6500.00 },
  { from: 500001, to: 1000000, fee: 9000.00 },
  { from: 1000001, to: Infinity, fee: 12500.00 },
];

// ========== PUNJAB STATUTORY FEE TABLE ==========
// Placeholder — follows same Schedule I structure as Delhi
// with Punjab-specific fee values per state notifications
const PUNJAB_STATUTORY_TABLE = [
  { from: 0, to: 5, fee: 0.50 },
  { from: 5, to: 10, fee: 0.50 },
  { from: 10, to: 15, fee: 1.00 },
  { from: 15, to: 20, fee: 1.50 },
  { from: 20, to: 25, fee: 2.00 },
  { from: 25, to: 50, fee: 5.00 },
  { from: 50, to: 100, fee: 7.50 },
  { from: 100, to: 200, fee: 10.00 },
  { from: 200, to: 300, fee: 15.00 },
  { from: 300, to: 400, fee: 20.00 },
  { from: 400, to: 500, fee: 25.00 },
  { from: 500, to: 600, fee: 30.00 },
  { from: 600, to: 700, fee: 35.00 },
  { from: 700, to: 800, fee: 40.00 },
  { from: 800, to: 900, fee: 45.00 },
  { from: 900, to: 1000, fee: 50.00 },
  { from: 1000, to: 2000, fee: 75.00 },
  { from: 2000, to: 3000, fee: 100.00 },
  { from: 3000, to: 4000, fee: 125.00 },
  { from: 4000, to: 5000, fee: 150.00 },
  { from: 5000, to: 6000, fee: 200.00 },
  { from: 6000, to: 7000, fee: 250.00 },
  { from: 7000, to: 8000, fee: 300.00 },
  { from: 8000, to: 9000, fee: 350.00 },
  { from: 9000, to: 10000, fee: 400.00 },
  { from: 10000, to: 15000, fee: 500.00 },
  { from: 15000, to: 20000, fee: 700.00 },
  { from: 20000, to: 25000, fee: 900.00 },
  { from: 25000, to: 30000, fee: 1100.00 },
  { from: 30000, to: 40000, fee: 1400.00 },
  { from: 40000, to: 50000, fee: 1700.00 },
  { from: 50000, to: 60000, fee: 2100.00 },
  { from: 60000, to: 70000, fee: 2500.00 },
  { from: 70000, to: 80000, fee: 2900.00 },
  { from: 80000, to: 90000, fee: 3300.00 },
  { from: 90000, to: 100000, fee: 3562.00 },
  { from: 100001, to: 300000, fee: 4588.80 },
  { from: 300001, to: 500000, fee: 6500.00 },
  { from: 500001, to: 1000000, fee: 9000.00 },
  { from: 1000001, to: Infinity, fee: 12500.00 },
];

// ========== HARYANA STATUTORY FEE TABLE ==========
// Placeholder — follows same Schedule I structure
const HARYANA_STATUTORY_TABLE = [
  { from: 0, to: 5, fee: 0.50 },
  { from: 5, to: 10, fee: 0.50 },
  { from: 10, to: 15, fee: 1.00 },
  { from: 15, to: 20, fee: 1.50 },
  { from: 20, to: 25, fee: 2.00 },
  { from: 25, to: 50, fee: 5.00 },
  { from: 50, to: 100, fee: 7.50 },
  { from: 100, to: 200, fee: 10.00 },
  { from: 200, to: 300, fee: 15.00 },
  { from: 300, to: 400, fee: 20.00 },
  { from: 400, to: 500, fee: 25.00 },
  { from: 500, to: 600, fee: 30.00 },
  { from: 600, to: 700, fee: 35.00 },
  { from: 700, to: 800, fee: 40.00 },
  { from: 800, to: 900, fee: 45.00 },
  { from: 900, to: 1000, fee: 50.00 },
  { from: 1000, to: 2000, fee: 75.00 },
  { from: 2000, to: 3000, fee: 100.00 },
  { from: 3000, to: 4000, fee: 125.00 },
  { from: 4000, to: 5000, fee: 150.00 },
  { from: 5000, to: 6000, fee: 200.00 },
  { from: 6000, to: 7000, fee: 250.00 },
  { from: 7000, to: 8000, fee: 300.00 },
  { from: 8000, to: 9000, fee: 350.00 },
  { from: 9000, to: 10000, fee: 400.00 },
  { from: 10000, to: 15000, fee: 500.00 },
  { from: 15000, to: 20000, fee: 700.00 },
  { from: 20000, to: 25000, fee: 900.00 },
  { from: 25000, to: 30000, fee: 1100.00 },
  { from: 30000, to: 40000, fee: 1400.00 },
  { from: 40000, to: 50000, fee: 1700.00 },
  { from: 50000, to: 60000, fee: 2100.00 },
  { from: 60000, to: 70000, fee: 2500.00 },
  { from: 70000, to: 80000, fee: 2900.00 },
  { from: 80000, to: 90000, fee: 3300.00 },
  { from: 90000, to: 100000, fee: 3562.00 },
  { from: 100001, to: 300000, fee: 4588.80 },
  { from: 300001, to: 500000, fee: 6500.00 },
  { from: 500001, to: 1000000, fee: 9000.00 },
  { from: 1000001, to: Infinity, fee: 12500.00 },
];

// ============================================================
// STATE FEE DEFINITIONS (all 20 states)
// ============================================================
// Each state entry:
//   calcType: 'statutory_table' | 'slab' | 'total_pct'
//   statutoryTable: [] — direct fee lookup entries (only for 'statutory_table')
//   slabs: [] — progressive percentage slabs (only for 'slab'/'total_pct')
//   minFee, maxFee — optional caps
// --------------------------------------------------------------

const FEE_SLABS = {
  // ===== STATUTORY TABLE STATES (Schedule I lookup) =====
  delhi: {
    name: 'Delhi',
    calcType: 'statutory_table',
    statutoryTable: DELHI_STATUTORY_TABLE,
    minFee: null,
    maxFee: null,
    feeCapApplies: false,
    notes: 'Original 1870 Act Schedule I statutory fee table. 2012 Delhi Amendment struck down by Delhi HC (WP(C) 4770/2012). No max cap.',
    fixed: { divorce: 150, bail: 100, writ: 250, arbitration: 650, certificate: 0.025 },
  },
  haryana: {
    name: 'Haryana',
    calcType: 'statutory_table',
    statutoryTable: HARYANA_STATUTORY_TABLE,
    minFee: 50,
    maxFee: null,
    feeCapApplies: false,
    notes: 'Haryana adaptation of Schedule I. Statutory fee table lookup.',
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  punjab: {
    name: 'Punjab',
    calcType: 'statutory_table',
    statutoryTable: PUNJAB_STATUTORY_TABLE,
    minFee: 50,
    maxFee: null,
    feeCapApplies: false,
    notes: 'Punjab adaptation of Schedule I. Statutory fee table lookup.',
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },

  // ===== SLAB-BASED STATES (progressive percentage) =====
  maharashtra: {
    name: 'Maharashtra',
    calcType: 'slab',
    minFee: 50,
    maxFee: 150000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, fee: 50, desc: 'Fixed ₹50 up to ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 50000, rate: 0.04, desc: '4% on ₹25,000 – ₹50,000' },
      { min: 50000, max: 500000, rate: 0.03, desc: '3% on ₹50,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  karnataka: {
    name: 'Karnataka',
    calcType: 'slab',
    minFee: 100,
    maxFee: 150000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 50000, rate: 0.04, desc: '4% on first ₹50,000 (min ₹100)' },
      { min: 50000, max: 200000, rate: 0.03, desc: '3% on ₹50,000 – ₹2,00,000' },
      { min: 200000, max: 500000, rate: 0.02, desc: '2% on ₹2,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.015, desc: '1.5% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  tamilnadu: {
    name: 'Tamil Nadu',
    calcType: 'slab',
    minFee: 50,
    maxFee: 100000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000 (min ₹50)' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  kerala: {
    name: 'Kerala',
    calcType: 'slab',
    minFee: 50,
    maxFee: 100000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 10000, rate: 0.05, desc: '5% on first ₹10,000' },
      { min: 10000, max: 50000, rate: 0.05, desc: '5% on ₹10,000 – ₹50,000' },
      { min: 50000, max: 200000, rate: 0.04, desc: '4% on ₹50,000 – ₹2,00,000' },
      { min: 200000, max: 500000, rate: 0.03, desc: '3% on ₹2,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  gujarat: {
    name: 'Gujarat',
    calcType: 'slab',
    minFee: 50,
    maxFee: 100000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 20000, rate: 0.05, desc: '5% on first ₹20,000' },
      { min: 20000, max: 100000, rate: 0.04, desc: '4% on ₹20,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  rajasthan: {
    name: 'Rajasthan',
    calcType: 'slab',
    minFee: 100,
    maxFee: 150000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 50000, rate: 0.04, desc: '4% on first ₹50,000 (min ₹100)' },
      { min: 50000, max: 200000, rate: 0.03, desc: '3% on ₹50,000 – ₹2,00,000' },
      { min: 200000, max: 500000, rate: 0.02, desc: '2% on ₹2,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.015, desc: '1.5% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  westbengal: {
    name: 'West Bengal',
    calcType: 'slab',
    minFee: 50,
    maxFee: 150000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 20000, rate: 0.05, desc: '5% on first ₹20,000' },
      { min: 20000, max: 100000, rate: 0.04, desc: '4% on ₹20,000 – ₹1,00,000' },
      { min: 100000, max: 300000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹3,00,000' },
      { min: 300000, max: Infinity, rate: 0.02, desc: '2% above ₹3,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  telangana: {
    name: 'Telangana',
    calcType: 'slab',
    minFee: 50,
    maxFee: 100000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  andhrapradesh: {
    name: 'Andhra Pradesh',
    calcType: 'slab',
    minFee: 50,
    maxFee: 100000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },

  // ===== TOTAL PERCENTAGE STATES =====
  uttarpradesh: {
    name: 'Uttar Pradesh',
    calcType: 'total_pct',
    minFee: 25,
    maxFee: 125000,
    feeCapApplies: true,
    slabs: [
      { min: 0, max: 2500, fee: 25, desc: 'Fixed ₹25 up to ₹2,500' },
      { min: 2500, max: 25000, rate: 0.05, desc: '5% of total claim (₹2,501 – ₹25,000)' },
      { min: 25001, max: 100000, rate: 0.06, desc: '6% of total claim (₹25,001 – ₹1,00,000)' },
      { min: 100001, max: 500000, rate: 0.07, desc: '7% of total claim (₹1,00,001 – ₹5,00,000)' },
      { min: 500001, max: Infinity, rate: 0.075, desc: '7.5% of total claim (above ₹5,00,001)' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },

  // ===== ADDITIONAL SLAB STATES =====
  madhyapradesh: {
    name: 'Madhya Pradesh',
    calcType: 'slab',
    minFee: 50, maxFee: 100000, feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  bihar: {
    name: 'Bihar',
    calcType: 'slab',
    minFee: 50, maxFee: 100000, feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, fee: 50, desc: 'Minimum fee ₹50 up to ₹5,000' },
      { min: 5000, max: 100000, rate: 0.04, desc: '4% on ₹5,000 – ₹1,00,000' },
      { min: 100000, max: 300000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹3,00,000' },
      { min: 300000, max: Infinity, rate: 0.02, desc: '2% above ₹3,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  odisha: {
    name: 'Odisha',
    calcType: 'slab',
    minFee: 50, maxFee: 100000, feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  assam: {
    name: 'Assam',
    calcType: 'slab',
    minFee: 50, maxFee: 100000, feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  jharkhand: {
    name: 'Jharkhand',
    calcType: 'slab',
    minFee: 50, maxFee: 100000, feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.04, desc: '4% on first ₹5,000' },
      { min: 5000, max: 100000, rate: 0.04, desc: '4% on ₹5,000 – ₹1,00,000' },
      { min: 100000, max: 300000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹3,00,000' },
      { min: 300000, max: Infinity, rate: 0.02, desc: '2% above ₹3,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  chhattisgarh: {
    name: 'Chhattisgarh',
    calcType: 'slab',
    minFee: 50, maxFee: 100000, feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
  goa: {
    name: 'Goa',
    calcType: 'slab',
    minFee: 50, maxFee: 100000, feeCapApplies: true,
    slabs: [
      { min: 0, max: 5000, rate: 0.05, desc: '5% on first ₹5,000' },
      { min: 5000, max: 25000, rate: 0.05, desc: '5% on ₹5,000 – ₹25,000' },
      { min: 25000, max: 100000, rate: 0.04, desc: '4% on ₹25,000 – ₹1,00,000' },
      { min: 100000, max: 500000, rate: 0.03, desc: '3% on ₹1,00,000 – ₹5,00,000' },
      { min: 500000, max: Infinity, rate: 0.02, desc: '2% above ₹5,00,000' },
    ],
    fixed: { divorce: 150, bail: 100, writ: 500, arbitration: 650, certificate: 0.025 },
  },
};

// ============================================================
// STATUTORY TABLE FEE LOOKUP ENGINE
// ============================================================

/**
 * statutoryTableFee(amount, table)
 * Pure lookup-table-based fee calculation.
 *
 * Locates the matching statutory table entry where
 *   amount >= from AND amount <= to
 * and returns the predefined statutory fee.
 *
 * Supports:
 *   - Fixed fee rows (standard {from, to, fee})
 *   - Interpolation rows (future: rows with interpolate: true)
 *
 * @param {number} amount - Suit valuation
 * @param {Array} table - Array of {from, to, fee} entries
 * @returns {{ fee: number, breakup: Array }}
 */
function statutoryTableFee(amount, table) {
  const row = table.find(r => amount >= r.from && amount <= r.to);
  if (!row) {
    return { fee: 0, breakup: [{ type: 'no_match', amount }] };
  }
  return {
    fee: row.fee,
    breakup: [{
      type: 'statutory_table',
      from: row.from,
      to: row.to,
      fee: row.fee,
    }],
  };
}

// ============================================================
// FORMULA FUNCTIONS
// ============================================================

/**
 * 1. FIXED FEE
 */
function fixedFee(fixedAmount) {
  return { fee: Math.ceil(fixedAmount), breakup: [{ label: 'Fixed fee', fee: Math.ceil(fixedAmount) }] };
}

/**
 * 2. AD VALOREM — Progressive Slab Calculation (percentage-based)
 * Used by: Maharashtra, Karnataka, Tamil Nadu, Kerala, Gujarat, etc.
 */
function adValoremProgressive(suitValue, slabs) {
  let totalFee = 0;
  const breakup = [];

  for (const slab of slabs) {
    if (suitValue <= slab.min) continue;
    if (slab.fee !== undefined && slab.fee > 0) {
      totalFee += slab.fee;
      breakup.push({ slab: slab.desc, portion: 0, rate: 'fixed', fee: slab.fee, cumulative: totalFee });
    } else if (slab.rate !== undefined) {
      const amountInSlab = Math.min(suitValue, slab.max) - slab.min;
      if (amountInSlab > 0) {
        const slabFee = amountInSlab * slab.rate;
        totalFee += slabFee;
        breakup.push({ slab: slab.desc, portion: amountInSlab, rate: slab.rate, fee: slabFee, cumulative: totalFee });
      }
    }
  }

  return { fee: totalFee, breakup };
}

/**
 * 3. TOTAL PERCENTAGE (UP / Uttarakhand style)
 */
function totalPercentage(suitValue, slabs) {
  for (const slab of slabs) {
    if (suitValue >= slab.min && suitValue <= slab.max) {
      if (slab.fee !== undefined) {
        return { fee: slab.fee, breakup: [{ slab: slab.desc, rate: 'fixed', fee: slab.fee }] };
      } else if (slab.rate !== undefined) {
        const fee = suitValue * slab.rate;
        return { fee, breakup: [{ slab: slab.desc, rate: slab.rate, fee }] };
      }
    }
  }
  return { fee: 0, breakup: [] };
}

// ============================================================
// VALUATION ADAPTERS
// ============================================================

/**
 * 4. SHARE-BASED VALUATION (Partition Suits)
 */
function shareBasedValuation(totalValue, numerator, denominator) {
  if (denominator === 0) throw new Error('Denominator cannot be zero');
  return totalValue * (numerator / denominator);
}

/**
 * 5. COMMERCIAL SPECIFIED VALUE (Commercial Courts Act 2015)
 */
function commercialSpecifiedValue(principal, interest = 0, damages = 0, penalties = 0) {
  return principal + interest + damages + penalties;
}

/**
 * 6. PERCENTAGE OF VALUE (Probate / Succession Certificate)
 */
function percentageOfValue(value, percentageRate) {
  const fee = Math.ceil(value * (percentageRate / 100));
  return { fee, breakup: [{ slab: `${percentageRate}% of value`, fee }] };
}

/**
 * 7. CONSUMER COMPLAINT FEE (Consumer Protection Act 2019)
 */
function consumerComplaintFee(claimValue) {
  let fee = 0;
  if (claimValue <= 500000) fee = 0;
  else if (claimValue <= 1000000) fee = 2000;
  else if (claimValue <= 5000000) fee = 5000;
  else if (claimValue <= 10000000) fee = 10000;
  else fee = 20000;
  return { fee, breakup: [{ slab: 'Consumer Complaint fee', fee }] };
}

// ============================================================
// MIN/MAX/CAP/ROUNDING
// ============================================================

function enforceMinFee(calcFee, minFee) {
  return minFee ? Math.max(calcFee, minFee) : calcFee;
}

function enforceMaxFee(calcFee, maxFee) {
  return maxFee ? Math.min(calcFee, maxFee) : calcFee;
}

function roundFee(amount, method = 'ceil') {
  switch (method) {
    case 'ceil': return Math.ceil(amount);
    case 'floor': return Math.floor(amount);
    case 'round': return Math.round(amount);
    default: return Math.ceil(amount);
  }
}

// ============================================================
// MAIN CALCULATION ENGINE
// ============================================================

/**
 * Calculate court fee for a given state and suit value.
 *
 * @param {string} stateKey - e.g. 'delhi', 'karnataka', 'uttarpradesh'
 * @param {number} suitValue - Valuation amount
 * @param {object} [options]
 * @param {string} [options.caseType] - 'divorce','bail','writ','arbitration','probate',etc.
 * @returns {object} { fee, breakup, state, calcType, ... }
 */
function calculateCourtFee(stateKey, suitValue, options = {}) {
  const state = FEE_SLABS[stateKey];
  if (!state) throw new Error(`Unknown state: ${stateKey}`);
  if (typeof suitValue !== 'number' || suitValue < 0) throw new Error('Suit value must be a non-negative number');

  const caseType = (options.caseType || '').toLowerCase();

  // Handle fixed-fee case types
  if (['divorce', 'bail', 'writ', 'arbitration'].includes(caseType)) {
    const fee = state.fixed?.[caseType];
    if (!fee) throw new Error(`Fixed fee not defined for ${caseType} in ${state.name}`);
    return { fee, breakup: [{ slab: `${caseType} petition`, fee }], state: state.name, caseType, calcType: 'fixed' };
  }

  // Handle probate / succession certificate
  if (['probate', 'succession', 'certificate'].includes(caseType)) {
    return percentageOfValue(suitValue, state.fixed.certificate * 100);
  }

  // Main calculation: dispatch by calcType
  let result;
  switch (state.calcType) {
    case 'statutory_table':
      if (!state.statutoryTable) throw new Error(`Statutory table not defined for ${state.name}`);
      result = statutoryTableFee(suitValue, state.statutoryTable);
      break;
    case 'total_pct':
      result = totalPercentage(suitValue, state.slabs);
      break;
    case 'slab':
    default:
      result = adValoremProgressive(suitValue, state.slabs);
      break;
  }

  // Apply min/max and rounding — only ONCE at final stage
  const feeBeforeCaps = result.fee;
  let finalFee = roundFee(feeBeforeCaps);
  if (state.minFee) finalFee = enforceMinFee(finalFee, state.minFee);
  if (state.maxFee) finalFee = enforceMaxFee(finalFee, state.maxFee);

  return {
    fee: finalFee,
    feeBeforeCaps,
    feeBeforeRounding: result.fee,
    breakup: result.breakup,
    minFee: state.minFee || null,
    maxFee: state.maxFee || null,
    minFeeApplied: state.minFee ? finalFee > result.fee : false,
    maxFeeApplied: state.maxFee ? finalFee > result.fee : false,
    state: state.name,
    caseType: options.caseType || 'money_recovery',
    calcType: state.calcType,
    roundingMethod: 'ceil',
  };
}

// ============================================================
// COMMERCIAL COURT CALCULATIONS
// ============================================================

function calculateCommercialCourtFee(stateKey, principal, interest = 0, damages = 0, penalties = 0) {
  const sv = commercialSpecifiedValue(principal, interest, damages, penalties);
  const result = calculateCourtFee(stateKey, sv, { caseType: 'commercial' });
  result.specifiedValue = sv;
  result.specifiedValueBreakdown = { principal, interest, damages, penalties };
  return result;
}

function calculateArbitrationFee(stateKey, section) {
  const state = FEE_SLABS[stateKey];
  if (!state) throw new Error(`Unknown state: ${stateKey}`);
  const fee = state.fixed?.arbitration ?? 650;
  return { fee, breakup: [{ slab: `Arbitration Section ${section} petition`, fee }], state: state.name, arbitrationSection: section };
}

// ============================================================
// COMPREHENSIVE CALCULATION WITH VALUATION PIPELINE
// ============================================================

function calculateFeeWithValuation(stateKey, caseType, params) {
  let suitValue;
  switch (caseType) {
    case 'money_recovery':
      suitValue = params.suitValue;
      break;
    case 'commercial':
      return calculateCommercialCourtFee(stateKey, params.principal, params.interest, params.damages, params.penalties);
    case 'partition':
      suitValue = shareBasedValuation(params.totalPropertyValue, params.shareNumerator, params.shareDenominator);
      break;
    case 'declaration':
    case 'injunction':
      suitValue = params.marketValue;
      break;
    case 'rent':
      suitValue = params.annualRent * (params.multiplier || 10);
      break;
    case 'specific_performance':
      suitValue = params.agreementValue;
      break;
    case 'divorce': case 'bail': case 'writ':
      return calculateCourtFee(stateKey, 0, { caseType });
    case 'arbitration':
      return calculateArbitrationFee(stateKey, params.arbitrationSection || 11);
    case 'probate': case 'succession':
      return calculateCourtFee(stateKey, params.estateValue, { caseType: 'certificate' });
    case 'consumer':
      return consumerComplaintFee(params.claimValue);
    default:
      suitValue = params.suitValue;
  }
  const base = calculateCourtFee(stateKey, suitValue, { caseType });
  base.valuationMethod = params.valuationMethod || 'direct';
  base.valuationAmount = suitValue;
  return base;
}

/**
 * Compare across all states for a given suit value.
 */
function calculateAllStates(suitValue) {
  const results = {};
  for (const [key, state] of Object.entries(FEE_SLABS)) {
    try { results[key] = calculateCourtFee(key, suitValue); }
    catch (e) { results[key] = { error: e.message }; }
  }
  return results;
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  FEE_SLABS,
  DELHI_STATUTORY_TABLE,
  PUNJAB_STATUTORY_TABLE,
  HARYANA_STATUTORY_TABLE,
  calculateCourtFee,
  calculateCommercialCourtFee,
  calculateArbitrationFee,
  calculateFeeWithValuation,
  calculateAllStates,
  statutoryTableFee,
  adValoremProgressive,
  totalPercentage,
  fixedFee,
  percentageOfValue,
  shareBasedValuation,
  commercialSpecifiedValue,
  consumerComplaintFee,
  enforceMinFee,
  enforceMaxFee,
  roundFee,
};
