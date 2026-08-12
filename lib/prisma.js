// lib/prisma.js - versión sin try/catch para exponer errores de inicialización
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');

console.log('[prisma] START');
const factory = new PrismaMariaDb({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ollmodel',
});
console.log('[prisma] Factory created:', factory);
console.log('[prisma] Factory type:', typeof factory);
console.log('[prisma] Factory.connect exists?', typeof factory.connect);
if (typeof factory.connect === 'function') {
  console.log('[prisma] Factory.connect to string:', factory.connect.toString());
}

// Wrap factory.connect to log when called
const originalConnect = factory.connect;
factory.connect = function () {
  console.log('[prisma] Factory.connect called');
  return originalConnect.call(this);
};

const prisma = new PrismaClient({ adapter: factory });
console.log('[prisma] PrismaClient created successfully');

module.exports = prisma;
