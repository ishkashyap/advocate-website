const express = require('express');
const router = express.Router();
const { getStates, getCaseTypes, getRules, calculateFee } = require('../controllers/fee.controller');

router.get('/states', getStates);
router.get('/case-types', getCaseTypes);
router.get('/rules', getRules);
router.get('/calculate', calculateFee);

module.exports = router;
