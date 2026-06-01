const { query, run } = require('../config/database');
const sanitizeHtml = require('sanitize-html');

const getAnnouncements = async (req, res, next) => {
    try {
        let sql = "SELECT * FROM announcements";
        if (!req.query.all) sql += " WHERE is_active = 1";
        sql += " ORDER BY created_at DESC";
        const result = await query(sql);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const createAnnouncement = async (req, res, next) => {
    try {
        const { title, type, is_active } = req.body;
        const content = sanitizeHtml(req.body.content || '');
        const active = is_active !== undefined ? is_active : 1;

        const result = await run(
            "INSERT INTO announcements (title, content, type, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
            [title, content, type, active]
        );

        res.status(201).json({ success: true, id: result.lastID, message: 'Announcement created successfully' });
    } catch (err) {
        next(err);
    }
};

const updateAnnouncement = async (req, res, next) => {
    try {
        const { title, type, is_active } = req.body;
        const content = sanitizeHtml(req.body.content || '');

        await run(
            "UPDATE announcements SET title = $1, content = $2, type = $3, is_active = $4 WHERE id = $5",
            [title, content, type, is_active, req.params.id]
        );

        res.json({ success: true, message: 'Announcement updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteAnnouncement = async (req, res, next) => {
    try {
        await run("DELETE FROM announcements WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
};
