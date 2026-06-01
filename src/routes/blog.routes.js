const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { upload } = require('../middleware/upload.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { createBlogValidation, updateBlogValidation } = require('../middleware/validate.middleware');

router.get('/', blogController.getBlogs);
router.get('/:id', blogController.getBlogById);

// Protected routes - 100MB upload limit for blog images
router.post('/', authenticateToken, upload.single('image'), createBlogValidation, blogController.createBlog);
router.put('/:id', authenticateToken, upload.single('image'), updateBlogValidation, blogController.updateBlog);
router.delete('/:id', authenticateToken, blogController.deleteBlog);

module.exports = router;
