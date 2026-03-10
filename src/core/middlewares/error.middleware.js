const { AppError } = require('../errors/AppError');

const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Handle MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      error: 'Duplicate entry'
    });
  }

  res.status(500).json({ error: 'Something went wrong!' });
};

module.exports = { errorMiddleware };
