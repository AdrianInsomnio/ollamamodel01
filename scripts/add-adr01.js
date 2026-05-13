const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding Adr01 organization and vet user...');

  // Create Organization Adr01
  const org = await prisma.organization.create({
    data: { name: 'Clínica Adr01' }
  });
  console.log('✅ Organization created:', org.name, 'ID:', org.id);

  // Create Vet User
  const hashedPassword = await bcrypt.hash('adr01234', 10);
  const user = await prisma.user.create({
    data: {
      username: 'adr01_vet',
      email: 'adr01@veterinaria.com',
      password: hashedPassword,
      organizationId: org.id
    }
  });
  console.log('✅ Vet user created:', user.email);

  console.log('\n📋 Login credentials:');
  console.log('   Email: adr01@veterinaria.com');
  console.log('   Password: adr01234');
  console.log('   Organization ID:', org.id);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });