const express = require('express');
const router = express.Router();
const officeController = require('../controllers/office.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', officeController.getOffices);
router.post('/', authenticateToken, officeController.createOffice);
router.put('/:id', authenticateToken, officeController.updateOffice);
router.delete('/:id', authenticateToken, officeController.deleteOffice);

module.exports = router;