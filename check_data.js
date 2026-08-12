const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.$queryRawUnsafe('SELECT * FROM organizations');
  console.log('Organizations:', JSON.stringify(orgs, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
  const clinics = await prisma.$queryRawUnsafe('SELECT * FROM clinics');
  console.log('Clinics:', JSON.stringify(clinics, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });