require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { prisma } = require('../src/lib/prisma');

const groups = [
  {
    category: 'Articulos veterinarios',
    prefix: 'ART',
    products: [
      ['Camiseta para perro talle XS', 890],
      ['Camiseta para perro talle S', 990],
      ['Camiseta para perro talle M', 1190],
      ['Camiseta para perro talle L', 1390],
      ['Camiseta para perro talle XL', 1590],
      ['Impermeable para perro talle S', 1490],
      ['Impermeable para perro talle M', 1790],
      ['Impermeable para perro talle L', 2090],
      ['Abrigo polar para perro', 1890],
      ['Chaleco reflectivo para perro', 1290],
      ['Collar nylon ajustable', 390],
      ['Collar reforzado mediano', 590],
      ['Correa nylon 1.2 metros', 690],
      ['Correa retractil 3 metros', 1590],
      ['Arnes acolchado para perro', 1290],
      ['Arnes para gato con correa', 990],
      ['Plato plastico chico', 290],
      ['Plato plastico mediano', 390],
      ['Plato acero inoxidable mediano', 790],
      ['Plato acero inoxidable grande', 1090],
      ['Comedero doble antideslizante', 1290],
      ['Bebedero automatico 2 litros', 2490],
      ['Fuente de agua para gato', 2990],
      ['Cama acolchada chica', 2290],
      ['Cama acolchada mediana', 3290],
      ['Manta termica para mascota', 1490],
      ['Transportadora para gato', 2890],
      ['Transportadora para perro chico', 3490],
      ['Kit de higiene dental', 790],
      ['Cortaunas para mascotas', 490],
    ],
  },
  {
    category: 'Alimentos',
    prefix: 'ALI',
    products: [
      ['Alimento perro adulto 1 kg', 690],
      ['Alimento perro adulto 3 kg', 1790],
      ['Alimento perro adulto 8 kg', 3990],
      ['Alimento cachorro 1 kg', 790],
      ['Alimento cachorro 3 kg', 2090],
      ['Alimento perro senior 1 kg', 820],
      ['Alimento perro senior 3 kg', 2190],
      ['Alimento gato adulto 1 kg', 890],
      ['Alimento gato adulto 3 kg', 2490],
      ['Alimento gato castrado 1 kg', 990],
      ['Alimento gato castrado 3 kg', 2790],
      ['Alimento gatito 1 kg', 1090],
      ['Alimento humedo perro pollo 340 g', 290],
      ['Alimento humedo perro carne 340 g', 290],
      ['Alimento humedo gato pescado 85 g', 190],
      ['Alimento humedo gato pollo 85 g', 190],
      ['Semillas para canario 500 g', 390],
      ['Semillas para periquito 500 g', 420],
      ['Alimento para aves exoticas 1 kg', 790],
      ['Pasta de cria para aves 250 g', 490],
    ],
  },
  {
    category: 'Juguetes',
    prefix: 'JUG',
    products: [
      ['Pelota de goma chica', 290],
      ['Pelota de goma mediana', 490],
      ['Pelota con sonido', 690],
      ['Cuerda trenzada chica', 390],
      ['Cuerda trenzada grande', 790],
      ['Hueso de goma chico', 350],
      ['Hueso de goma grande', 690],
      ['Mordillo dental para perro', 590],
      ['Juguete dispensador de premios', 1290],
      ['Juguete interactivo nivel 1', 1590],
      ['Frisbee flexible', 790],
      ['Peluche perro chico', 590],
      ['Peluche perro grande', 990],
      ['Caña con plumas para gato', 390],
      ['Pelota con cascabel para gato', 290],
    ],
  },
];

const makeDescription = (category, name) => {
  if (category === 'Alimentos') return `${name}. Producto de prueba para alimentacion de mascotas.`;
  if (category === 'Juguetes') return `${name}. Juguete de prueba para enriquecer y entretener a la mascota.`;
  return `${name}. Articulo veterinario de prueba para la tienda.`;
};

async function findOrCreateCategory(tx, name, clinicId) {
  const existing = await tx.productCategory.findFirst({
    where: { name, clinicId },
    select: { id: true },
  });

  if (existing) return existing.id;

  const category = await tx.productCategory.create({
    data: {
      name,
      description: `Categoria de productos de prueba: ${name}.`,
      clinicId,
      isActive: true,
    },
    select: { id: true },
  });

  return category.id;
}

async function main() {
  const requestedClinicId = process.env.CLINIC_ID ? Number(process.env.CLINIC_ID) : null;
  const clinic = requestedClinicId
    ? await prisma.clinic.findFirst({ where: { id: requestedClinicId, isActive: true } })
    : await prisma.clinic.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });

  if (!clinic) {
    throw new Error('No se encontro una clinica activa. Define CLINIC_ID o crea una clinica primero.');
  }

  let created = 0;
  let skipped = 0;
  const summary = {};

  await prisma.$transaction(async (tx) => {
    for (const group of groups) {
      const categoryId = await findOrCreateCategory(tx, group.category, clinic.id);
      summary[group.category] = 0;

      for (let index = 0; index < group.products.length; index += 1) {
        const [name, price] = group.products[index];
        const sku = `TEST-${group.prefix}-${String(index + 1).padStart(3, '0')}`;
        const existing = await tx.product.findUnique({
          where: { sku },
          select: { id: true },
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        await tx.product.create({
          data: {
            name,
            description: makeDescription(group.category, name),
            sku,
            brand: 'Marca Test',
            supplier: 'Proveedor Test',
            categoryId,
            priceType: 'FIXED',
            price,
            cost: Math.round(price * 0.65 * 100) / 100,
            stock: group.category === 'Alimentos' ? 30 : 15,
            minStock: 5,
            maxStock: group.category === 'Alimentos' ? 80 : 40,
            ivaIncluded: true,
            isActive: true,
            clinicId: clinic.id,
          },
        });

        created += 1;
        summary[group.category] += 1;
      }
    }
  });

  console.log(`Clinica utilizada: ${clinic.id} - ${clinic.name}`);
  console.log(`Productos creados: ${created}`);
  console.log(`Productos ya existentes omitidos: ${skipped}`);
  Object.entries(summary).forEach(([category, count]) => {
    console.log(`${category}: ${count} creados`);
  });
}

main()
  .catch((error) => {
    console.error('No se pudieron crear los productos de prueba:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
