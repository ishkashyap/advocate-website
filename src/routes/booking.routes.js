const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { bookingValidation } = require('../middleware/validate.middleware');

router.post('/', bookingValidation, bookingController.createBooking);
router.get('/lookup', bookingController.lookupBooking);
router.put('/cancel', authenticateToken, bookingController.cancelBooking);

// Protected routes
router.get('/', authenticateToken, bookingController.getBookings);
router.put('/:id/status', authenticateToken, bookingController.updateBookingStatus);
router.delete('/:id', authenticateToken, bookingController.deleteBooking);

module.exports = router;
