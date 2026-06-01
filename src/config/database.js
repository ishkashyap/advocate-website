const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { databaseUrl } = require('./env');

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

const query = (sql, params = []) => {
    return pool.query(sql, params);
};

const get = async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return result.rows[0] || undefined;
};

const run = async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return {
        lastID: result.rows[0]?.id,
        changes: result.rowCount
    };
};

const initDB = async () => {
    const tables = [
        `CREATE TABLE IF NOT EXISTS admin (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            name TEXT, email TEXT, phone TEXT, service TEXT,
            date TEXT, time TEXT, message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS blogs (
            id SERIAL PRIMARY KEY,
            title TEXT, content TEXT, image TEXT, author TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS website_content (
            id SERIAL PRIMARY KEY,
            page TEXT, section TEXT, content_type TEXT,
            content TEXT, image TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS office_branches (
            id SERIAL PRIMARY KEY,
            name TEXT, address TEXT, phone TEXT, email TEXT,
            lat TEXT, lng TEXT, is_main INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS announcements (
            id SERIAL PRIMARY KEY,
            title TEXT, content TEXT, type TEXT, is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS team_members (
            id SERIAL PRIMARY KEY,
            name TEXT, position TEXT, description TEXT, image TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            name TEXT, email TEXT, phone TEXT, subject TEXT, message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS report_downloads (
            id SERIAL PRIMARY KEY,
            email TEXT, state TEXT, suit_value TEXT, fee_amount TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS states (
            state_id INTEGER PRIMARY KEY,
            state_name TEXT NOT NULL,
            act_name TEXT,
            effective_year INTEGER
        )`,
        `CREATE TABLE IF NOT EXISTS case_types (
            case_type_id INTEGER PRIMARY KEY,
            case_name TEXT NOT NULL,
            category TEXT,
            valuation_type TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS fee_rules (
            rule_id SERIAL PRIMARY KEY,
            state_id INTEGER NOT NULL,
            case_type_id INTEGER NOT NULL,
            fee_type TEXT NOT NULL CHECK(fee_type IN ('fixed','slab','total_pct','statutory_table')),
            fixed_fee REAL DEFAULT 0,
            minimum_fee REAL,
            maximum_fee REAL,
            percentage_rate REAL DEFAULT 0,
            FOREIGN KEY (state_id) REFERENCES states(state_id),
            FOREIGN KEY (case_type_id) REFERENCES case_types(case_type_id)
        )`,
        `CREATE TABLE IF NOT EXISTS fee_slabs (
            slab_id SERIAL PRIMARY KEY,
            rule_id INTEGER NOT NULL,
            slab_start REAL NOT NULL,
            slab_end REAL,
            fixed_component REAL DEFAULT 0,
            percentage_rate REAL DEFAULT 0,
            description TEXT,
            FOREIGN KEY (rule_id) REFERENCES fee_rules(rule_id)
        )`,
        `CREATE TABLE IF NOT EXISTS fee_statutory_entries (
            entry_id SERIAL PRIMARY KEY,
            rule_id INTEGER NOT NULL,
            range_start REAL NOT NULL,
            range_end REAL,
            fee REAL NOT NULL,
            description TEXT,
            FOREIGN KEY (rule_id) REFERENCES fee_rules(rule_id)
        )`,
        `CREATE TABLE IF NOT EXISTS commercial_rules (
            commercial_rule_id SERIAL PRIMARY KEY,
            state_id INTEGER NOT NULL,
            case_type_id INTEGER,
            minimum_threshold REAL DEFAULT 300000,
            includes_interest INTEGER DEFAULT 0,
            includes_penalty INTEGER DEFAULT 0,
            includes_damages INTEGER DEFAULT 0,
            percentage_rate REAL DEFAULT 0,
            maximum_fee REAL,
            FOREIGN KEY (state_id) REFERENCES states(state_id)
        )`,
        `CREATE TABLE IF NOT EXISTS content_revisions (
            id SERIAL PRIMARY KEY,
            content_id INTEGER,
            page TEXT NOT NULL,
            section TEXT NOT NULL,
            old_content TEXT,
            old_image TEXT,
            old_content_type TEXT DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of tables) {
        await pool.query(sql);
    }

    const admin = await get("SELECT * FROM admin WHERE username = 'admin'");
    if (!admin) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await pool.query("INSERT INTO admin (username, password) VALUES ($1, $2)", ['admin', hashedPassword]);
    }

    const hasStates = await get("SELECT COUNT(*) as cnt FROM states");
    if (!hasStates || hasStates.cnt === 0) {
        await pool.query(`INSERT INTO states VALUES (1,'Delhi','Court Fees Act 1870 as applicable to Delhi',2012),(2,'Maharashtra','Maharashtra Court Fees Act 1959',1959),(3,'Karnataka','Karnataka Court Fees and Suits Valuation Act 1958',1958),(4,'Tamil Nadu','Tamil Nadu Court Fees and Suits Valuation Act 1955',1955),(5,'Uttar Pradesh','Court Fees Act as applicable to Uttar Pradesh',1972)`);
        await pool.query(`INSERT INTO case_types VALUES (1,'Money Recovery Suit','Civil','ad_valorem'),(2,'Commercial Suit','Commercial','ad_valorem'),(3,'Divorce Petition','Family','fixed'),(4,'Bail Application','Criminal','fixed'),(5,'Writ Petition','Constitutional','fixed')`);
        await pool.query(`INSERT INTO fee_rules (rule_id, state_id, case_type_id, fee_type, fixed_fee, minimum_fee, maximum_fee, percentage_rate) VALUES (1,1,3,'fixed',150,150,150,0),(2,1,4,'fixed',100,100,100,0),(3,1,5,'fixed',500,500,500,0),(4,1,1,'fixed',0,0,0,0)`);
        await pool.query(`INSERT INTO fee_slabs (rule_id, slab_start, slab_end, fixed_component, percentage_rate, description) VALUES (4,0,50000,0,2,NULL),(4,50001,100000,1000,3,NULL),(4,100001,500000,2500,4,NULL)`);
        await pool.query(`INSERT INTO commercial_rules (state_id, case_type_id, minimum_threshold, includes_interest, includes_penalty, includes_damages, percentage_rate, maximum_fee) VALUES (1,NULL,300000,1,1,1,4,300000),(2,NULL,300000,1,0,1,5,500000)`);
        console.log('Fee seed data inserted');
    }

    const oldDelhiRule = await get("SELECT rule_id FROM fee_rules WHERE state_id=1 AND case_type_id=1 AND fee_type='slab'");
    if (oldDelhiRule) {
        await pool.query("UPDATE fee_rules SET fee_type='fixed', fixed_fee=0, minimum_fee=0, maximum_fee=0 WHERE rule_id=$1", [oldDelhiRule.rule_id]);
        console.log('Migrated Delhi fee_rules from slab to fixed');
    }
};

module.exports = {
    pool,
    query,
    get,
    run,
    initDB
};
