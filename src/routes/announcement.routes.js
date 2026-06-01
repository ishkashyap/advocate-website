const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', announcementController.getAnnouncements);

// Protected routes
router.post('/', authenticateToken, announcementController.createAnnouncement);
router.put('/:id', authenticateToken, announcementController.updateAnnouncement);
router.delete('/:id', authenticateToken, announcementController.deleteAnnouncement);

module.exports = router;
