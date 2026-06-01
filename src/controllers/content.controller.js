const { query, run } = require('../config/database');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const path = require('path');

const MAX_REVISIONS = 5;

function safeImagePath(imagePath) {
    if (!imagePath) return null;
    const resolved = path.resolve(__dirname, '../../public', imagePath);
    const publicDir = path.resolve(__dirname, '../../public');
    return resolved.startsWith(publicDir + path.sep) || resolved === publicDir ? resolved : null;
}

async function saveRevision(contentId, page, section) {
    const existing = await query(
        "SELECT * FROM website_content WHERE page = $1 AND section = $2",
        [page, section]
    );
    if (existing.rows.length === 0) return;

    const row = existing.rows[0];
    await run(
        "INSERT INTO content_revisions (content_id, page, section, old_content, old_image, old_content_type) VALUES ($1, $2, $3, $4, $5, $6)",
        [row.id, page, section, row.content, row.image, row.content_type]
    );

    const countResult = await query(
        "SELECT COUNT(*) as cnt FROM content_revisions WHERE page = $1 AND section = $2",
        [page, section]
    );
    const count = parseInt(countResult.rows[0].cnt);
    if (count > MAX_REVISIONS) {
        const oldest = await query(
            "SELECT id, old_image, content_id FROM content_revisions WHERE page = $1 AND section = $2 ORDER BY created_at ASC LIMIT $3",
            [page, section, count - MAX_REVISIONS]
        );
        for (const rev of oldest.rows) {
            if (rev.old_image && rev.old_image.startsWith('/images/')) {
                const current = await query("SELECT image FROM website_content WHERE id = $1", [rev.content_id]);
                const isCurrent = current.rows.length > 0 && current.rows[0].image === rev.old_image;
                if (!isCurrent) {
                    const filePath = safeImagePath(rev.old_image);
                    if (filePath && fs.existsSync(filePath)) {
                        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
                    }
                }
            }
            await run("DELETE FROM content_revisions WHERE id = $1", [rev.id]);
        }
    }
}

async function saveRevisionById(contentId) {
    const existing = await query("SELECT * FROM website_content WHERE id = $1", [contentId]);
    if (existing.rows.length === 0) return;

    const row = existing.rows[0];
    await run(
        "INSERT INTO content_revisions (content_id, page, section, old_content, old_image, old_content_type) VALUES ($1, $2, $3, $4, $5, $6)",
        [row.id, row.page, row.section, row.content, row.image, row.content_type]
    );

    const countResult = await query(
        "SELECT COUNT(*) as cnt FROM content_revisions WHERE page = $1 AND section = $2",
        [row.page, row.section]
    );
    const count = parseInt(countResult.rows[0].cnt);
    if (count > MAX_REVISIONS) {
        const oldest = await query(
            "SELECT id, old_image, content_id FROM content_revisions WHERE page = $1 AND section = $2 ORDER BY created_at ASC LIMIT $3",
            [row.page, row.section, count - MAX_REVISIONS]
        );
        for (const rev of oldest.rows) {
            if (rev.old_image && rev.old_image.startsWith('/images/')) {
                const current = await query("SELECT image FROM website_content WHERE id = $1", [rev.content_id]);
                const isCurrent = current.rows.length > 0 && current.rows[0].image === rev.old_image;
                if (!isCurrent) {
                    const filePath = safeImagePath(rev.old_image);
                    if (filePath && fs.existsSync(filePath)) {
                        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
                    }
                }
            }
            await run("DELETE FROM content_revisions WHERE id = $1", [rev.id]);
        }
    }
}

