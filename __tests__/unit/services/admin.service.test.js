const adminService = require('../../../src/modules/admin/admin.service');
const { prisma } = require('../../../src/lib/prisma');
const { AppError } = require('../../../src/core/errors/AppError');

// Mock selectivo: conservar helpers puros (getDayRangeInTimezone) y mockear
// las funciones que tocan Prisma para mantener aislada la unidad.
jest.mock('../../../src/modules/admin/admin.repository', () => {
  const actual = jest.requireActual('../../../src/modules/admin/admin.repository');
  return {
    ...actual,
    getClinicMetrics: jest.fn(),
    findClinicsByOrganization: jest.fn(),
    findClinicsWithMetrics: jest.fn(),
    findUsersWithMetrics: jest.fn(),
  };
});

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
  },
}));

const adminRepository = require('../../../src/modules/admin/admin.repository');
const mockAdminRepository = jest.mocked(adminRepository);
const mockPrisma = jest.mocked(prisma);

describe('Admin Service - getDashboardMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseOrganization = {
    id: 1,
    name: 'Clinica Test',
    timezone: 'America/Montevideo',
  };

  const baseClinics = [
    { id: 10, name: 'Sucursal Centro', isDefault: true, timezone: 'America/Montevideo' },
    { id: 11, name: 'Sucursal Norte', isDefault: false, timezone: 'America/Montevideo' },
  ];

  const baseMetrics = {
    openConsultations: 3,
    closedConsultationsToday: 5,
    activeClients: 100,
    activePets: 150,
    salesToday: { count: 7, total: 1500, tax: 184.21, subtotal: 1315.79 },
  };

  describe('Permisos', () => {
    it('deberia lanzar 403 si el rol no es ADMIN ni SUPER_ADMIN', async () => {
      await expect(
        adminService.getDashboardMetrics({ role: 'USER', organizationId: 1 })
      ).rejects.toBeInstanceOf(AppError);
      await expect(
        adminService.getDashboardMetrics({ role: 'VET', organizationId: 1 })
      ).rejects.toBeInstanceOf(AppError);

      try {
        await adminService.getDashboardMetrics({ role: 'USER', organizationId: 1 });
      } catch (e) {
        expect(e.statusCode).toBe(403);
        expect(e.code).toBe('FORBIDDEN');
      }
    });

    it('deberia lanzar 404 si la organization no existe', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      await expect(
        adminService.getDashboardMetrics({ role: 'ADMIN', organizationId: 99 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('Scope clinic (ADMIN)', () => {
    it('deberia devolver metricas de la clinica default con totals correctos', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
      mockAdminRepository.findClinicsByOrganization.mockResolvedValue(baseClinics);
      mockAdminRepository.getClinicMetrics.mockResolvedValue(baseMetrics);

      const result = await adminService.getDashboardMetrics({
        role: 'ADMIN',
        organizationId: 1,
      });

      expect(result.scope).toBe('clinic');
      expect(result.clinics).toHaveLength(1);
      expect(result.clinics[0].id).toBe(10);
      expect(result.clinics[0].isDefault).toBe(true);
      // Totals correctos
      expect(result.totals.salesTodayTotal).toBe(1500);
      expect(result.totals.salesTodayCount).toBe(7);
      expect(result.totals.openConsultations).toBe(3);
      expect(result.totals.closedConsultationsToday).toBe(5);
      expect(result.totals.activeClients).toBe(100);
      expect(result.totals.activePets).toBe(150);
      expect(result.totals.clinicsCount).toBe(1);
      expect(result.organization.timezone).toBe('America/Montevideo');
      expect(result.generatedAt).toBeDefined();
    });

    it('deberia caer a la primera clinica si no hay default', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
      mockAdminRepository.findClinicsByOrganization.mockResolvedValue([
        { id: 11, name: 'Sucursal Norte', isDefault: false, timezone: 'America/Montevideo' },
      ]);
      mockAdminRepository.getClinicMetrics.mockResolvedValue(baseMetrics);

      const result = await adminService.getDashboardMetrics({
        role: 'ADMIN',
        organizationId: 1,
      });

      expect(result.clinics[0].id).toBe(11);
    });

    it('deberia devolver clinica vacia si la org no tiene clinicas', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
      mockAdminRepository.findClinicsByOrganization.mockResolvedValue([]);

      const result = await adminService.getDashboardMetrics({
        role: 'ADMIN',
        organizationId: 1,
      });

      expect(result.clinics).toEqual([]);
      expect(result.totals.salesTodayTotal).toBe(0);
      expect(result.totals.openConsultations).toBe(0);
      expect(result.totals.clinicsCount).toBe(0);
    });
  });

  describe('Scope organization (SUPER_ADMIN)', () => {
    it('deberia devolver una entrada por clinica con totales agregados', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
      mockAdminRepository.findClinicsByOrganization.mockResolvedValue(baseClinics);
      mockAdminRepository.getClinicMetrics
        .mockResolvedValueOnce({
          openConsultations: 2,
          closedConsultationsToday: 4,
          activeClients: 50,
          activePets: 80,
          salesToday: { count: 5, total: 1000, tax: 122.81, subtotal: 877.19 },
        })
        .mockResolvedValueOnce({
          openConsultations: 1,
          closedConsultationsToday: 1,
          activeClients: 30,
          activePets: 40,
          salesToday: { count: 2, total: 500, tax: 61.4, subtotal: 438.6 },
        });

      const result = await adminService.getDashboardMetrics({
        role: 'SUPER_ADMIN',
        organizationId: 1,
      });

      expect(result.scope).toBe('organization');
      expect(result.clinics).toHaveLength(2);
      // Totales agregados
      expect(result.totals.salesTodayTotal).toBe(1500);
      expect(result.totals.salesTodayCount).toBe(7);
      expect(result.totals.salesTodayTax).toBeCloseTo(184.21, 1);
      expect(result.totals.openConsultations).toBe(3);
      expect(result.totals.closedConsultationsToday).toBe(5);
      expect(result.totals.activeClients).toBe(80);
      expect(result.totals.activePets).toBe(120);
      expect(result.totals.clinicsCount).toBe(2);
    });

    it('deberia llamar a getClinicMetrics una vez por clinica', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
      mockAdminRepository.findClinicsByOrganization.mockResolvedValue(baseClinics);
      mockAdminRepository.getClinicMetrics.mockResolvedValue(baseMetrics);

      await adminService.getDashboardMetrics({
        role: 'SUPER_ADMIN',
        organizationId: 1,
      });

      expect(mockAdminRepository.getClinicMetrics).toHaveBeenCalledTimes(2);
      expect(mockAdminRepository.getClinicMetrics).toHaveBeenCalledWith(
        10, 1, 'America/Montevideo'
      );
      expect(mockAdminRepository.getClinicMetrics).toHaveBeenCalledWith(
        11, 1, 'America/Montevideo'
      );
    });
  });
});

