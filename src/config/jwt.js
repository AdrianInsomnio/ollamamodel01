const secret = process.env.JWT_SECRET;

if (!secret || secret === 'your-secret-key-change-in-production') {
  throw new Error('JWT_SECRET must be configured with a non-default value');
}

module.exports = {
  secret,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
};
