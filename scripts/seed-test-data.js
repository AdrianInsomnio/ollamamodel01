require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { prisma } = require('../src/lib/prisma');

const firstNames = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hugo',
  'Irene', 'Joaquín', 'Karina', 'Lucía', 'Martín', 'Natalia', 'Oscar', 'Paula',
  'Ramiro', 'Sofía', 'Tomás', 'Valentina',
];
const lastNames = [
  'Pereira', 'Gómez', 'Rodríguez', 'Fernández', 'Silva', 'Méndez', 'Sosa',
  'Castro', 'Rossi', 'Varela',
];
const petNames = {
  Perro: ['Luna', 'Toby', 'Rocky', 'Mora', 'Nala', 'Bruno', 'Simba'],
  Gato: ['Michi', 'Salem', 'Nina', 'Oliver', 'Milo', 'Cleo', 'Pelusa'],
  Ave: ['Pico', 'Kiwi', 'Lola', 'Coco', 'Pepa', 'Sol', 'Pluma'],
};
const species = ['Perro', 'Gato', 'Ave'];

function buildPets(clientNumber) {
  const amount = 1 + ((clientNumber - 1) % 3);

  return Array.from({ length: amount }, (_, index) => {
    const kind = species[(clientNumber + index - 1) % species.length];
    const names = petNames[kind];

    return {
      name: `${names[(clientNumber + index) % names.length]} ${clientNumber}`,
      species: kind,
      breed: kind === 'Perro'
        ? ['Mestizo', 'Labrador', 'Caniche'][index % 3]
        : kind === 'Gato'
          ? ['Mestizo', 'Siamés', 'Europeo'][index % 3]
          : ['Canario', 'Periquito', 'Cacatúa'][index % 3],
      sex: index % 2 === 0 ? 'Macho' : 'Hembra',
      notes: 'Registro generado por seed de datos de prueba.',
    };
  });
}

async function main() {
  const requestedClinicId = process.env.CLINIC_ID ? Number(process.env.CLINIC_ID) : null;
  const clinic = requestedClinicId
    ? await prisma.clinic.findFirst({ where: { id: requestedClinicId, isActive: true } })
    : await prisma.clinic.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });

  if (!clinic) {
    throw new Error('No se encontró una clínica activa. Define CLINIC_ID o crea una clínica primero.');
  }

  let createdClients = 0;
  let skippedClients = 0;
  let createdPets = 0;

  await prisma.$transaction(async (tx) => {
    for (let index = 1; index <= 50; index += 1) {
      const documentId = `SEED-CLIENT-${String(index).padStart(3, '0')}`;
      const existing = await tx.client.findUnique({
        where: { documentId },
        select: { id: true },
      });

      if (existing) {
        skippedClients += 1;
        continue;
      }

      const firstName = firstNames[(index - 1) % firstNames.length];
      const lastName = lastNames[Math.floor((index - 1) / firstNames.length) % lastNames.length];
      const pets = buildPets(index);

      await tx.client.create({
        data: {
          name: `${firstName} ${lastName}`,
          documentId,
          email: `seed.client.${String(index).padStart(3, '0')}@example.test`,
          phone: `099${String(100000 + index).slice(-6)}`,
          address: `Calle de prueba ${index}, Montevideo`,
          notes: 'Cliente generado por seed de datos de prueba.',
          clinicId: clinic.id,
          pets: { create: pets },
        },
      });

      createdClients += 1;
      createdPets += pets.length;
    }
  });

  console.log(`Clínica utilizada: ${clinic.id} - ${clinic.name}`);
  console.log(`Clientes creados: ${createdClients}`);
  console.log(`Clientes ya existentes omitidos: ${skippedClients}`);
  console.log(`Mascotas creadas: ${createdPets}`);
}

main()
  .catch((error) => {
    console.error('No se pudieron crear los datos de prueba:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