describe('Admin Service - listClinics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseOrganization = {
    id: 1,
    name: 'Org Test',
    timezone: 'America/Montevideo',
  };

  it('deberia lanzar 403 si el rol no es ADMIN ni SUPER_ADMIN', async () => {
    await expect(
      adminService.listClinics({ role: 'USER', organizationId: 1 })
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      adminService.listClinics({ role: 'VET', organizationId: 1 })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deberia lanzar 404 si la organization no existe', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    await expect(
      adminService.listClinics({ role: 'SUPER_ADMIN', organizationId: 99 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('SUPER_ADMIN: deberia devolver todas las clinicas (activas e inactivas) con metricas', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
    mockAdminRepository.findClinicsWithMetrics.mockResolvedValue([
      {
        id: 10,
        name: 'Centro',
        isDefault: true,
        isActive: true,
        timezone: 'America/Montevideo',
        metrics: { openConsultations: 2, closedConsultationsToday: 3, activeClients: 50, activePets: 70, salesToday: { count: 4, total: 800, tax: 100, subtotal: 700 } },
      },
      {
        id: 11,
        name: 'Norte',
        isDefault: false,
        isActive: true,
        timezone: 'America/Montevideo',
        metrics: { openConsultations: 1, closedConsultationsToday: 1, activeClients: 20, activePets: 30, salesToday: { count: 1, total: 200, tax: 25, subtotal: 175 } },
      },
      {
        id: 12,
        name: 'Cerrada',
        isDefault: false,
        isActive: false,
        timezone: 'America/Montevideo',
        metrics: null,
      },
    ]);

    const result = await adminService.listClinics({ role: 'SUPER_ADMIN', organizationId: 1 });
    expect(result.scope).toBe('organization');
    expect(result.clinics).toHaveLength(3);
    expect(result.clinics.find(c => c.id === 12).metrics).toBeNull();
    expect(result.organization.id).toBe(1);
    expect(result.generatedAt).toBeDefined();
  });

  it('ADMIN: deberia devolver solo la clinica default con metricas', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
    mockAdminRepository.findClinicsWithMetrics.mockResolvedValue([
      { id: 10, name: 'Centro', isDefault: true, isActive: true, timezone: 'America/Montevideo', metrics: { openConsultations: 1, closedConsultationsToday: 0, activeClients: 10, activePets: 12, salesToday: { count: 0, total: 0, tax: 0, subtotal: 0 } } },
      { id: 11, name: 'Norte', isDefault: false, isActive: true, timezone: 'America/Montevideo', metrics: null },
    ]);

    const result = await adminService.listClinics({ role: 'ADMIN', organizationId: 1 });
    expect(result.scope).toBe('clinic');
    expect(result.clinics).toHaveLength(1);
    expect(result.clinics[0].id).toBe(10);
  });

  it('ADMIN: deberia caer a la primera clinica si no hay default', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
    mockAdminRepository.findClinicsWithMetrics.mockResolvedValue([
      { id: 11, name: 'Norte', isDefault: false, isActive: true, timezone: 'America/Montevideo', metrics: { openConsultations: 0, closedConsultationsToday: 0, activeClients: 0, activePets: 0, salesToday: { count: 0, total: 0, tax: 0, subtotal: 0 } } },
    ]);

    const result = await adminService.listClinics({ role: 'ADMIN', organizationId: 1 });
    expect(result.clinics).toHaveLength(1);
    expect(result.clinics[0].id).toBe(11);
  });

  it('ADMIN: deberia devolver lista vacia si la org no tiene clinicas', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
    mockAdminRepository.findClinicsWithMetrics.mockResolvedValue([]);

    const result = await adminService.listClinics({ role: 'ADMIN', organizationId: 1 });
    expect(result.clinics).toEqual([]);
  });
});

