const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { contactValidation } = require('../middleware/validate.middleware');

router.get('/', authenticateToken, contactController.getContacts);
router.post('/', contactValidation, contactController.createContact);
router.delete('/:id', authenticateToken, contactController.deleteContact);

module.exports = router;