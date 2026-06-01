<?php
/* ============================================================
 * INDIAN COURT FEE CALCULATION ENGINE — PHP
 * ============================================================
 * Compliant with Court Fees Act 1870 and state amendments
 *
 * THREE CALCULATION TYPES:
 *   'statutory_table' — Direct lookup from predefined fee table
 *                       Used by: Delhi, Punjab, Haryana
 *   'slab'            — Progressive percentage (portion × rate summed)
 *                       Used by: Maharashtra, Karnataka, Tamil Nadu, Kerala, etc.
 *   'total_pct'       — Single percentage on entire value (bracket-based)
 *                       Used by: Uttar Pradesh, Uttarakhand
 * ============================================================ */

/**
 * Delhi Statutory Fee Table.
 * Exact fee values from Schedule I of the Court Fees Act 1870
 * (as applicable to Delhi via Punjab Act 14 of 1958, extended per G.S.R. 842).
 */
function getDelhiStatutoryTable() {
    return [
        ['from' => 0, 'to' => 5, 'fee' => 0.50],
        ['from' => 5, 'to' => 10, 'fee' => 0.50],
        ['from' => 10, 'to' => 15, 'fee' => 1.00],
        ['from' => 15, 'to' => 20, 'fee' => 1.50],
        ['from' => 20, 'to' => 25, 'fee' => 2.00],
        ['from' => 25, 'to' => 50, 'fee' => 5.00],
        ['from' => 50, 'to' => 100, 'fee' => 7.50],
        ['from' => 100, 'to' => 200, 'fee' => 10.00],
        ['from' => 200, 'to' => 300, 'fee' => 15.00],
        ['from' => 300, 'to' => 400, 'fee' => 20.00],
        ['from' => 400, 'to' => 500, 'fee' => 25.00],
        ['from' => 500, 'to' => 600, 'fee' => 30.00],
        ['from' => 600, 'to' => 700, 'fee' => 35.00],
        ['from' => 700, 'to' => 800, 'fee' => 40.00],
        ['from' => 800, 'to' => 900, 'fee' => 45.00],
        ['from' => 900, 'to' => 1000, 'fee' => 50.00],
        ['from' => 1000, 'to' => 2000, 'fee' => 75.00],
        ['from' => 2000, 'to' => 3000, 'fee' => 100.00],
        ['from' => 3000, 'to' => 4000, 'fee' => 125.00],
        ['from' => 4000, 'to' => 5000, 'fee' => 150.00],
        ['from' => 5000, 'to' => 6000, 'fee' => 200.00],
        ['from' => 6000, 'to' => 7000, 'fee' => 250.00],
        ['from' => 7000, 'to' => 8000, 'fee' => 300.00],
        ['from' => 8000, 'to' => 9000, 'fee' => 350.00],
        ['from' => 9000, 'to' => 10000, 'fee' => 400.00],
        ['from' => 10000, 'to' => 15000, 'fee' => 500.00],
        ['from' => 15000, 'to' => 20000, 'fee' => 700.00],
        ['from' => 20000, 'to' => 25000, 'fee' => 900.00],
        ['from' => 25000, 'to' => 30000, 'fee' => 1100.00],
        ['from' => 30000, 'to' => 40000, 'fee' => 1400.00],
        ['from' => 40000, 'to' => 50000, 'fee' => 1700.00],
        ['from' => 50000, 'to' => 60000, 'fee' => 2100.00],
        ['from' => 60000, 'to' => 70000, 'fee' => 2500.00],
        ['from' => 70000, 'to' => 80000, 'fee' => 2900.00],
        ['from' => 80000, 'to' => 90000, 'fee' => 3300.00],
        ['from' => 90000, 'to' => 100000, 'fee' => 3562.00],
        ['from' => 100001, 'to' => 300000, 'fee' => 4588.80],
        ['from' => 300001, 'to' => 500000, 'fee' => 6500.00],
        ['from' => 500001, 'to' => 1000000, 'fee' => 9000.00],
        ['from' => 1000001, 'to' => INF, 'fee' => 12500.00],
    ];
}

/**
 * Statutory Table Fee Lookup.
 * Pure lookup — finds matching row and returns predefined fee.
 */
function statutoryTableFee($amount, $table) {
    foreach ($table as $row) {
        if ($amount >= $row['from'] && $amount <= $row['to']) {
            return [
                'fee' => $row['fee'],
                'breakup' => [['type' => 'statutory_table', 'from' => $row['from'], 'to' => $row['to'], 'fee' => $row['fee']]],
            ];
        }
    }
    return ['fee' => 0, 'breakup' => []];
}

/**
 * Progressive slab calculation (percentage-based).
 */
function adValoremProgressive($suitValue, $slabs) {
    $totalFee = 0;
    $breakup = [];
    foreach ($slabs as $slab) {
        if ($suitValue <= $slab['min']) continue;
        if (isset($slab['fee']) && $slab['fee'] > 0) {
            $totalFee += $slab['fee'];
            $breakup[] = ['slab' => $slab['desc'], 'portion' => 0, 'rate' => 'fixed', 'fee' => $slab['fee']];
        } elseif (isset($slab['rate'])) {
            $portion = min($suitValue, $slab['max']) - $slab['min'];
            if ($portion > 0) {
                $slabFee = $portion * $slab['rate'];
                $totalFee += $slabFee;
                $breakup[] = ['slab' => $slab['desc'], 'portion' => $portion, 'rate' => $slab['rate'], 'fee' => $slabFee];
            }
        }
    }
    return ['fee' => $totalFee, 'breakup' => $breakup];
}

/**
 * Total percentage method (UP/Uttarakhand).
 */
function totalPercentage($suitValue, $slabs) {
    foreach ($slabs as $slab) {
        if ($suitValue >= $slab['min'] && $suitValue <= $slab['max']) {
            if (isset($slab['fee'])) {
                return ['fee' => $slab['fee'], 'breakup' => [['slab' => $slab['desc'], 'rate' => 'fixed', 'fee' => $slab['fee']]]];
            } elseif (isset($slab['rate'])) {
                $fee = $suitValue * $slab['rate'];
                return ['fee' => $fee, 'breakup' => [['slab' => $slab['desc'], 'rate' => $slab['rate'], 'fee' => $fee]]];
            }
        }
    }
    return ['fee' => 0, 'breakup' => []];
}

function roundFee($amount, $method = 'ceil') {
    switch ($method) {
        case 'ceil': return (int) ceil($amount);
        case 'floor': return (int) floor($amount);
        case 'round': return (int) round($amount);
        default: return (int) ceil($amount);
    }
}

function enforceMinFee($fee, $minFee) { return $minFee ? max($fee, $minFee) : $fee; }
function enforceMaxFee($fee, $maxFee) { return $maxFee ? min($fee, $maxFee) : $fee; }

/**
 * Main calculation entry point.
 */
function calculateCourtFee($stateKey, $suitValue, $caseType = 'money_recovery') {
    $feeSlabs = loadFeeSlabs();
    if (!isset($feeSlabs[$stateKey])) {
        throw new InvalidArgumentException("Unknown state: $stateKey");
    }
    $state = $feeSlabs[$stateKey];

    if (in_array($caseType, ['divorce', 'bail', 'writ', 'arbitration'])) {
        $fee = $state['fixed'][$caseType] ?? 0;
        return ['fee' => $fee, 'breakup' => [['slab' => $caseType . ' petition', 'fee' => $fee]],
                'state' => $state['name'], 'caseType' => $caseType, 'calcType' => 'fixed'];
    }

    if ($state['calcType'] === 'statutory_table') {
        $result = statutoryTableFee($suitValue, $state['statutoryTable']);
    } elseif ($state['calcType'] === 'total_pct') {
        $result = totalPercentage($suitValue, $state['slabs']);
    } else {
        $result = adValoremProgressive($suitValue, $state['slabs']);
    }

    $feeBeforeCaps = $result['fee'];
    $fee = roundFee($feeBeforeCaps);
    $fee = enforceMinFee($fee, $state['minFee'] ?? null);
    $fee = enforceMaxFee($fee, $state['maxFee'] ?? null);

    return [
        'fee' => $fee,
        'feeBeforeCaps' => $feeBeforeCaps,
        'breakup' => $result['breakup'],
        'state' => $state['name'],
        'caseType' => $caseType,
        'calcType' => $state['calcType'],
        'minFee' => $state['minFee'] ?? null,
        'maxFee' => $state['maxFee'] ?? null,
    ];
}

function loadFeeSlabs() {
    $delhiTable = getDelhiStatutoryTable();
    return [
        'delhi' => [
            'name' => 'Delhi',
            'calcType' => 'statutory_table',
            'statutoryTable' => $delhiTable,
            'minFee' => null,
            'maxFee' => null,
            'fixed' => ['divorce' => 150, 'bail' => 100, 'writ' => 250, 'arbitration' => 650],
        ],
        'haryana' => [
            'name' => 'Haryana',
            'calcType' => 'statutory_table',
            'statutoryTable' => $delhiTable,
            'minFee' => 50,
            'maxFee' => null,
            'fixed' => ['divorce' => 150, 'bail' => 100, 'writ' => 500, 'arbitration' => 650],
        ],
        'punjab' => [
            'name' => 'Punjab',
            'calcType' => 'statutory_table',
            'statutoryTable' => $delhiTable,
            'minFee' => 50,
            'maxFee' => null,
            'fixed' => ['divorce' => 150, 'bail' => 100, 'writ' => 500, 'arbitration' => 650],
        ],
        'karnataka' => [
            'name' => 'Karnataka', 'calcType' => 'slab', 'minFee' => 100, 'maxFee' => 150000,
            'slabs' => [
                ['min' => 0, 'max' => 50000, 'rate' => 0.04, 'desc' => '4% on first ₹50,000'],
                ['min' => 50000, 'max' => 200000, 'rate' => 0.03, 'desc' => '3% on ₹50,000 – ₹2,00,000'],
                ['min' => 200000, 'max' => 500000, 'rate' => 0.02, 'desc' => '2% on ₹2,00,000 – ₹5,00,000'],
                ['min' => 500000, 'max' => INF, 'rate' => 0.015, 'desc' => '1.5% above ₹5,00,000'],
            ],
            'fixed' => ['divorce' => 150, 'bail' => 100, 'writ' => 500, 'arbitration' => 650],
        ],
        'uttarpradesh' => [
            'name' => 'Uttar Pradesh', 'calcType' => 'total_pct', 'minFee' => 25, 'maxFee' => 125000,
            'slabs' => [
                ['min' => 0, 'max' => 2500, 'fee' => 25, 'desc' => 'Fixed ₹25 up to ₹2,500'],
                ['min' => 2500, 'max' => 25000, 'rate' => 0.05, 'desc' => '5% of total claim'],
                ['min' => 25001, 'max' => 100000, 'rate' => 0.06, 'desc' => '6% of total claim'],
                ['min' => 100001, 'max' => 500000, 'rate' => 0.07, 'desc' => '7% of total claim'],
                ['min' => 500001, 'max' => INF, 'rate' => 0.075, 'desc' => '7.5% of total claim'],
            ],
            'fixed' => ['divorce' => 150, 'bail' => 100, 'writ' => 500, 'arbitration' => 650],
        ],
        'maharashtra' => [
            'name' => 'Maharashtra', 'calcType' => 'slab', 'minFee' => 50, 'maxFee' => 150000,
            'slabs' => [
                ['min' => 0, 'max' => 5000, 'fee' => 50, 'desc' => 'Fixed ₹50 up to ₹5,000'],
                ['min' => 5000, 'max' => 25000, 'rate' => 0.05, 'desc' => '5% on ₹5,001 – ₹25,000'],
                ['min' => 25000, 'max' => 50000, 'rate' => 0.04, 'desc' => '4% on ₹25,001 – ₹50,000'],
                ['min' => 50000, 'max' => 500000, 'rate' => 0.03, 'desc' => '3% on ₹50,001 – ₹5,00,000'],
                ['min' => 500000, 'max' => INF, 'rate' => 0.02, 'desc' => '2% above ₹5,00,000'],
            ],
            'fixed' => ['divorce' => 150, 'bail' => 100, 'writ' => 500, 'arbitration' => 650],
        ],
    ];
}

function calculateCommercialFee($stateKey, $principal, $interest = 0, $damages = 0, $penalties = 0) {
    $sv = $principal + $interest + $damages + $penalties;
    $result = calculateCourtFee($stateKey, $sv, 'commercial');
    $result['specifiedValue'] = $sv;
    return $result;
}