describe('Admin Service - listUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseOrganization = { id: 1, name: 'Org Test', timezone: 'America/Montevideo' };

  it('deberia lanzar 403 si el rol no es SUPER_ADMIN', async () => {
    await expect(
      adminService.listUsers({ role: 'ADMIN', organizationId: 1 })
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      adminService.listUsers({ role: 'VET', organizationId: 1 })
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      adminService.listUsers({ role: 'USER', organizationId: 1 })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deberia lanzar 404 si la organization no existe', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    await expect(
      adminService.listUsers({ role: 'SUPER_ADMIN', organizationId: 99 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deberia devolver usuarios con campos seguros (sin password) y contadores', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
    mockAdminRepository.findUsersWithMetrics.mockResolvedValue([
      { id: 1, username: 'admin1', email: 'admin1@x.com', role: 'ADMIN', isActive: true, lastLogin: new Date('2026-06-01T10:00:00Z'), createdAt: new Date('2025-12-01'), clinicCount: 0 },
      { id: 2, username: 'vet1', email: 'vet1@x.com', role: 'VET', isActive: true, lastLogin: null, createdAt: new Date('2025-12-02'), clinicCount: 0 },
    ]);

    const result = await adminService.listUsers({ role: 'SUPER_ADMIN', organizationId: 1 });
    expect(result.users).toHaveLength(2);
    expect(result.users[0]).not.toHaveProperty('password');
    expect(result.users[0].clinicCount).toBe(0);
    expect(result.organization.id).toBe(1);
    expect(result.generatedAt).toBeDefined();
  });

  it('deberia devolver lista vacia si la org no tiene usuarios', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(baseOrganization);
    mockAdminRepository.findUsersWithMetrics.mockResolvedValue([]);

    const result = await adminService.listUsers({ role: 'SUPER_ADMIN', organizationId: 1 });
    expect(result.users).toEqual([]);
  });
});

describe('Admin Repository - getDayRangeInTimezone', () => {
  const { getDayRangeInTimezone } = require('../../../src/modules/admin/admin.repository');

  it('deberia devolver un rango valido del dia actual en la TZ', () => {
    const { start, end } = getDayRangeInTimezone('America/Montevideo');

    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    // La diferencia debe ser cercana a 24h - 1ms (un dia completo).
    const diffHours = (end - start) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  });

  it('deberia manejar distintas zonas horarias', () => {
    const { start: s1, end: e1 } = getDayRangeInTimezone('America/Montevideo');
    const { start: s2, end: e2 } = getDayRangeInTimezone('UTC');

    expect(s1).toBeInstanceOf(Date);
    expect(s2).toBeInstanceOf(Date);
    expect(e1).toBeInstanceOf(Date);
    expect(e2).toBeInstanceOf(Date);
  });
});
