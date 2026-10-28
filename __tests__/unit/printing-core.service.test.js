jest.mock('../../src/modules/printing-core/printing.repository', () => ({
  findClinic: jest.fn(),
  findAgent: jest.fn(),
  findTarget: jest.fn(),
  findPrinter: jest.fn(),
  findTemplate: jest.fn(),
  findTemplateByKey: jest.fn(),
  findActiveTemplateVersionByKey: jest.fn(),
  findTemplateVersion: jest.fn(),
  listRules: jest.fn(),
  createRule: jest.fn(),
  updateRule: jest.fn(),
  deleteRule: jest.fn(),
  findRulesByEvent: jest.fn(),
  createBatch: jest.fn(),
  activateTemplateVersion: jest.fn(),
  deactivateResource: jest.fn(),
  updateResource: jest.fn(),
  findBatch: jest.fn(),
  findJob: jest.fn(),
  updateJob: jest.fn(),
  updateBatchStatus: jest.fn()
}));
jest.mock('axios', () => ({ post: jest.fn() }));

const repository = require('../../src/modules/printing-core/printing.repository');
const service = require('../../src/modules/printing-core/printing.service');
const axios = require('axios');

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
    repository.findJob
      .mockResolvedValueOnce({ id: 91, clinicId: 7, batchId: 70, status: 'FAILED' })
      .mockResolvedValueOnce({ id: 91, clinicId: 7, batchId: 70, status: 'RETRYING', printerId: 30 })
      .mockResolvedValueOnce({ id: 91, clinicId: 7, batchId: 70, status: 'RETRYING' });
    repository.findBatch.mockResolvedValue({ id: 70, jobs: [{ status: 'RETRYING' }] });
    repository.findPrinter.mockResolvedValue({ id: 30, printAgentId: 40 });
    repository.findAgent.mockResolvedValue({ id: 40, status: 'ONLINE', endpoint: 'http://agent', apiKey: 'test-key' });
    axios.post.mockResolvedValue({ status: 202 });

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

  test('updates only allowlisted fields of an active resource', async () => {
    repository.updateResource.mockResolvedValue({ count: 1 });

    await expect(service.updateResource('templates', 60, { name: 'Ticket venta v2', clinicId: 999, isActive: false }, 7))
      .resolves.toEqual({ id: 60, resource: 'templates', updated: ['name'] });
    expect(repository.updateResource).toHaveBeenCalledWith('printTemplate', 60, 7, { name: 'Ticket venta v2' });
  });

  test('rejects an empty or unsupported configuration update', async () => {
    await expect(service.updateResource('printers', 30, { paperSize: 'A4' }, 7))
      .rejects.toMatchObject({ code: 'PRINT_UPDATE_EMPTY', statusCode: 400 });
  });

  test('creates an event rule with multiple validated outputs scoped to the clinic', async () => {
    repository.findTarget.mockResolvedValue({ id: 20, name: 'Caja', isActive: true, printer: { paperType: 'THERMAL', paperSize: 'THERMAL_80' } });
    repository.findTemplateByKey.mockResolvedValue({ id: 60, name: 'Ticket POS', isActive: true });
    repository.findActiveTemplateVersionByKey.mockResolvedValue({ paperType: 'THERMAL', paperSize: 'THERMAL_80' });
    repository.createRule.mockResolvedValue({ id: 99, name: 'Venta y preparación', outputs: [] });

    await service.createRule({
      name: 'Venta y preparación',
      event: 'SALE',
      isActive: true,
      priority: 0,
      outputs: [
        { name: 'Ticket POS', targetId: 20, templateKey: 'sale-pos', priority: 1, copies: 2, isActive: true },
        { name: 'Orden de cocina', targetId: 20, templateKey: 'kitchen-order', priority: 2, copies: 1, isActive: true },
      ],
    }, 7);

    expect(repository.findTarget).toHaveBeenCalledWith(20, 7);
    expect(repository.findTemplateByKey).toHaveBeenCalledWith('sale-pos', 7);
    expect(repository.createRule).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Venta y preparación',
      event: 'SALE',
      outputs: expect.arrayContaining([
        expect.objectContaining({ targetId: 20, templateKey: 'sale-pos', copies: 2 }),
        expect.objectContaining({ targetId: 20, templateKey: 'kitchen-order', copies: 1 }),
      ]),
    }), 7);
  });

  test('rejects active rules for events without an integrated business flow', async () => {
    await expect(service.createRule({
      name: 'Cierre de turno', event: 'CASH_SHIFT_CLOSED', isActive: true,
      outputs: [{ name: 'Cierre', targetId: 20, templateKey: 'close-slip', priority: 0, copies: 1, isActive: true }],
    }, 7)).rejects.toMatchObject({ code: 'PRINT_EVENT_UNSUPPORTED', statusCode: 400 });
  });

  test('flattens active outputs in priority order for the existing event dispatch flow', async () => {
    repository.findRulesByEvent.mockResolvedValue([{
      id: 4, name: 'Venta finalizada', event: 'SALE', isActive: true,
      outputs: [
        { id: 40, name: 'Depósito', targetId: 22, templateKey: 'stock-list', priority: 3, copies: 1, isActive: true },
        { id: 39, name: 'POS', targetId: 20, templateKey: 'sale-pos', priority: 1, copies: 2, isActive: true },
        { id: 41, name: 'Inactiva', targetId: 24, templateKey: 'inactive', priority: 0, copies: 1, isActive: false },
      ],
    }]);

    const outputs = await service.findRulesByEvent(7, 'SALE');

    expect(outputs.map(({ name, priority, copies }) => ({ name, priority, copies }))).toEqual([
      { name: 'POS', priority: 1, copies: 2 },
      { name: 'Depósito', priority: 3, copies: 1 },
    ]);
  });
});
