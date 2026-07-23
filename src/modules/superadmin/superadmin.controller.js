const service = require('./superadmin.service');
const { setAuthCookie, clearAuthCookie } = require('../../core/utils/cookie.util');

let env = null;
try {
  // Lazy para que los tests puedan mutar env antes de leerlo.
  // El modulo config/env exporta { env }, y leemos su propiedad actual
  // en cada llamada, no destructurando.
  env = () => require('../../config/env').env;
} catch (_) {
  env = () => ({ authViaCookie: false });
};

/**
 * Cierra la sesion del usuario.
 * En modo cookie, limpia la cookie HttpOnly.
 * En modo header, es un no-op (el cliente descarta el token en su store).
 * Siempre retorna 200 para que sea idempotente (util cuando la cookie ya expiro).
 */
const logout = async (req, res, next) => {
  try {
    // Si estamos en modo cookie, limpia la cookie
    if (env().authViaCookie) {
      clearAuthCookie(res);
    }
    // En ambos modos, retornamos success
    res.json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    const { user, token, organization } = await authService.register(username, email, password);

    // Agregar header informativo sobre el modo de autenticacion
    res.setHeader('X-Auth-Mode', env().authViaCookie ? 'cookie' : 'header');

    // En modo cookie, establecer la cookie y no devolver token en el cuerpo
    if (env().authViaCookie) {
      setAuthCookie(res, token);
      res.status(201).json({
        message: 'User created successfully',
        user,
        organization
      });
    } else {
      // Modo legacy: devolver token en el cuerpo
      res.status(201).json({
        message: 'User created successfully',
        token,
        user,
        organization
      });
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '';
    const { user, token } = await authService.login(email, password, ip);

    // Agregar header informativo sobre el modo de autenticacion
    res.setHeader('X-Auth-Mode', env().authViaCookie ? 'cookie' : 'header');

    // En modo cookie, establecer la cookie y no devolver token en el cuerpo
    if (env().authViaCookie) {
      setAuthCookie(res, token);
      res.json({
        message: 'Login successful',
        user
      });
    } else {
      // Modo legacy: devolver token en el cuerpo
      res.json({
        message: 'Login successful',
        token,
        user
      });
    }
  } catch (error) {
    next(error);
  }
};

// SUPERADMIN CONTROLLER
const getPlans = async (req, res, next) => {
  try {
    const items = await service.getPlans(req.user.organizationId);
    res.json({ plans: items });
  } catch (error) {
    next(error);
  }
};

const getPlanById = async (req, res, next) => {
  try {
    const item = await service.getPlanById(parseInt(req.params.id), req.user.organizationId);
    res.json({ plan: item });
  } catch (error) {
    next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const item = await service.createPlan(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    await service.updatePlan(parseInt(req.params.id), req.body, req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    await service.deletePlan(parseInt(req.params.id), req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getSubscriptions = async (req, res, next) => {
  try {
    const items = await service.getSubscriptions(req.user.organizationId);
    res.json({ subscriptions: items });
  } catch (error) {
    next(error);
  }
};

const getSubscriptionById = async (req, res, next) => {
  try {
    const item = await service.getSubscriptionById(parseInt(req.params.id), req.user.organizationId);
    res.json({ subscription: item });
  } catch (error) {
    next(error);
  }
};

const createSubscription = async (req, res, next) => {
  try {
    const item = await service.createSubscription(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    await service.updateSubscription(parseInt(req.params.id), req.body, req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const deleteSubscription = async (req, res, next) => {
  try {
    await service.deleteSubscription(parseInt(req.params.id), req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getSubscriptionsByOrganization = async (req, res, next) => {
  try {
    const items = await service.getSubscriptionsByOrganization(req.user.organizationId);
    res.json({ subscriptions: items });
  } catch (error) {
    next(error);
  }
};

const createClinic = async (req, res, next) => {
  try {
    const item = await service.createClinic(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getClinicById = async (req, res, next) => {
  try {
    const item = await service.getClinicById(parseInt(req.params.id), req.user.organizationId);
    res.json({ clinic: item });
  } catch (error) {
    next(error);
  }
};

const getClinicsByOrganization = async (req, res, next) => {
  try {
    const items = await service.getClinicsByOrganization(req.user.organizationId);
    res.json({ clinics: items });
  } catch (error) {
    next(error);
  }
};

const updateClinic = async (req, res, next) => {
  try {
    await service.updateClinic(parseInt(req.params.id), req.body, req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const deleteClinic = async (req, res, next) => {
  try {
    await service.deleteClinic(parseInt(req.params.id), req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const associateClinicToPlan = async (req, res, next) => {
  try {
    const { clinicId, planId } = req.body;
    const item = await service.associateClinicToPlan(clinicId, planId, req.user.organizationId);
    res.json({ clinic: item });
  } catch (error) {
    next(error);
  }
};

const associateClinicToSubscription = async (req, res, next) => {
  try {
    const { clinicId, subscriptionId } = req.body;
    const item = await service.associateClinicToSubscription(clinicId, subscriptionId, req.user.organizationId);
    res.json({ clinic: item });
  } catch (error) {
    next(error);
  }
};

// CREAR ORGANIZACIÓN
const createOrganization = async (req, res, next) => {
  try {
    const item = await service.createOrganization(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByOrganization,
  createClinic,
  getClinicById,
  getClinicsByOrganization,
  updateClinic,
  deleteClinic,
  associateClinicToPlan,
  associateClinicToSubscription,
  createOrganization
};
