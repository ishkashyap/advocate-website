# ============================================================
# INDIAN COURT FEE CALCULATION ENGINE — Python
# ============================================================
# Compliant with Court Fees Act 1870 and state amendments
#
# THREE CALCULATION TYPES:
#   'statutory_table' — Direct lookup from predefined fee table
#                       Used by: Delhi, Punjab, Haryana
#   'slab'            — Progressive percentage (portion × rate summed)
#                       Used by: Maharashtra, Karnataka, Tamil Nadu, Kerala, etc.
#   'total_pct'       — Single percentage on entire value (bracket-based)
#                       Used by: Uttar Pradesh, Uttarakhand
# ============================================================

import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict

# ---------- DATA STRUCTURES ----------

@dataclass
class Slab:
    minimum: float
    maximum: float
    rate: Optional[float] = None
    fee: Optional[float] = None
    desc: str = ''

@dataclass
class StatutoryRow:
    from_val: float
    to_val: float
    fee: float
    label: str = ''

class FeeResult:
    def __init__(self):
        self.fee: float = 0
        self.fee_before_caps: Optional[float] = None
        self.fee_before_rounding: Optional[float] = None
        self.breakup: List[Dict] = []
        self.min_fee: Optional[float] = None
        self.max_fee: Optional[float] = None
        self.min_fee_applied: bool = False
        self.max_fee_applied: bool = False
        self.state: str = ''
        self.case_type: str = 'money_recovery'
        self.calc_type: str = ''
        self.rounding_method: str = 'ceil'
        self.specified_value: Optional[float] = None
        self.valuation_method: Optional[str] = None
        self.valuation_amount: Optional[float] = None


# ===== STATUTORY FEE TABLES (Schedule I pure lookup) =====

DELHI_STATUTORY_TABLE = [
    StatutoryRow(0, 5, 0.50, 'Up to ₹5'),
    StatutoryRow(5, 10, 0.50, '₹5–₹10'),
    StatutoryRow(10, 15, 1.00, '₹10–₹15'),
    StatutoryRow(15, 20, 1.50, '₹15–₹20'),
    StatutoryRow(20, 25, 2.00, '₹20–₹25'),
    StatutoryRow(25, 50, 5.00, '₹25–₹50'),
    StatutoryRow(50, 100, 7.50, '₹50–₹100'),
    StatutoryRow(100, 200, 10.00, '₹100–₹200'),
    StatutoryRow(200, 300, 15.00, '₹200–₹300'),
    StatutoryRow(300, 400, 20.00, '₹300–₹400'),
    StatutoryRow(400, 500, 25.00, '₹400–₹500'),
    StatutoryRow(500, 600, 30.00, '₹500–₹600'),
    StatutoryRow(600, 700, 35.00, '₹600–₹700'),
    StatutoryRow(700, 800, 40.00, '₹700–₹800'),
    StatutoryRow(800, 900, 45.00, '₹800–₹900'),
    StatutoryRow(900, 1000, 50.00, '₹900–₹1,000'),
    StatutoryRow(1000, 2000, 75.00, '₹1,000–₹2,000'),
    StatutoryRow(2000, 3000, 100.00, '₹2,000–₹3,000'),
    StatutoryRow(3000, 4000, 125.00, '₹3,000–₹4,000'),
    StatutoryRow(4000, 5000, 150.00, '₹4,000–₹5,000'),
    StatutoryRow(5000, 6000, 200.00, '₹5,000–₹6,000'),
    StatutoryRow(6000, 7000, 250.00, '₹6,000–₹7,000'),
    StatutoryRow(7000, 8000, 300.00, '₹7,000–₹8,000'),
    StatutoryRow(8000, 9000, 350.00, '₹8,000–₹9,000'),
    StatutoryRow(9000, 10000, 400.00, '₹9,000–₹10,000'),
    StatutoryRow(10000, 15000, 500.00, '₹10,000–₹15,000'),
    StatutoryRow(15000, 20000, 700.00, '₹15,000–₹20,000'),
    StatutoryRow(20000, 25000, 900.00, '₹20,000–₹25,000'),
    StatutoryRow(25000, 30000, 1100.00, '₹25,000–₹30,000'),
    StatutoryRow(30000, 40000, 1400.00, '₹30,000–₹40,000'),
    StatutoryRow(40000, 50000, 1700.00, '₹40,000–₹50,000'),
    StatutoryRow(50000, 60000, 2100.00, '₹50,000–₹60,000'),
    StatutoryRow(60000, 70000, 2500.00, '₹60,000–₹70,000'),
    StatutoryRow(70000, 80000, 2900.00, '₹70,000–₹80,000'),
    StatutoryRow(80000, 90000, 3300.00, '₹80,000–₹90,000'),
    StatutoryRow(90000, 100000, 3562.00, '₹90,000–₹1,00,000'),
    StatutoryRow(100001, 300000, 4588.80, '₹1,00,001–₹3,00,000'),
    StatutoryRow(300001, 500000, 6500.00, '₹3,00,001–₹5,00,000'),
    StatutoryRow(500001, 1000000, 9000.00, '₹5,00,001–₹10,00,000'),
    StatutoryRow(1000001, float('inf'), 12500.00, 'Above ₹10,00,000'),
]

