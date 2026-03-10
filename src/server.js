require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/connection');
const { initDatabase } = require('./config/initDb');

const PORT = process.env.PORT || 3000;

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

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

startServer();