const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Organization
  const org = await prisma.organization.create({
    data: { name: 'Veterinaria San Marcos' }
  });
  console.log('✅ Organization created:', org.name);

  // Create Admin User
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@veterinarian.com',
      password: hashedPassword,
      organizationId: org.id
    }
  });
  console.log('✅ Admin user created:', user.email);

  // Create Clients
  const clients = await Promise.all([
    prisma.client.create({
      data: { name: 'Juan Pérez', phone: '555-1234', email: 'juan@test.com', organizationId: org.id }
    }),
    prisma.client.create({
      data: { name: 'María García', phone: '555-5678', email: 'maria@test.com', organizationId: org.id }
    }),
    prisma.client.create({
      data: { name: 'Carlos López', phone: '555-9012', email: 'carlos@test.com', organizationId: org.id }
    }),
  ]);
  console.log('✅ 3 clients created');

  // Create Pets
  const pets = await Promise.all([
    prisma.pet.create({
      data: { name: 'Firulais', species: 'Perro', breed: 'Labrador', clientId: clients[0].id, organizationId: org.id }
    }),
    prisma.pet.create({
      data: { name: 'Michi', species: 'Gato', breed: 'Persa', clientId: clients[0].id, organizationId: org.id }
    }),
    prisma.pet.create({
      data: { name: 'Rex', species: 'Perro', breed: 'Pastor Alemán', clientId: clients[1].id, organizationId: org.id }
    }),
    prisma.pet.create({
      data: { name: 'Luna', species: 'Gato', breed: 'Siames', clientId: clients[2].id, organizationId: org.id }
    }),
  ]);
  console.log('✅ 4 pets created');

  // Create Appointments
  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        date: new Date('2026-04-10T10:00:00'),
        status: 'scheduled',
        clientId: clients[0].id,
        petId: pets[0].id,
        organizationId: org.id
      }
    }),
    prisma.appointment.create({
      data: {
        date: new Date('2026-04-11T14:30:00'),
        status: 'scheduled',
        clientId: clients[1].id,
        petId: pets[2].id,
        organizationId: org.id
      }
    }),
  ]);
  console.log('✅ 2 appointments created');

  // Create Products
  const products = await Promise.all([
    prisma.product.create({
      data: { name: 'Antiparasitario', price: 25.99, organizationId: org.id }
    }),
    prisma.product.create({
      data: { name: 'Vitaminas', price: 35.50, organizationId: org.id }
    }),
    prisma.product.create({
      data: { name: 'Shampoo Médico', price: 18.00, organizationId: org.id }
    }),
  ]);
  console.log('✅ 3 products created');

  // Create Services
  const services = await Promise.all([
    prisma.service.create({
      data: { name: 'Consulta General', price: 50.00, organizationId: org.id }
    }),
    prisma.service.create({
      data: { name: 'Vacunación', price: 35.00, organizationId: org.id }
    }),
    prisma.service.create({
      data: { name: 'Cirugía', price: 250.00, organizationId: org.id }
    }),
  ]);
  console.log('✅ 3 services created');

  // Create Consultation
  const consultation = await prisma.consultation.create({
    data: {
      petId: pets[0].id,
      clientId: clients[0].id,
      organizationId: org.id,
      notes: 'Primera consulta de control anual. Paciente en buen estado de salud.'
    }
  });
  console.log('✅ 1 consultation created');

  // Create Diagnosis, Treatment, Prescription
  await prisma.diagnosis.create({
    data: { consultationId: consultation.id, description: '良好 (Buen estado general)' }
  });

  await prisma.treatment.create({
    data: { consultationId: consultation.id, description: 'Aplicar vacuna antirrábica' }
  });

  await prisma.prescription.create({
    data: { consultationId: consultation.id, description: 'Antiparasitario mensual' }
  });
  console.log('✅ 1 diagnosis, 1 treatment, 1 prescription created');

  // Create Sale
  const sale = await prisma.sale.create({
    data: {
      clientId: clients[0].id,
      petId: pets[0].id,
      consultationId: consultation.id,
      organizationId: org.id,
      total: 111.49,
      status: 'completed',
      items: {
        create: [
          {
            itemType: 'Product',
            itemId: products[0].id,
            nameSnapshot: products[0].name,
            priceSnapshot: products[0].price,
            quantity: 1,
            subtotal: products[0].price
          },
          {
            itemType: 'Service',
            itemId: services[0].id,
            nameSnapshot: services[0].name,
            priceSnapshot: services[0].price,
            quantity: 1,
            subtotal: services[0].price
          }
        ]
      }
    }
  });
  console.log('✅ 1 sale with items created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: admin@veterinarian.com');
  console.log('   Password: password123');
  console.log('   Organization ID:', org.id);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
