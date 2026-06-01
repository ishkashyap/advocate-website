const { query, get, run } = require('../config/database');
const sanitizeHtml = require('sanitize-html');
const { sendBookingStatusEmail } = require('../services/email.service');

const getBookings = async (req, res, next) => {
    try {
        const result = await query("SELECT * FROM bookings ORDER BY created_at DESC");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const createBooking = async (req, res, next) => {
    try {
        const { name, email, phone, service, date, time } = req.body;
        const message = req.body.message ? sanitizeHtml(req.body.message) : '';

        const result = await run(
            "INSERT INTO bookings (name, email, phone, service, date, time, message) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            [name, email, phone, service, date, time, message]
        );

        res.status(201).json({ success: true, id: result.lastID, message: 'Booking successful' });
    } catch (err) {
        next(err);
    }
};

const updateBookingStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status value' });
        }
        const booking = await get("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        await run("UPDATE bookings SET status = $1 WHERE id = $2", [status, req.params.id]);

        try {
            await sendBookingStatusEmail(booking, status);
        } catch (emailErr) {
            console.error('Email notification failed:', emailErr.message);
        }

        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        next(err);
    }
};

const lookupBooking = async (req, res, next) => {
    try {
        const { email, date } = req.query;
        if (!email || !date) {
            return res.status(400).json({ success: false, error: 'Email and date are required' });
        }
        const result = await query(
            "SELECT * FROM bookings WHERE email = $1 AND date = $2 AND status != 'cancelled'",
            [email, date]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

const cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.body;
        const booking = await get("SELECT * FROM bookings WHERE id = $1", [id]);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Booking is already cancelled' });
        }
        await run("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);

        try {
            await sendBookingStatusEmail(booking, 'cancelled');
        } catch (emailErr) {
            console.error('Cancel email notification failed:', emailErr.message);
        }

        res.json({ success: true, message: 'Booking cancelled' });
    } catch (err) {
        next(err);
    }
};

const deleteBooking = async (req, res, next) => {
    try {
        const result = await run("DELETE FROM bookings WHERE id = $1", [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        res.json({ success: true, message: 'Booking deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getBookings,
    createBooking,
    updateBookingStatus,
    lookupBooking,
    cancelBooking,
    deleteBooking
};
