const { query, run } = require('../config/database');

const getOffices = async (req, res, next) => {
    try {
        const result = await query("SELECT * FROM office_branches ORDER BY is_main DESC, id ASC");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const createOffice = async (req, res, next) => {
    try {
        const { name, address, phone, email, lat, lng, is_main } = req.body;
        const result = await run(
            "INSERT INTO office_branches (name, address, phone, email, lat, lng, is_main) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            [name, address, phone, email, lat || null, lng || null, is_main ? 1 : 0]
        );
        res.status(201).json({ success: true, id: result.lastID, message: 'Office created successfully' });
    } catch (err) {
        next(err);
    }
};

const updateOffice = async (req, res, next) => {
    try {
        const { name, address, phone, email, lat, lng, is_main } = req.body;
        await run(
            "UPDATE office_branches SET name = $1, address = $2, phone = $3, email = $4, lat = $5, lng = $6, is_main = $7 WHERE id = $8",
            [name, address, phone, email, lat || null, lng || null, is_main ? 1 : 0, req.params.id]
        );
        res.json({ success: true, message: 'Office updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteOffice = async (req, res, next) => {
    try {
        await run("DELETE FROM office_branches WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: 'Office deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getOffices,
    createOffice,
    updateOffice,
    deleteOffice
};
