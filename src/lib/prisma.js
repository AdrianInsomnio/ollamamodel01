const { PrismaClient } = require('../generated/prisma');

let prisma;

try {
  prisma = new PrismaClient();
  console.log('[prisma] PrismaClient instantiated successfully');
} catch (error) {
  console.error('[prisma] ERROR al crear PrismaClient:', error.message || error);
  // Exportamos un objeto vacio para evitar que el require falle, pero las
  // llamadas posteriores fallaran claramente si no esta inicializado.
  prisma = {};
}

module.exports = { prisma };