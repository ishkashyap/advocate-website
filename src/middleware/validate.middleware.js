const { validationResult, body } = require('express-validator');

// Helper to return validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

const bookingValidation = [
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone is required').escape(),
    body('service').trim().notEmpty().withMessage('Service is required').escape(),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('time').trim().notEmpty().withMessage('Time is required'),
    body('message').optional().trim().escape(),
    validate
];

const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required').escape(),
    body('password').notEmpty().withMessage('Password is required'),
    validate
];

const createBlogValidation = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('author').optional().trim().escape(),
    validate
];

const updateBlogValidation = [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('content').optional().trim(),
    body('author').optional().trim().escape(),
    validate
];

const contactValidation = [
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').optional().trim().isMobilePhone('en-IN').withMessage('Valid Indian phone number required').escape(),
    body('subject').optional().trim().escape(),
    body('message').optional().trim().escape(),
    validate
];

module.exports = {
    bookingValidation,
    loginValidation,
    createBlogValidation,
    updateBlogValidation,
    contactValidation
};
