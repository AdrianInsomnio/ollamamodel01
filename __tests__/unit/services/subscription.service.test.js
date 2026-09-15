const subscriptionService = require('../../../src/modules/subscriptions/subscription.service');
const repository = require('../../../src/modules/subscriptions/subscription.repository');
const { AppError } = require('../../../src/core/errors/AppError');

jest.mock('../../../src/modules/subscriptions/subscription.repository');

const clinicId = 7;

const plan = {
  id: 11,
  clinicId,
  name: 'Plan Salud',
  price: '1250.00',
  benefits: { consultations: 2 },
  periodicity: 'MONTHLY',
  maxPets: 2,
  status: 'ACTIVE',
  applyLateFee: false,
  lateFeeType: 'NONE',
  lateFeeValue: '0.00',
};

const subscription = {
  id: 22,
  clinicId,
  clientId: 31,
  medicalPlanId: plan.id,
  contractedPrice: '1250.00',
  periodicity: 'MONTHLY',
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  status: 'ACTIVE',
  suspensionReason: null,
  medicalPlan: plan,
  pets: [],
};

beforeEach(() => jest.clearAllMocks());

describe('Subscription Service', () => {
  describe('plans', () => {
    it('serializes money fields when listing plans', async () => {
      repository.findPlans.mockResolvedValue([plan]);

      const result = await subscriptionService.listPlans(clinicId, false);

      expect(repository.findPlans).toHaveBeenCalledWith(clinicId, false);
      expect(result[0].price).toBe(1250);
      expect(result[0].lateFeeValue).toBe(0);
    });

    it('rejects percentage late fees above 100', async () => {
      await expect(subscriptionService.createPlan({
        ...plan,
        price: 100,
        applyLateFee: true,
        lateFeeType: 'PERCENTAGE',
        lateFeeValue: 101,
      }, clinicId)).rejects.toThrow(new AppError('La mora porcentual debe estar entre 0 y 100', 400));

      expect(repository.createPlan).not.toHaveBeenCalled();
    });
  });

  describe('subscriptions', () => {
    it('rejects a subscription when the pet limit is exceeded', async () => {
      repository.findClient.mockResolvedValue({ id: 31, clinicId });
      repository.findPlanById.mockResolvedValue(plan);

      await expect(subscriptionService.createSubscription({
        clientId: 31,
        medicalPlanId: plan.id,
        petIds: [1, 2, 3],
      }, clinicId)).rejects.toThrow(new AppError('La cantidad de mascotas supera el máximo del plan', 400));
    });

    it('suspends active subscriptions after three overdue installments', async () => {
      repository.findSubscriptionById.mockResolvedValue(subscription);
      repository.findInstallmentsBySubscription.mockResolvedValue([
        { status: 'PENDING', dueDate: new Date('2025-01-01') },
        { status: 'PENDING', dueDate: new Date('2025-02-01') },
        { status: 'PENDING', dueDate: new Date('2025-03-01') },
      ]);
      repository.refreshSubscription.mockResolvedValue({ count: 1 });

      const result = await subscriptionService.getSubscription(subscription.id, clinicId);

      expect(repository.refreshSubscription).toHaveBeenCalledWith(subscription.id, clinicId, {
        status: 'SUSPENDED',
        suspensionReason: 'SUSPENDED_DUE_TO_ARREARS',
      });
      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('installments', () => {
    it('generates consecutive periods using subscription periodicity', async () => {
      repository.findSubscriptionById.mockResolvedValue(subscription);
      repository.findInstallmentsBySubscription
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 1, status: 'PENDING', dueDate: new Date('2026-01-31'), amount: '1250.00', lateFee: '0.00', totalAmount: '1250.00' },
          { id: 2, status: 'PENDING', dueDate: new Date('2026-02-28'), amount: '1250.00', lateFee: '0.00', totalAmount: '1250.00' },
        ]);
      repository.findLastInstallment.mockResolvedValue(null);
      repository.createInstallments.mockResolvedValue({ count: 2 });
      repository.refreshSubscription.mockResolvedValue({ count: 1 });

      const result = await subscriptionService.generateInstallments(subscription.id, 2, clinicId);
      const rows = repository.createInstallments.mock.calls[0][0];

      expect(rows).toHaveLength(2);
      expect(rows[0].periodStart).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(rows[0].periodEnd).toEqual(new Date('2026-01-31T00:00:00.000Z'));
      expect(rows[1].periodStart).toEqual(new Date('2026-02-01T00:00:00.000Z'));
      expect(result).toHaveLength(2);
      expect(result[0].totalAmount).toBe(1250);
    });
  });

  describe('monthly summary', () => {
    it('separates due amounts from collected amounts by their dates', async () => {
      repository.monthlyInstallments.mockResolvedValue([
        { status: 'PAID', dueDate: new Date('2026-09-10'), totalAmount: '100.00' },
        { status: 'PENDING', dueDate: new Date('2026-09-12'), totalAmount: '50.00' },
      ]);
      repository.monthlyCollected.mockResolvedValue([
        { totalAmount: '100.00', paidAt: new Date('2026-09-15') },
      ]);
      repository.countSubscriptionsByStatus.mockResolvedValue([
        { status: 'ACTIVE', _count: { _all: 4 } },
        { status: 'SUSPENDED', _count: { _all: 1 } },
      ]);

      const result = await subscriptionService.monthlySummary('2026-09', clinicId);

      expect(result.expectedAmount).toBe(150);
      expect(result.collectedAmount).toBe(100);
      expect(result.pendingAmount).toBe(50);
      expect(result.activeSubscriptions).toBe(4);
      expect(result.suspendedSubscriptions).toBe(1);
      expect(result.collectionPercentage).toBeCloseTo(66.67, 2);
    });
  });
});
