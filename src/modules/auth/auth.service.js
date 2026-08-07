const crypto = require('crypto');
const { AppError } = require('../../core/errors/AppError');
const { hashPassword, comparePassword } = require('../../core/utils/password.util');
const { generateToken } = require('../../core/utils/jwt.util');
const { logger } = require('../../lib/loger');
const userRepository = require('./auth.repository');
const { prisma } = require('../../lib/prisma');
const { ROLES } = require('../../core/constants/roles');

let env = null;
try {
  env = () => require('../../config/env').env;
} catch (_) {
  env = () => ({ bootstrapSuperAdminToken: '' });
}

/**
 * Registra un usuario.
 *
 * Reglas de autorizacion:
 *  - Si NO hay actor (req.user undefined) y la tabla users esta vacia,
 *    se trata como bootstrap del primer SUPER_ADMIN. En ese caso se exige
 *    clinicIds y se ignora el `role` enviado (se fuerza SUPER_ADMIN).
 *  - Si la tabla NO esta vacia y no hay actor -> 403.
 *  - Si HAY actor, solo SUPER_ADMIN o ADMIN pueden crear usuarios.
 */
const register = async ({ username, email, password, role = ROLES.USER, clinicIds = [], actor }) => {
  // Determinar modo: bootstrap (sin actor + tabla vacia) o con actor
  let isBootstrap = false;
  if (!actor) {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      isBootstrap = true;
      role = ROLES.SUPER_ADMIN;
    } else {
      throw new AppError('Only SUPER_ADMIN or ADMIN can create users', 403);
    }
  } else if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(actor.role)) {
    throw new AppError('Only SUPER_ADMIN or ADMIN can create users', 403);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    }
  });
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  const uniqueClinicIds = [...new Set(clinicIds.map(Number))];
  if (uniqueClinicIds.length === 0) {
    throw new AppError('At least one clinic must be assigned', 400);
  }

  // Buscar clinics existentes
  let clinics = await prisma.clinic.findMany({
    where: { id: { in: uniqueClinicIds } },
    select: { id: true, name: true, organizationId: true }
  });

  let organizationId;

  if (clinics.length === uniqueClinicIds.length) {
    // Todas las clinics existen: validar misma organization
    const organizationIds = [...new Set(clinics.map((clinic) => clinic.organizationId))];
    if (organizationIds.length !== 1) {
      throw new AppError('All clinics must belong to the same organization', 400);
    }
    organizationId = organizationIds[0];

    if (actor && actor.role === ROLES.ADMIN) {
      const actorClinicId = Number(actor.clinicId);
      const actorClinic = clinics.find((clinic) => clinic.id === actorClinicId);
      if (!actorClinic || actorClinic.organizationId !== organizationId) {
        throw new AppError('ADMIN can only assign users within their organization', 403);
      }
    }
  } else if (isBootstrap) {
    // Bootstrap: las clinics no existen, las creamos junto con la organization
    const now = new Date();
    const txResult = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: `${username}'s Organization`,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        select: { id: true, name: true }
      });
      const clinicResults = [];
      for (const clinicIdNum of uniqueClinicIds) {
        const c = await tx.clinics.upsert({
          where: { id: clinicIdNum },
          update: {},
          create: {
            id: clinicIdNum,
            name: `Clinica ${clinicIdNum}`,
            organizationId: org.id,
            isDefault: true,
            createdAt: now,
            updatedAt: now,
          },
          select: { id: true, name: true, organizationId: true }
        });
        clinicResults.push(c);
      }
      return { org, clinics: clinicResults };
    });
    organizationId = txResult ? txResult.org.id : undefined;
    clinics = txResult ? txResult.clinics : [];
  } else {
    throw new AppError('One or more clinics do not exist', 400);
  }

  if (!organizationId) {
    throw new AppError('Failed to resolve organization', 500);
  }

  const hashedPassword = await hashPassword(password);
  const user = await userRepository.createUser(
    username,
    email,
    hashedPassword,
    organizationId,
    role,
    uniqueClinicIds
  );

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    isBootstrap,
    organizationId,
    clinicId: uniqueClinicIds[0],
  };
};

const bootstrapSuperAdmin = async ({
  username,
  email,
  password,
  organizationName,
  clinicName,
  bootstrapToken,
}) => {
  const expectedToken = env().bootstrapSuperAdminToken;
  if (!expectedToken) {
    throw new AppError('Bootstrap is disabled', 503, 'BOOTSTRAP_DISABLED');
  }

  if (!bootstrapToken || bootstrapToken.length !== expectedToken.length) {
    throw new AppError('Invalid bootstrap token', 403, 'INVALID_BOOTSTRAP_TOKEN');
  }

  const providedToken = Buffer.from(bootstrapToken);
  const secretToken = Buffer.from(expectedToken);
  if (!crypto.timingSafeEqual(providedToken, secretToken)) {
    throw new AppError('Invalid bootstrap token', 403, 'INVALID_BOOTSTRAP_TOKEN');
  }

  const hashedPassword = await hashPassword(password);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existingUsers = await tx.user.count();
    if (existingUsers > 0) {
      throw new AppError('Bootstrap is only allowed when no users exist', 409, 'BOOTSTRAP_ALREADY_USED');
    }

    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
        name: true,
      }
    });

    const clinic = await tx.clinic.create({
      data: {
        name: clinicName,
        organizationId: organization.id,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
      }
    });

    const user = await tx.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: ROLES.SUPER_ADMIN,
        organizationId: organization.id,
        passwordChangedAt: now,
        created_at: now,
        updated_at: now,
        clinics: {
          connect: [{ id: clinic.id }],
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        organizationId: true,
        clinics: { select: { id: true, name: true } },
      }
    });

    return { organization, clinic, user };
  });

  return result;
};

const login = async (email, password, ip, rememberMe = false) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    logger.warn({ event: 'LOGIN_FAILED_EMAIL_NOT_FOUND', email, ip, timestamp: new Date().toISOString() });
    throw new AppError('Invalid credentials', 401);
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    logger.warn({ event: 'LOGIN_FAILED_WRONG_PASSWORD', userId: user.id, email, ip, timestamp: new Date().toISOString() });
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.clinics || user.clinics.length === 0) {
    logger.warn({ event: 'LOGIN_FAILED_NO_CLINIC', userId: user.id, email, ip, timestamp: new Date().toISOString() });
    throw new AppError('User has no clinic assigned', 403);
  }

  const clinicId = user.clinics[0].id;
  const expiresIn = rememberMe ? '30d' : '1d';
  const token = generateToken(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      clinicId: clinicId,
      role: user.role || ROLES.USER
    },
    { expiresIn }
  );

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isValidPassword = await comparePassword(currentPassword, user.password);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const hashedPassword = await hashPassword(newPassword);
  const passwordChangedAt = new Date();
  const updatedUser = await userRepository.updatePassword(user.id, hashedPassword, passwordChangedAt);

  return {
    user: updatedUser,
    passwordChangedAt
  };
};

module.exports = { register, bootstrapSuperAdmin, login, changePassword };