PUNJAB_STATUTORY_TABLE = [StatutoryRow(r.from_val, r.to_val, r.fee, r.label) for r in DELHI_STATUTORY_TABLE]
HARYANA_STATUTORY_TABLE = [StatutoryRow(r.from_val, r.to_val, r.fee, r.label) for r in DELHI_STATUTORY_TABLE]

# ===== STATE DEFINITIONS =====

FEE_SLABS: Dict[str, Any] = {
    'delhi': {
        'name': 'Delhi',
        'calc_type': 'statutory_table',
        'statutory_table': DELHI_STATUTORY_TABLE,
        'min_fee': None,
        'max_fee': None,
        'fee_cap_applies': False,
        'notes': 'Original 1870 Act Schedule I statutory fee table. 2012 Delhi Amendment struck down.',
        'fixed': {'divorce': 150, 'bail': 100, 'writ': 250, 'arbitration': 650, 'certificate': 0.025},
    },
    'haryana': {
        'name': 'Haryana',
        'calc_type': 'statutory_table',
        'statutory_table': HARYANA_STATUTORY_TABLE,
        'min_fee': 50,
        'max_fee': None,
        'fee_cap_applies': False,
        'notes': 'Haryana Schedule I statutory table.',
        'fixed': {'divorce': 150, 'bail': 100, 'writ': 500, 'arbitration': 650, 'certificate': 0.025},
    },
    'punjab': {
        'name': 'Punjab',
        'calc_type': 'statutory_table',
        'statutory_table': PUNJAB_STATUTORY_TABLE,
        'min_fee': 50,
        'max_fee': None,
        'fee_cap_applies': False,
        'notes': 'Punjab Schedule I statutory table.',
        'fixed': {'divorce': 150, 'bail': 100, 'writ': 500, 'arbitration': 650, 'certificate': 0.025},
    },
    'karnataka': {
        'name': 'Karnataka',
        'calc_type': 'slab',
        'min_fee': 100, 'max_fee': 150000, 'fee_cap_applies': True,
        'slabs': [
            Slab(0, 50000, rate=0.04, desc='4% on first ₹50,000 (min ₹100)'),
            Slab(50000, 200000, rate=0.03, desc='3% on ₹50,000 – ₹2,00,000'),
            Slab(200000, 500000, rate=0.02, desc='2% on ₹2,00,000 – ₹5,00,000'),
            Slab(500000, float('inf'), rate=0.015, desc='1.5% above ₹5,00,000'),
        ],
        'fixed': {'divorce': 150, 'bail': 100, 'writ': 500, 'arbitration': 650, 'certificate': 0.025},
    },
    'maharashtra': {
        'name': 'Maharashtra',
        'calc_type': 'slab',
        'min_fee': 50, 'max_fee': 150000, 'fee_cap_applies': True,
        'slabs': [
            Slab(0, 5000, fee=50, desc='Fixed ₹50 up to ₹5,000'),
            Slab(5000, 25000, rate=0.05, desc='5% on ₹5,001 – ₹25,000'),
            Slab(25000, 50000, rate=0.04, desc='4% on ₹25,001 – ₹50,000'),
            Slab(50000, 500000, rate=0.03, desc='3% on ₹50,001 – ₹5,00,000'),
            Slab(500000, float('inf'), rate=0.02, desc='2% above ₹5,00,000'),
        ],
        'fixed': {'divorce': 150, 'bail': 100, 'writ': 500, 'arbitration': 650, 'certificate': 0.025},
    },
    'tamilnadu': {
        'name': 'Tamil Nadu',
        'calc_type': 'slab',
        'min_fee': 50, 'max_fee': 100000, 'fee_cap_applies': True,
        'slabs': [
            Slab(0, 5000, rate=0.05, desc='5% on first ₹5,000 (min ₹50)'),
            Slab(5000, 25000, rate=0.05, desc='5% on ₹5,001 – ₹25,000'),
            Slab(25000, 100000, rate=0.04, desc='4% on ₹25,001 – ₹1,00,000'),
            Slab(100000, 500000, rate=0.03, desc='3% on ₹1,00,001 – ₹5,00,000'),
            Slab(500000, float('inf'), rate=0.02, desc='2% above ₹5,00,000'),
        ],
        'fixed': {'divorce': 150, 'bail': 100, 'writ': 500, 'arbitration': 650, 'certificate': 0.025},
    },
    'uttarpradesh': {
        'name': 'Uttar Pradesh',
        'calc_type': 'total_pct',
        'min_fee': 25, 'max_fee': 125000, 'fee_cap_applies': True,
        'slabs': [
            Slab(0, 2500, fee=25, desc='Fixed ₹25 up to ₹2,500'),
            Slab(2500, 25000, rate=0.05, desc='5% of total claim'),
            Slab(25001, 100000, rate=0.06, desc='6% of total claim'),
            Slab(100001, 500000, rate=0.07, desc='7% of total claim'),
            Slab(500001, float('inf'), rate=0.075, desc='7.5% of total claim'),
        ],
        'fixed': {'divorce': 150, 'bail': 100, 'writ': 500, 'arbitration': 650, 'certificate': 0.025},
    },
}

# Additional slab states
for _k, _n, _mn, _mx in [
    ('kerala', 'Kerala', 50, 100000),
    ('gujarat', 'Gujarat', 50, 100000),
    ('rajasthan', 'Rajasthan', 100, 150000),
    ('westbengal', 'West Bengal', 50, 150000),
    ('telangana', 'Telangana', 50, 100000),
    ('andhrapradesh', 'Andhra Pradesh', 50, 100000),
    ('madhyapradesh', 'Madhya Pradesh', 50, 100000),
    ('bihar', 'Bihar', 50, 100000),
    ('odisha', 'Odisha', 50, 100000),
    ('assam', 'Assam', 50, 100000),
    ('jharkhand', 'Jharkhand', 50, 100000),
    ('chhattisgarh', 'Chhattisgarh', 50, 100000),
    ('goa', 'Goa', 50, 100000),
]:
    if _k not in FEE_SLABS:
        FEE_SLABS[_k] = {
            'name': _n, 'calc_type': 'slab', 'min_fee': _mn, 'max_fee': _mx, 'fee_cap_applies': True,
            'slabs': FEE_SLABS['tamilnadu']['slabs'][:],
            'fixed': {'divorce': 150, 'bail': 100, 'writ': 500, 'arbitration': 650, 'certificate': 0.025},
        }


# ===== CORE CALCULATION FUNCTIONS =====

def round_fee(amount: float, method: str = 'ceil') -> int:
    if method == 'ceil': return math.ceil(amount)
    elif method == 'floor': return math.floor(amount)
    elif method == 'round': return round(amount)
    return math.ceil(amount)


def enforce_min_max(fee: float, min_fee: Optional[float], max_fee: Optional[float]) -> Tuple[float, bool, bool]:
    min_applied = False
    max_applied = False
    if min_fee and fee < min_fee:
        fee = min_fee
        min_applied = True
    if max_fee and fee > max_fee:
        fee = max_fee
        max_applied = True
    return fee, min_applied, max_applied


def statutory_table_fee(amount: float, table: List[StatutoryRow]) -> Tuple[float, List[Dict]]:
    """Pure lookup-table-based fee calculation.
    Finds the matching table entry where from_val <= amount <= to_val
    and returns the predefined statutory fee."""
    for row in table:
        if row.from_val <= amount <= row.to_val:
            return row.fee, [{
                'type': 'statutory_table',
                'from': row.from_val,
                'to': row.to_val,
                'fee': row.fee,
                'label': row.label,
            }]
    return 0.0, [{'type': 'no_match', 'amount': amount}]


def ad_valorem_progressive(suit_value: float, slabs: List[Slab]) -> Tuple[float, List[Dict]]:
    total = 0.0
    breakup = []
    for slab in slabs:
        if suit_value <= slab.minimum:
            continue
        if slab.fee is not None and slab.fee > 0:
            total += slab.fee
            breakup.append({'slab': slab.desc, 'portion': 0, 'rate': 'fixed', 'fee': slab.fee})
        elif slab.rate is not None:
            portion = min(suit_value, slab.maximum) - slab.minimum
            if portion > 0:
                slab_fee = portion * slab.rate
                total += slab_fee
                breakup.append({'slab': slab.desc, 'portion': portion, 'rate': slab.rate, 'fee': slab_fee})
    return total, breakup


def total_percentage(suit_value: float, slabs: List[Slab]) -> Tuple[float, List[Dict]]:
    for slab in slabs:
        if slab.minimum <= suit_value <= slab.maximum:
            if slab.fee is not None:
                return slab.fee, [{'slab': slab.desc, 'rate': 'fixed', 'fee': slab.fee}]
            elif slab.rate is not None:
                fee = suit_value * slab.rate
                return fee, [{'slab': slab.desc, 'rate': slab.rate, 'fee': fee}]
    return 0.0, []


def calculate_court_fee(state_key: str, suit_value: float, case_type: str = 'money_recovery') -> FeeResult:
    state = FEE_SLABS.get(state_key)
    if not state:
        raise ValueError(f'Unknown state: {state_key}')

    # Fixed fee case types
    if case_type in ('divorce', 'bail', 'writ', 'arbitration', 'commercial'):
        fee = state['fixed'].get(case_type, 0)
        return FeeResult(fee=fee, state=state['name'], case_type=case_type,
                         calc_type='fixed', breakup=[{'fee': fee, 'slab': f'{case_type} petition'}])

    # Main calculation
    if state['calc_type'] == 'statutory_table':
        fee, breakup = statutory_table_fee(suit_value, state['statutory_table'])
    elif state['calc_type'] == 'total_pct':
        fee, breakup = total_percentage(suit_value, state['slabs'])
    else:
        fee, breakup = ad_valorem_progressive(suit_value, state['slabs'])

    fee_before_caps = fee
    fee = round_fee(fee)
    fee, min_applied, max_applied = enforce_min_max(fee, state.get('min_fee'), state.get('max_fee'))

    result = FeeResult()
    result.fee = fee
    result.fee_before_caps = fee_before_caps
    result.breakup = breakup
    result.min_fee = state.get('min_fee')
    result.max_fee = state.get('max_fee')
    result.min_fee_applied = min_applied
    result.max_fee_applied = max_applied
    result.state = state['name']
    result.case_type = case_type
    result.calc_type = state['calc_type']
    result.rounding_method = 'ceil'
    return result
