const { run } = require('../config/database');

const requestReportDownload = async (req, res, next) => {
    try {
        const { email, state, suitValue, feeAmount } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        await run(
            "INSERT INTO report_downloads (email, state, suit_value, fee_amount) VALUES ($1, $2, $3, $4)",
            [email, state || '', suitValue || '', feeAmount || '']
        );

        res.json({ success: true, message: 'Report link sent to your email.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { requestReportDownload };
