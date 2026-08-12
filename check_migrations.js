const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRawUnsafe('SELECT * FROM _prisma_migrations ORDER BY finished_at DESC');
  console.log(JSON.stringify(result, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });