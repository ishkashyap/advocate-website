const { query, run } = require('../config/database');
const sanitizeHtml = require('sanitize-html');

const getContacts = async (req, res, next) => {
    try {
        const result = await query("SELECT * FROM contacts ORDER BY created_at DESC");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const createContact = async (req, res, next) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        const result = await run(
            "INSERT INTO contacts (name, email, phone, subject, message) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [name, email, phone, subject, sanitizeHtml(message || '')]
        );

        res.status(201).json({ success: true, id: result.lastID, message: 'Message received successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteContact = async (req, res, next) => {
    try {
        await run("DELETE FROM contacts WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: 'Contact deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getContacts,
    createContact,
    deleteContact
};
