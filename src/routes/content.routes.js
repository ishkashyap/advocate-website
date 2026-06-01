const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const { uploadSmall } = require('../middleware/upload.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', contentController.getContent);
router.post('/bulk', authenticateToken, contentController.bulkUpdateContent);
router.post('/bulk-delete', authenticateToken, contentController.bulkDeleteContent);

// Admin Home Page routes
router.get('/admin/home', contentController.getHomePage);
router.post('/admin/home/update', authenticateToken, uploadSmall.single('image'), contentController.updateHomePage);

// Protected routes - 5MB limit for content images
router.post('/', authenticateToken, uploadSmall.single('image'), contentController.createContent);
router.put('/:id', authenticateToken, uploadSmall.single('image'), contentController.updateContent);
router.delete('/:id', authenticateToken, contentController.deleteContent);
router.post('/footer', authenticateToken, contentController.saveFooter);
router.get('/revisions', authenticateToken, contentController.getAllRevisions);
router.get('/revisions/:page/:section', authenticateToken, contentController.getRevisions);
router.post('/undo', authenticateToken, contentController.undoContent);

module.exports = router;
