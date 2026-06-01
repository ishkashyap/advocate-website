const { nodeEnv } = require('../config/env');

const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    
    if (nodeEnv === 'development') {
        console.error(err.stack);
    }

    const statusCode = err.statusCode || 500;
    const message = nodeEnv === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error');

    res.status(statusCode).json({
        success: false,
        error: message,
        stack: nodeEnv === 'development' ? err.stack : undefined
    });
};

const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API Endpoint Not Found'
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
