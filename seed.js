const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const seedData = require('./seed.json');

require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const query = (sql, params = []) => pool.query(sql, params);

async function seed() {
    console.log('Ensuring tables exist...');

    await query(`CREATE TABLE IF NOT EXISTS admin (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);
    await query(`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, name TEXT, email TEXT, phone TEXT, service TEXT, date TEXT, time TEXT, message TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await query(`CREATE TABLE IF NOT EXISTS blogs (id SERIAL PRIMARY KEY, title TEXT, content TEXT, image TEXT, author TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await query(`CREATE TABLE IF NOT EXISTS website_content (id SERIAL PRIMARY KEY, page TEXT, section TEXT, content_type TEXT, content TEXT, image TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await query(`CREATE TABLE IF NOT EXISTS office_branches (id SERIAL PRIMARY KEY, name TEXT, address TEXT, phone TEXT, email TEXT, lat TEXT, lng TEXT, is_main INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await query(`CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, title TEXT, content TEXT, type TEXT, is_active INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await query(`CREATE TABLE IF NOT EXISTS team_members (id SERIAL PRIMARY KEY, name TEXT, position TEXT, description TEXT, image TEXT, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await query(`CREATE TABLE IF NOT EXISTS contacts (id SERIAL PRIMARY KEY, name TEXT, email TEXT, phone TEXT, subject TEXT, message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    const existing = await query("SELECT COUNT(*) as count FROM website_content");
    if (parseInt(existing.rows[0].count) > 0) {
        console.log('Database already has content, skipping seed');
        await pool.end();
        return;
    }

    console.log('Seeding database...');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await query("INSERT INTO admin (username, password) VALUES ($1, $2) ON CONFLICT DO NOTHING", ['admin', hashedPassword]);

    if (seedData.website_content) {
        for (const item of seedData.website_content) {
            await query(
                "INSERT INTO website_content (page, section, content_type, content, image) VALUES ($1, $2, $3, $4, $5)",
                [item.page, item.section, item.content_type, item.content, item.image]
            );
        }
        console.log(`  Inserted ${seedData.website_content.length} content entries`);
    }

    if (seedData.announcements) {
        for (const item of seedData.announcements) {
            await query(
                "INSERT INTO announcements (title, content, type, is_active) VALUES ($1, $2, $3, $4)",
                [item.title, item.content, item.type, item.is_active]
            );
        }
        console.log(`  Inserted ${seedData.announcements.length} announcements`);
    }

    if (seedData.team_members) {
        for (const item of seedData.team_members) {
            await query(
                "INSERT INTO team_members (name, position, description, image) VALUES ($1, $2, $3, $4)",
                [item.name, item.position, item.description, item.image]
            );
        }
        console.log(`  Inserted ${seedData.team_members.length} team members`);
    }

    if (seedData.blogs) {
        for (const item of seedData.blogs) {
            await query(
                "INSERT INTO blogs (title, content, image, author) VALUES ($1, $2, $3, $4)",
                [item.title, item.content, item.image, item.author]
            );
        }
        console.log(`  Inserted ${seedData.blogs.length} blogs`);
    }

    console.log('Seed complete!');
    await pool.end();
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
