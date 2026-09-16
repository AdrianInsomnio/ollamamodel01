const { AppError } = require('../errors/AppError');

const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details || undefined
    });
  }

  // Handle MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      code: 'DUPLICATE_ENTRY',
      message: 'Duplicate entry',
    });
  }

  // Handle Prisma/DB errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
    });
  }

  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong!',
  });
};

module.exports = { errorMiddleware };
