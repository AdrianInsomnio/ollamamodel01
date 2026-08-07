const mockPrisma = {
  users: {
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  clinics: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAuthRepository = {
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updatePassword: jest.fn(),
};

const mockUtils = {
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
};

const mockLogger = {
  warn: jest.fn(),
};

jest.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));
jest.mock('../../../src/modules/auth/auth.repository', () => mockAuthRepository);
jest.mock('../../../src/core/utils/password.util', () => mockUtils);
jest.mock('../../../src/core/utils/jwt.util', () => mockUtils);
jest.mock('../../../src/lib/loger', () => ({ logger: mockLogger }));
jest.mock('../../../src/config/env', () => ({
  env: {
    bootstrapSuperAdminToken: 'bootstrap-secret-token',
  }
}));
jest.mock('../../../src/core/errors/AppError', () => ({
  AppError: function AppError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = 'AppError';
    return error;
  }
}));

const authService = require('../../../src/modules/auth/auth.service');
const { ROLES } = require('../../../src/core/constants/roles');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      clinicIds: [2],
    };

    it('should register a user only when created by SUPER_ADMIN or ADMIN', async () => {
      const mockClinic = { id: 2, name: 'Test Clinic', organizationId: 1 };
      const mockUser = {
        id: 1,
        username: validUserData.username,
        email: validUserData.email,
        password: 'hashedPassword',
        role: ROLES.USER,
        organizationId: mockClinic.organizationId,
        clinics: [mockClinic],
      };

      mockPrisma.users.findFirst.mockResolvedValue(null);
      mockPrisma.clinics.findMany.mockResolvedValue([mockClinic]);
      mockUtils.hashPassword.mockResolvedValue('hashedPassword');
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      const result = await authService.register({
        ...validUserData,
        actor: { id: 99, role: ROLES.SUPER_ADMIN }
      });

      expect(mockPrisma.users.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: validUserData.email }, { username: validUserData.username }]
        }
      });
      expect(mockPrisma.clinics.findMany).toHaveBeenCalledWith({
        where: { id: { in: [mockClinic.id] } },
        select: { id: true, name: true, organizationId: true }
      });
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith(
        validUserData.username,
        validUserData.email,
        'hashedPassword',
        mockClinic.organizationId,
        ROLES.USER,
        [mockClinic.id]
      );
      expect(mockUtils.generateToken).not.toHaveBeenCalled();
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        organizationId: mockUser.organizationId,
        clinics: mockUser.clinics,
      });
    });

    it('should reject register when clinics belong to different organizations', async () => {
      const clinicOne = { id: 2, name: 'Clinic A', organizationId: 1 };
      const clinicTwo = { id: 3, name: 'Clinic B', organizationId: 2 };

      mockPrisma.users.findFirst.mockResolvedValue(null);
      mockPrisma.clinics.findMany.mockResolvedValue([clinicOne, clinicTwo]);

      await expect(authService.register({
        ...validUserData,
        clinicIds: [2, 3],
        actor: { id: 99, role: ROLES.SUPER_ADMIN }
      })).rejects.toThrow('All clinics must belong to the same organization');
    });

    it('should reject register when actor is not SUPER_ADMIN or ADMIN', async () => {
      await expect(authService.register({
        ...validUserData,
        actor: { id: 99, role: ROLES.USER }
      })).rejects.toThrow('Only SUPER_ADMIN or ADMIN can create users');
    });

    it('should reject register when no clinic is assigned', async () => {
      await expect(authService.register({
        ...validUserData,
        clinicIds: [],
        actor: { id: 99, role: ROLES.ADMIN, clinicId: 2 }
      })).rejects.toThrow('At least one clinic must be assigned');
    });
  });

  describe('bootstrapSuperAdmin', () => {
    it('should bootstrap a super admin only when bootstrap token is valid and no users exist', async () => {
      const now = new Date('2026-08-05T00:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const tx = {
        users: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({
            id: 99,
            username: 'root',
            email: 'root@example.com',
            role: ROLES.SUPER_ADMIN,
            organizationId: 1,
            clinics: [{ id: 10, name: 'Main Clinic' }],
          }),
        },
        organization: {
          create: jest.fn().mockResolvedValue({ id: 1, name: 'Clinic Org' }),
        },
        clinics: {
          create: jest.fn().mockResolvedValue({ id: 10, name: 'Main Clinic', organizationId: 1 }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));
      mockUtils.hashPassword.mockResolvedValue('hashedPassword');

      const result = await authService.bootstrapSuperAdmin({
        username: 'root',
        email: 'root@example.com',
        password: 'password123',
        organizationName: 'Clinic Org',
        clinicName: 'Main Clinic',
        bootstrapToken: 'bootstrap-secret-token',
      });

      expect(tx.users.count).toHaveBeenCalled();
      expect(tx.organization.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'Clinic Org' })
      }));
      expect(tx.users.count).toHaveBeenCalled();
      expect(tx.clinics.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'Main Clinic', organizationId: 1, isDefault: true })
      }));
      expect(tx.users.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          username: 'root',
          email: 'root@example.com',
          password: 'hashedPassword',
          role: ROLES.SUPER_ADMIN,
          organizationId: 1,
        })
      }));
      expect(result.user.username).toBe('root');
      jest.useRealTimers();
    });

    it('should reject bootstrap when users already exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => callback({
        users: {
          count: jest.fn().mockResolvedValue(1),
        },
      }));

      await expect(authService.bootstrapSuperAdmin({
        username: 'root',
        email: 'root@example.com',
        password: 'password123',
        organizationName: 'Clinic Org',
        clinicName: 'Main Clinic',
        bootstrapToken: 'bootstrap-secret-token',
      })).rejects.toThrow('Bootstrap is only allowed when no users exist');
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully when user exists, password is correct, and has clinic', async () => {
      const mockClinic = { id: 2, name: 'Test Clinic' };
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: validLoginData.email,
        password: 'hashedPassword',
        role: ROLES.USER,
        clinics: [mockClinic],
      };
      const mockToken = 'mock.jwt.token';
      const ip = '127.0.0.1';

      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockUtils.comparePassword.mockResolvedValue(true);
      mockUtils.generateToken.mockReturnValue(mockToken);

      const result = await authService.login(validLoginData.email, validLoginData.password, ip);

      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(validLoginData.email);
      expect(mockUtils.comparePassword).toHaveBeenCalledWith(validLoginData.password, mockUser.password);
      expect(mockUtils.generateToken).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          clinicId: mockClinic.id,
          role: mockUser.role
        },
        { expiresIn: '1d' }
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role,
          clinics: mockUser.clinics,
        },
        token: mockToken,
      });
    });

    it('should log warning and throw 401 when email is not found', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      const ip = '127.0.0.1';

      await expect(authService.login(validLoginData.email, validLoginData.password, ip))
        .rejects.toThrow('Invalid credentials');

      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(validLoginData.email);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({
        event: 'LOGIN_FAILED_EMAIL_NOT_FOUND',
        email: validLoginData.email,
        ip,
      }));
      expect(mockUtils.comparePassword).not.toHaveBeenCalled();
    });

    it('should log warning and throw 401 when password is wrong', async () => {
      const mockUser = {
        id: 1,
        email: validLoginData.email,
        password: 'hashedPassword',
        clinics: [{ id: 2, name: 'Test Clinic' }],
      };
      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockUtils.comparePassword.mockResolvedValue(false);
      const ip = '127.0.0.1';

      await expect(authService.login(validLoginData.email, 'wrongPassword', ip))
        .rejects.toThrow('Invalid credentials');

      expect(mockUtils.comparePassword).toHaveBeenCalledWith('wrongPassword', mockUser.password);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({
        event: 'LOGIN_FAILED_WRONG_PASSWORD',
        userId: mockUser.id,
        email: validLoginData.email,
        ip,
      }));
      expect(mockUtils.generateToken).not.toHaveBeenCalled();
    });

    it('should log warning and throw 403 when user has no clinic', async () => {
      const mockUser = {
        id: 1,
        email: validLoginData.email,
        password: 'hashedPassword',
        clinics: [],
      };
      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockUtils.comparePassword.mockResolvedValue(true);
      const ip = '127.0.0.1';

      await expect(authService.login(validLoginData.email, validLoginData.password, ip))
        .rejects.toThrow('User has no clinic assigned');

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({
        event: 'LOGIN_FAILED_NO_CLINIC',
        userId: mockUser.id,
        email: validLoginData.email,
        ip,
      }));
      expect(mockUtils.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should update password when current password is valid', async () => {
      const user = {
        id: 1,
        password: 'hashedPassword',
        username: 'testuser',
        email: 'test@example.com',
        role: ROLES.USER,
        organizationId: 1,
        clinics: [{ id: 2, name: 'Test Clinic' }],
      };
      mockAuthRepository.findUserById.mockResolvedValue(user);
      mockAuthRepository.updatePassword.mockResolvedValue({
        id: 1,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        clinics: user.clinics,
      });
      mockUtils.comparePassword.mockResolvedValue(true);
      mockUtils.hashPassword.mockResolvedValue('newHashedPassword');

      const result = await authService.changePassword({
        userId: user.id,
        currentPassword: 'password123',
        newPassword: 'newPassword123',
      });

      expect(mockAuthRepository.findUserById).toHaveBeenCalledWith(user.id);
      expect(mockUtils.comparePassword).toHaveBeenCalledWith('password123', user.password);
      expect(mockAuthRepository.updatePassword).toHaveBeenCalled();
      expect(result.user.username).toBe(user.username);
    });

    it('should reject password change when current password is invalid', async () => {
      mockAuthRepository.findUserById.mockResolvedValue({
        id: 1,
        password: 'hashedPassword',
      });
      mockUtils.comparePassword.mockResolvedValue(false);

      await expect(authService.changePassword({
        userId: 1,
        currentPassword: 'wrong',
        newPassword: 'newPassword123',
      })).rejects.toThrow('Current password is incorrect');
    });
  });
});
