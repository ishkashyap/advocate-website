const express = require('express');
const router = express.Router();
const { requestReportDownload } = require('../controllers/report.controller');

router.post('/download-request', requestReportDownload);

module.exports = router;
