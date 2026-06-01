const express = require('express');
const router = express.Router();
const { query, run } = require('../config/database');
const { uploadSmall } = require('../middleware/upload.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', async (req, res, next) => {
    try {
        const result = await query("SELECT * FROM team_members ORDER BY sort_order ASC, id ASC");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

router.post('/', authenticateToken, uploadSmall.single('image'), async (req, res, next) => {
    try {
        const { name, position, description, sort_order } = req.body;
        const image = req.file ? '/images/' + req.file.filename : req.body.image || null;
        
        const result = await run(
            "INSERT INTO team_members (name, position, description, image, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [name, position, description, image, sort_order || 0]
        );
        
        res.status(201).json({ success: true, id: result.lastID, message: 'Team member added' });
    } catch (err) {
        next(err);
    }
});

router.put('/:id', authenticateToken, uploadSmall.single('image'), async (req, res, next) => {
    try {
        const { name, position, description, sort_order } = req.body;
        const image = req.file ? '/images/' + req.file.filename : req.body.image;
        
        if (image) {
            await run(
                "UPDATE team_members SET name = $1, position = $2, description = $3, image = $4, sort_order = $5 WHERE id = $6",
                [name, position, description, image, sort_order || 0, req.params.id]
            );
        } else {
            await run(
                "UPDATE team_members SET name = $1, position = $2, description = $3, sort_order = $4 WHERE id = $5",
                [name, position, description, sort_order || 0, req.params.id]
            );
        }
        
        res.json({ success: true, message: 'Team member updated' });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        await run("DELETE FROM team_members WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: 'Team member deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
