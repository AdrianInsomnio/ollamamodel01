const mysql = require('mysql2/promise');
const dbConfig = require('./database');

let pool;

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call testConnection() first.');
  }
  return pool;
};

const setPool = (p) => {
  pool = p;
};

// Test connection and create database if needed
const testConnection = async () => {
  try {
    // First connect without database to create it
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if not exists
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    console.log('Database created or already exists');

    // Close temp connection
    await tempConnection.end();

    // Now connect to the database
    pool = mysql.createPool(dbConfig);
    console.log('MySQL connected successfully');
    return true;
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    return false;
  }
};

module.exports = { getPool, setPool, testConnection };