const getContent = async (req, res, next) => {
    try {
        const result = await query("SELECT * FROM website_content");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const createContent = async (req, res, next) => {
    try {
        const { page, section, content_type } = req.body;
        const newContent = req.body.content || '';
        const content = sanitizeHtml(newContent);
        const newImage = req.file ? '/images/' + req.file.filename : null;

        const existing = await query("SELECT * FROM website_content WHERE page = $1 AND section = $2", [page, section]);
        
        if (existing.rows.length > 0) {
            const existingData = existing.rows[0];
            await saveRevision(existingData.id, page, section);

            const finalContent = newContent.trim() === '' ? existingData.content : content;
            let finalImage = newImage ? newImage : existingData.image;
            const finalContentType = content_type || existingData.content_type;
            
            if (finalContentType === 'image' && newContent.trim() !== '' && !newImage) {
                finalImage = null;
            }
            
            if (newImage && existingData.image && existingData.image.startsWith('/images/')) {
                const oldPath = safeImagePath(existingData.image);
                if (oldPath && fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
                }
            }
            
            await run(
                "UPDATE website_content SET content_type = $1, content = $2, image = $3, updated_at = CURRENT_TIMESTAMP WHERE page = $4 AND section = $5",
                [finalContentType, finalContent, finalImage, page, section]
            );
            res.json({ success: true, message: 'Content updated successfully' });
        } else {
            const result = await run(
                "INSERT INTO website_content (page, section, content_type, content, image) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [page, section, content_type || 'text', content, newImage]
            );
            res.status(201).json({ success: true, id: result.lastID, message: 'Content added successfully' });
        }
    } catch (err) {
        next(err);
    }
};

const updateContent = async (req, res, next) => {
    try {
        const { page, section, content_type } = req.body;
        const content = sanitizeHtml(req.body.content || '');

        const existing = await query("SELECT * FROM website_content WHERE id = $1", [req.params.id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        await saveRevisionById(req.params.id);

        const existingImage = existing.rows[0].image;
        let finalImage = existingImage;

        if (req.file) {
            finalImage = '/images/' + req.file.filename;
        } else if (req.body.image !== undefined) {
            finalImage = req.body.image || existingImage;
        } else if (content_type === 'image' && content.trim() !== '') {
            finalImage = null;
        }

        if (req.file && existingImage && existingImage.startsWith('/images/')) {
            const oldPath = safeImagePath(existingImage);
            if (oldPath && fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
            }
        }

        await run(
            "UPDATE website_content SET page = $1, section = $2, content_type = $3, content = $4, image = $5 WHERE id = $6",
            [page, section, content_type, content, finalImage, req.params.id]
        );

        res.json({ success: true, message: 'Content updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteContent = async (req, res, next) => {
    try {
        await run("DELETE FROM content_revisions WHERE content_id = $1", [req.params.id]);
        await run("DELETE FROM website_content WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: 'Content deleted successfully' });
    } catch (err) {
        next(err);
    }
};

const saveFooter = async (req, res, next) => {
    try {
        const { section, content } = req.body;
        const page = 'global';
        const content_type = 'text';
        
            const existing = await query("SELECT * FROM website_content WHERE page = $1 AND section = $2", [page, section]);
        const sanitizedContent = sanitizeHtml(content || '');
        
        if (existing.rows.length > 0) {
            await saveRevision(existing.rows[0].id, page, section);
            const finalContent = (content || '').trim() === '' ? existing.rows[0].content : sanitizedContent;
            await run("UPDATE website_content SET content = $1 WHERE page = $2 AND section = $3", [finalContent, page, section]);
        } else {
            await run("INSERT INTO website_content (page, section, content_type, content) VALUES ($1, $2, $3, $4)", [page, section, content_type, sanitizedContent]);
        }
        
        res.json({ success: true, message: 'Content saved successfully' });
    } catch (err) {
        next(err);
    }
};

const getHomePage = async (req, res, next) => {
    try {
        const result = await query("SELECT * FROM website_content WHERE page = 'home'");

        const homeData = {};
        result.rows.forEach(row => {
            if (row.section === 'hero-title') homeData.heroTitle = row.content || '';
            else if (row.section === 'hero-title-2') homeData.heroTitle2 = row.content || '';
            else if (row.section === 'hero-subtitle') homeData.heroSubtitle = row.content || '';
            else if (row.section === 'hero-image') homeData.heroImage = row.image || row.content || '';
            else if (row.section === 'about-image') homeData.aboutImage = row.image || row.content || '';
            else if (row.section === 'about-snippet') homeData.aboutSnippet = row.content || '';
            else if (row.section === 'home-phone') homeData.phone = row.content || '';
            else if (row.section === 'home-email') homeData.email = row.content || '';
        });

        res.json({ success: true, data: homeData });
    } catch (err) {
        res.json({ success: true, data: {} });
    }
};

const updateHomePage = async (req, res, next) => {
    try {
        const { heroTitle, heroTitle2, heroSubtitle, heroImage, aboutSnippet, aboutImage, phone, email } = req.body;

        const sections = [
            { section: 'hero-title', value: heroTitle },
            { section: 'hero-title-2', value: heroTitle2 },
            { section: 'hero-subtitle', value: heroSubtitle },
            { section: 'hero-image', value: heroImage, isImage: true },
            { section: 'about-snippet', value: aboutSnippet },
            { section: 'about-image', value: aboutImage, isImage: true },
            { section: 'home-phone', value: phone },
            { section: 'home-email', value: email }
        ];
        
        for (const item of sections) {
            if (item.value === undefined) continue;
            
            const existing = await query("SELECT * FROM website_content WHERE page = 'home' AND section = $1", [item.section]);
            
            if (existing.rows.length > 0) {
                await saveRevision(existing.rows[0].id, 'home', item.section);

                const finalValue = (item.value || '').trim() === '' ? existing.rows[0].content : sanitizeHtml(item.value);
                if (item.isImage) {
                    const imgVal = req.file ? '/images/' + req.file.filename : (item.value || existing.rows[0].image);
                    if (req.file && existing.rows[0].image && existing.rows[0].image.startsWith('/images/')) {
                        const oldPath = safeImagePath(existing.rows[0].image);
                        if (oldPath && fs.existsSync(oldPath)) {
                            try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
                        }
                    }
                    await run("UPDATE website_content SET image = $1, updated_at = CURRENT_TIMESTAMP WHERE page = 'home' AND section = $2", [imgVal, item.section]);
                } else {
                    await run("UPDATE website_content SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE page = 'home' AND section = $2", [finalValue, item.section]);
                }
            } else {
                if (item.isImage && item.value) {
                    const imgVal = req.file ? '/images/' + req.file.filename : item.value;
                    await run("INSERT INTO website_content (page, section, content_type, content, image) VALUES ('home', $1, 'image', '', $2)", [item.section, imgVal]);
                } else if (item.value) {
                    await run("INSERT INTO website_content (page, section, content_type, content) VALUES ('home', $1, 'text', $2)", [item.section, sanitizeHtml(item.value)]);
                }
            }
        }
        
        res.json({ success: true, message: 'Home page updated successfully' });
    } catch (err) {
        next(err);
    }
};

const bulkUpdateContent = async (req, res, next) => {
    try {
        const { page, sections } = req.body;
        if (!page || !Array.isArray(sections)) {
            return res.status(400).json({ success: false, error: 'Invalid payload' });
        }

        for (const item of sections) {
            const { section, content } = item;
            const sanitizedContent = sanitizeHtml(content || '');
            const existing = await query("SELECT * FROM website_content WHERE page = $1 AND section = $2", [page, section]);
            if (existing.rows.length > 0) {
                await saveRevision(existing.rows[0].id, page, section);
                await run("UPDATE website_content SET content = $1 WHERE page = $2 AND section = $3", [sanitizedContent, page, section]);
            } else {
                await run("INSERT INTO website_content (page, section, content_type, content) VALUES ($1, $2, 'text', $3)", [page, section, sanitizedContent]);
            }
        }

        res.json({ success: true, message: 'Content saved successfully' });
    } catch (err) {
        next(err);
    }
};

const bulkDeleteContent = async (req, res, next) => {
    try {
        const { page, sections } = req.body;
        if (!page || !Array.isArray(sections) || sections.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid payload' });
        }

        for (const section of sections) {
            await run("DELETE FROM content_revisions WHERE page = $1 AND section = $2", [page, section]);
            await run("DELETE FROM website_content WHERE page = $1 AND section = $2", [page, section]);
        }

        res.json({ success: true, message: `${sections.length} items deleted` });
    } catch (err) {
        next(err);
    }
};

const getRevisions = async (req, res, next) => {
    try {
        const { page, section } = req.params;
        const result = await query(
            "SELECT * FROM content_revisions WHERE page = $1 AND section = $2 ORDER BY created_at DESC LIMIT $3",
            [page, section, MAX_REVISIONS]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const getAllRevisions = async (req, res, next) => {
    try {
        const result = await query(
            "SELECT * FROM content_revisions ORDER BY created_at DESC LIMIT 50"
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const undoContent = async (req, res, next) => {
    try {
        const { revisionId } = req.body;
        if (!revisionId) {
            return res.status(400).json({ success: false, error: 'revisionId is required' });
        }

        const revision = await query("SELECT * FROM content_revisions WHERE id = $1", [revisionId]);
        if (revision.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Revision not found' });
        }

        const rev = revision.rows[0];

        await saveRevision(null, rev.page, rev.section);

        await run(
            "UPDATE website_content SET content_type = $1, content = $2, image = $3, updated_at = CURRENT_TIMESTAMP WHERE page = $4 AND section = $5",
            [rev.old_content_type, rev.old_content, rev.old_image, rev.page, rev.section]
        );

        await run("DELETE FROM content_revisions WHERE id = $1", [revisionId]);

        res.json({ success: true, message: 'Content restored successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getContent,
    createContent,
    updateContent,
    deleteContent,
    saveFooter,
    getHomePage,
    updateHomePage,
    bulkUpdateContent,
    bulkDeleteContent,
    getRevisions,
    getAllRevisions,
    undoContent
};
