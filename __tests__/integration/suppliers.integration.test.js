jest.mock('../../src/lib/prisma', () => {
  const prisma = new Proxy({}, {
    get(target, model) {
      if (!target[model]) {
        target[model] = new Proxy({}, {
          get(delegate, method) {
            if (!delegate[method]) delegate[method] = jest.fn();
            return delegate[method];
          },
        });
      }
      return target[model];
    },
  });
  return { prisma };
});

const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');
const { generateToken } = require('../../src/core/utils/jwt.util');

const users = [
  { id: 1, username: 'admin-one', email: 'admin-one@example.test', role: 'ADMIN', isActive: true, organizationId: 10, clinics: [{ id: 1 }] },
  { id: 2, username: 'admin-two', email: 'admin-two@example.test', role: 'ADMIN', isActive: true, organizationId: 20, clinics: [{ id: 2 }] },
  { id: 3, username: 'vet-one', email: 'vet-one@example.test', role: 'VET', isActive: true, organizationId: 10, clinics: [{ id: 1 }] },
];

const tokenFor = (id) => generateToken({ id });

describe('Supplier HTTP integration', () => {
  let suppliers;
  let nextId;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    suppliers = [];
    nextId = 1;

    prisma.user.findUnique.mockImplementation(({ where }) => users.find((user) => user.id === where.id) || null);
    prisma.supplier.findMany.mockImplementation(({ where }) => suppliers
      .filter((supplier) => supplier.clinicId === where.clinicId)
      .filter((supplier) => where.isActive === undefined || supplier.isActive === where.isActive)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((supplier) => ({ ...supplier, _count: { products: 0 } })));
    prisma.supplier.findFirst.mockImplementation(({ where }) => {
      if (where.OR) {
        return suppliers.find((supplier) => supplier.clinicId === where.clinicId
          && supplier.id !== where.id?.not
          && where.OR.some((condition) => Object.entries(condition).every(([key, value]) => supplier[key] === value))) || null;
      }
      return suppliers.find((supplier) => supplier.id === where.id && supplier.clinicId === where.clinicId) || null;
    });
    prisma.supplier.create.mockImplementation(({ data }) => {
      const supplier = { id: nextId++, ...data, isActive: true };
      suppliers.push(supplier);
      return supplier;
    });
    prisma.supplier.update.mockImplementation(({ where, data }) => {
      const supplier = suppliers.find((item) => item.id === where.id && item.clinicId === where.clinicId);
      if (!supplier) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
      Object.assign(supplier, data);
      return supplier;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates providers using the authenticated clinic, ignoring clinicId in the request body', async () => {
    const response = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .send({ name: '  Distribuidora Norte  ', clinicId: 2 })
      .expect(201);

    expect(response.body.supplier).toMatchObject({ id: 1, name: 'Distribuidora Norte', clinicId: 1 });
    expect(prisma.supplier.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Distribuidora Norte', clinicId: 1 }),
    });
  });

  it('lists only the authenticated clinic even when another clinicId is requested', async () => {
    suppliers = [
      { id: 1, name: 'Norte', clinicId: 1, isActive: true },
      { id: 2, name: 'Sur', clinicId: 2, isActive: true },
    ];

    const response = await request(app)
      .get('/api/suppliers?clinicId=2')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .expect(200);

    expect(response.body.suppliers.map(({ name }) => name)).toEqual(['Norte']);
    expect(prisma.supplier.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clinicId: 1 } }));
  });

  it('does not allow an admin to edit a provider owned by another clinic', async () => {
    suppliers = [{ id: 8, name: 'Sur', clinicId: 2, isActive: true }];

    const response = await request(app)
      .put('/api/suppliers/8')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .send({ name: 'Modificado' })
      .expect(404);

    expect(response.body.code).toBe('SUPPLIER_NOT_FOUND');
    expect(prisma.supplier.update).not.toHaveBeenCalled();
  });

  it('allows the clinic admin to edit and deactivate its provider', async () => {
    suppliers = [{ id: 5, name: 'Nombre previo', clinicId: 1, isActive: true }];

    await request(app)
      .put('/api/suppliers/5')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .send({ name: 'Nombre actualizado' })
      .expect(200);
    await request(app)
      .patch('/api/suppliers/5/status')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .send({ isActive: false })
      .expect(200);

    expect(suppliers[0]).toMatchObject({ name: 'Nombre actualizado', isActive: false });
    const activeResponse = await request(app)
      .get('/api/suppliers?activeOnly=true')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .expect(200);
    expect(activeResponse.body.suppliers).toEqual([]);
  });

  it('rejects unauthenticated and non-admin direct API calls', async () => {
    await request(app).get('/api/suppliers').expect(401);
    await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(3)}`)
      .send({ name: 'No autorizado' })
      .expect(403);

    expect(prisma.supplier.create).not.toHaveBeenCalled();
  });
});
