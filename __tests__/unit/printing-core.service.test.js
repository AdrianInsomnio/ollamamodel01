jest.mock('../../src/modules/printing-core/printing.repository', () => ({
  findClinic: jest.fn(),
  findTarget: jest.fn(),
  findTemplate: jest.fn(),
  findTemplateVersion: jest.fn(),
  createBatch: jest.fn(),
  activateTemplateVersion: jest.fn(),
  deactivateResource: jest.fn(),
  findBatch: jest.fn(),
  findJob: jest.fn(),
  updateJob: jest.fn(),
  updateBatchStatus: jest.fn()
}));

const repository = require('../../src/modules/printing-core/printing.repository');
const service = require('../../src/modules/printing-core/printing.service');

describe('printing core service', () => {
  test('builds a versioned agnostic print contract', () => {
    const contract = service.buildContract({
      clinic: { id: 7, name: 'Mi Empresa' },
      sourceDocumentType: 'SALE',
      sourceDocumentId: 1542,
      variant: 'ORIGINAL',
      target: { code: 'CASHIER' },
      printer: { paperType: 'THERMAL', paperSize: 'THERMAL_80', orientation: 'PORTRAIT' },
      templateVersion: { version: 3, template: { id: 11 } },
      data: { items: [{ description: 'Producto', quantity: 1 }], context: { source: 'test' } }
    });

    expect(contract).toMatchObject({
      version: 1,
      document: { type: 'SALE', number: '1542', variant: 'ORIGINAL' },
      template: { id: '11', version: 3 },
      output: { targetId: 'CASHIER', paper: { type: 'THERMAL', size: 'THERMAL_80' } },
      business: { id: '7', name: 'Mi Empresa' },
      context: { source: 'test' }
    });
    expect(contract).not.toHaveProperty('html');
    expect(contract).not.toHaveProperty('escpos');
  });

  test('creates only authorized and compatible jobs', async () => {
    repository.findClinic.mockResolvedValue({ id: 7, name: 'Mi Empresa' });
    repository.findTarget.mockResolvedValue({
      id: 20,
      code: 'CASHIER',
      printer: { id: 30, paperType: 'THERMAL', paperSize: 'THERMAL_80', orientation: 'PORTRAIT', printAgentId: 40 }
    });
    repository.findTemplateVersion.mockResolvedValue({
      id: 50,
      status: 'ACTIVE',
      version: 3,
      paperType: 'THERMAL',
      paperSize: 'THERMAL_80',
      template: { id: 60 }
    });
    repository.createBatch.mockResolvedValue({ id: 70, jobs: [] });

    await service.createBatch({
      sourceDocumentType: 'SALE',
      sourceDocumentId: 1542,
      jobs: [{ targetId: 20, templateVersionId: 50 }]
    }, 7, 9);

    expect(repository.createBatch).toHaveBeenCalledWith(expect.objectContaining({
      clinicId: 7,
      requestedById: 9,
      jobs: [expect.objectContaining({ targetId: 20, printerId: 30, printAgentId: 40, templateVersionId: 50 })]
    }));
  });

  test('rejects an incompatible template and printer', async () => {
    repository.findClinic.mockResolvedValue({ id: 7, name: 'Mi Empresa' });
    repository.findTarget.mockResolvedValue({
      id: 20,
      code: 'CASHIER',
      printer: { id: 30, paperType: 'THERMAL', paperSize: 'THERMAL_80', orientation: 'PORTRAIT' }
    });
    repository.findTemplateVersion.mockResolvedValue({
      id: 50,
      status: 'ACTIVE',
      version: 3,
      paperType: 'SHEET',
      paperSize: 'A4',
      template: { id: 60 }
    });

    await expect(service.createBatch({
      sourceDocumentType: 'SALE',
      sourceDocumentId: 1542,
      jobs: [{ targetId: 20, templateVersionId: 50 }]
    }, 7, 9)).rejects.toMatchObject({ code: 'PRINT_INCOMPATIBLE', statusCode: 409 });
  });

  test('retries a failed job and recalculates the batch as processing', async () => {
    repository.findJob.mockResolvedValue({ id: 91, clinicId: 7, batchId: 70, status: 'FAILED' });
    repository.findBatch.mockResolvedValue({ id: 70, jobs: [{ status: 'RETRYING' }] });

    const result = await service.retryJob(91, 7);

    expect(repository.updateJob).toHaveBeenCalledWith(91, 7, expect.objectContaining({
      status: 'RETRYING',
      attemptCount: { increment: 1 },
      lastError: null
    }));
    expect(repository.updateBatchStatus).toHaveBeenCalledWith(70, 7, 'PROCESSING');
    expect(result.status).toBe('PROCESSING');
  });

  test('rejects invalid job transitions', async () => {
    repository.findJob.mockResolvedValue({ id: 91, clinicId: 7, batchId: 70, status: 'PRINTED' });

    await expect(service.markJobFailed(91, 7, { error: 'paper jam' }))
      .rejects.toMatchObject({ code: 'PRINT_INVALID_TRANSITION', statusCode: 409 });
  });

  test('activates only a version resolved inside the clinic scope', async () => {
    repository.activateTemplateVersion.mockResolvedValue({ id: 51, templateId: 60, status: 'ACTIVE' });

    await expect(service.activateTemplateVersion(51, 7)).resolves.toMatchObject({ id: 51, status: 'ACTIVE' });
    expect(repository.activateTemplateVersion).toHaveBeenCalledWith(51, 7);
  });

  test('deactivates only an allowlisted resource in the clinic scope', async () => {
    repository.deactivateResource.mockResolvedValue({ count: 1 });

    await expect(service.deactivateResource('printers', 30, 7)).resolves.toEqual({ id: 30, resource: 'printers', isActive: false });
    expect(repository.deactivateResource).toHaveBeenCalledWith('printer', 30, 7);
  });

  test('rejects unknown configuration resources', async () => {
    await expect(service.deactivateResource('users', 30, 7))
      .rejects.toMatchObject({ code: 'PRINT_RESOURCE_INVALID', statusCode: 400 });
  });
});
