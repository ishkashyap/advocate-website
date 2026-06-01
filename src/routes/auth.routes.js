const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginValidation } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.checkAuth);
router.put('/change-credentials', authenticateToken, authController.changeCredentials);

module.exports = router;
