const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Create the missing organization that clinics reference
  await prisma.$executeRawUnsafe(`
    INSERT INTO organizations (id, name, address, phone, email, taxId, isActive, timezone, createdAt, updatedAt)
    VALUES (2, 'Organización Principal', 'Dirección Principal', '+59894560195', 'appxims@gmail.com', '1231213321123', 1, 'America/Montevideo', NOW(), NOW())
    ON DUPLICATE KEY UPDATE name=VALUES(name)
  `);
  console.log('Organization created/updated');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });