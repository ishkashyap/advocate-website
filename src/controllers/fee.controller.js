const { query, get, run } = require('../config/database');
const path = require('path');

let statutoryTables = {};
try {
    const formulas = require(path.join(__dirname, '../../court-fee-data/formulas.js'));
    if (formulas.DELHI_STATUTORY_TABLE) {
        statutoryTables['delhi'] = { table: formulas.DELHI_STATUTORY_TABLE, minFee: null, maxFee: null };
    }
    if (formulas.PUNJAB_STATUTORY_TABLE) {
        statutoryTables['punjab'] = { table: formulas.PUNJAB_STATUTORY_TABLE, minFee: 50, maxFee: null };
    }
    if (formulas.HARYANA_STATUTORY_TABLE) {
        statutoryTables['haryana'] = { table: formulas.HARYANA_STATUTORY_TABLE, minFee: 50, maxFee: null };
    }
} catch (e) {
    console.warn('Could not load statutory tables from formulas.js:', e.message);
}

function getStateKey(stateName) {
    return stateName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function lookupStatutoryFee(amount, table) {
    const row = table.find(r => amount >= r.from && amount <= r.to);
    return row ? row.fee : 0;
}

const getStates = async (req, res) => {
    try {
        const result = await query(`SELECT s.*, COUNT(fr.rule_id) as rule_count
            FROM states s LEFT JOIN fee_rules fr ON s.state_id = fr.state_id
            GROUP BY s.state_id ORDER BY s.state_name`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const getCaseTypes = async (req, res) => {
    try {
        const result = await query("SELECT * FROM case_types ORDER BY case_name");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const getRules = async (req, res) => {
    try {
        const { state_id, case_type_id } = req.query;
        let sql = `SELECT fr.*, s.state_name, ct.case_name
            FROM fee_rules fr
            JOIN states s ON fr.state_id = s.state_id
            JOIN case_types ct ON fr.case_type_id = ct.case_type_id`;
        const params = [];
        const conditions = [];
        if (state_id) { conditions.push(`fr.state_id = $${params.length + 1}`); params.push(+state_id); }
        if (case_type_id) { conditions.push(`fr.case_type_id = $${params.length + 1}`); params.push(+case_type_id); }
        if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
        sql += " ORDER BY s.state_name, ct.case_name";
        const rulesResult = await query(sql, params);
        const rules = rulesResult.rows;
        for (const rule of rules) {
            const stateKey = getStateKey(rule.state_name);
            if (rule.fee_type === 'slab' || rule.fee_type === 'total_pct') {
                const slabsResult = await query(
                    "SELECT * FROM fee_slabs WHERE rule_id = $1 ORDER BY slab_start",
                    [rule.rule_id]
                );
                rule.slabs = slabsResult.rows;
            } else if (statutoryTables[stateKey]) {
                rule.fee_type = 'statutory_table';
                rule.statutory_table = statutoryTables[stateKey].table;
            }
        }
        res.json({ success: true, data: rules });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const calculateFee = async (req, res) => {
    try {
        const state_id = +req.query.state_id;
        const suit_value = +req.query.suit_value;
        const case_type_id = +req.query.case_type_id || 1;

        if (!state_id || !suit_value || suit_value <= 0) {
            return res.status(400).json({ success: false, error: 'state_id and suit_value > 0 required' });
        }

        let rule = await get(
            "SELECT * FROM fee_rules WHERE state_id = $1 AND case_type_id = $2",
            [state_id, case_type_id]
        );
        if (!rule) {
            rule = await get(
                "SELECT * FROM fee_rules WHERE state_id = $1 AND case_type_id = 2",
                [state_id]
            );
        }
        if (!rule) {
            return res.status(404).json({ success: false, error: 'No fee rule found for this state/case type' });
        }

        let totalFee = 0;
        let breakup = [];

        if (rule.fee_type === 'fixed') {
            const stStateName = rule.state_name || (await get("SELECT state_name FROM states WHERE state_id = $1", [state_id]))?.state_name;
            const stKey = getStateKey(stStateName || '');
            const stData = statutoryTables[stKey];
            if (stData && rule.state_id) {
                totalFee = lookupStatutoryFee(suit_value, stData.table);
                breakup.push({ desc: 'Statutory fee table', amount: totalFee });
                rule.fee_type = 'statutory_table';
            } else {
                totalFee = rule.fixed_fee;
                breakup.push({ desc: 'Fixed fee', amount: totalFee });
            }

        } else if (rule.fee_type === 'total_pct') {
            const slabsResult = await query(
                "SELECT * FROM fee_slabs WHERE rule_id = $1 ORDER BY slab_start",
                [rule.rule_id]
            );
            for (const slab of slabsResult.rows) {
                if (suit_value >= slab.slab_start && suit_value <= slab.slab_end) {
                    totalFee = slab.fixed_component + Math.round(suit_value * slab.percentage_rate / 100);
                    breakup.push({ desc: slab.description || `Rate: ${slab.percentage_rate}% of total`, amount: totalFee });
                    break;
                }
            }

        } else if (rule.fee_type === 'slab') {
            const slabsResult = await query(
                "SELECT * FROM fee_slabs WHERE rule_id = $1 ORDER BY slab_start",
                [rule.rule_id]
            );
            for (const slab of slabsResult.rows) {
                if (suit_value >= slab.slab_start) {
                    const amtInSlab = Math.min(suit_value, slab.slab_end || Infinity) - slab.slab_start;
                    if (amtInSlab > 0) {
                        let slabFee = Math.round(amtInSlab * slab.percentage_rate / 100);
                        totalFee += slabFee;
                        const desc = slab.description || `${slab.percentage_rate}% on ₹${slab.slab_start.toLocaleString('en-IN')} - ₹${(slab.slab_end || suit_value).toLocaleString('en-IN')}`;
                        breakup.push({ desc, amount: slabFee });
                    }
                }
            }

        } else if (rule.fee_type === 'statutory_table') {
            const stState = await get("SELECT state_name FROM states WHERE state_id = $1", [state_id]);
            const stateKey = getStateKey(stState?.state_name || '');
            const stData = statutoryTables[stateKey];
            if (stData) {
                totalFee = lookupStatutoryFee(suit_value, stData.table);
                breakup.push({ desc: 'Statutory fee table lookup', amount: totalFee });
            } else {
                return res.status(404).json({ success: false, error: 'Statutory table not found for this state' });
            }
        }

        totalFee = Math.round(totalFee);
        if (rule.minimum_fee && totalFee < rule.minimum_fee) totalFee = rule.minimum_fee;
        if (rule.maximum_fee && totalFee > rule.maximum_fee) totalFee = rule.maximum_fee;

        const state = await get("SELECT state_name FROM states WHERE state_id = $1", [state_id]);
        const caseType = await get("SELECT case_name FROM case_types WHERE case_type_id = $1", [case_type_id]);

        res.json({
            success: true,
            data: {
                state: state?.state_name,
                case_type: caseType?.case_name,
                suit_value,
                total_fee: totalFee,
                fee_type: rule.fee_type,
                breakup,
                min_fee: rule.minimum_fee,
                max_fee: rule.maximum_fee
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getStates, getCaseTypes, getRules, calculateFee };
