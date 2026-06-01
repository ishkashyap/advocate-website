const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const blogRoutes = require('./blog.routes');
const bookingRoutes = require('./booking.routes');
const contentRoutes = require('./content.routes');
const officeRoutes = require('./office.routes');
const announcementRoutes = require('./announcement.routes');
const teamRoutes = require('./team.routes');
const contactRoutes = require('./contact.routes');
const reportRoutes = require('./report.routes');
const feeRoutes = require('./fee.routes');

router.use('/auth', authRoutes);
router.use('/blogs', blogRoutes);
router.use('/bookings', bookingRoutes);
router.use('/website-content', contentRoutes);
router.use('/office-branches', officeRoutes);
router.use('/announcements', announcementRoutes);
router.use('/team-members', teamRoutes);
router.use('/contacts', contactRoutes);
router.use('/reports', reportRoutes);
router.use('/fee', feeRoutes);

module.exports = router;
