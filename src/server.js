const { env } = require('./config/env');
console.log('authViaCookie:', env.authViaCookie);

const { prisma } = require('./lib/prisma');
// Cache the resolved prisma for any future requires
require.cache[require.resolve('./lib/prisma')].exports = { prisma };

const app = require('./app');
const { testConnection } = require('./config/connection');
const { initDatabase } = require('./config/initDb');

const PORT = env.port || 3000;
console.log('PORT:', PORT);

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to MySQL. Server will start anyway.');
    } else {
      // Initialize database tables
      await initDatabase();
    }

    // Connect Prisma
    await prisma.$connect();
    console.log('Prisma connected successfully');

    //console.log('About to start listening on port ' + PORT);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
