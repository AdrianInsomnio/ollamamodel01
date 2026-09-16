const password = process.env.DB_PASSWORD;

if (process.env.NODE_ENV === 'production' && (!password || password === 'Dev1234')) {
  throw new Error('DB_PASSWORD must be configured with a non-default value in production');
}

module.exports = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password,
  database: process.env.DB_NAME || 'ollmodel',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
