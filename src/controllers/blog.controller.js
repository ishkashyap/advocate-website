const { query, get, run } = require('../config/database');
const sanitizeHtml = require('sanitize-html');

const getBlogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let sql = "SELECT * FROM blogs";
        let params = [];

        if (search) {
            sql += " WHERE title LIKE $1 OR content LIKE $2";
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        
        let countSql = "SELECT COUNT(*) as total FROM blogs";
        let countParams = [];
        if (search) {
            countSql += " WHERE title LIKE $1 OR content LIKE $2";
            countParams.push(`%${search}%`, `%${search}%`);
        }
        
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
};

const getBlogById = async (req, res, next) => {
    try {
        const row = await get("SELECT * FROM blogs WHERE id = $1", [req.params.id]);
        if (!row) {
            return res.status(404).json({ success: false, error: 'Blog not found' });
        }
        res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

const createBlog = async (req, res, next) => {
    try {
        const { title, author } = req.body;
        const content = sanitizeHtml(req.body.content);
        const image = req.file ? '/images/' + req.file.filename : null;

        const result = await run(
            "INSERT INTO blogs (title, content, image, author) VALUES ($1, $2, $3, $4) RETURNING id",
            [title, content, image, author || 'Admin']
        );

        res.status(201).json({ success: true, id: result.lastID, message: 'Blog created successfully' });
    } catch (err) {
        next(err);
    }
};

const updateBlog = async (req, res, next) => {
    try {
        const { title, author } = req.body;

        const existing = await get("SELECT * FROM blogs WHERE id = $1", [req.params.id]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Blog not found' });
        }

        const content = req.body.content !== undefined ? sanitizeHtml(req.body.content) : existing.content;

        let finalImage = existing.image;
        if (req.file) {
            finalImage = '/images/' + req.file.filename;
        } else if (req.body.image !== undefined) {
            finalImage = req.body.image || existing.image;
        }

        await run(
            "UPDATE blogs SET title = $1, content = $2, image = $3, author = $4 WHERE id = $5",
            [title || existing.title, content, finalImage, author || existing.author || 'Admin', req.params.id]
        );

        res.json({ success: true, message: 'Blog updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteBlog = async (req, res, next) => {
    try {
        await run("DELETE FROM blogs WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: 'Blog deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog
};
