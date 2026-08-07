const authService = require('./auth.service');
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
    const { username, password, email, role, clinicIds } = req.body;

    const { user } = await authService.register({
      username,
      email,
      password,
      role,
      clinicIds,
      actor: req.user
    });

    // Agregar header informativo sobre el modo de autenticacion
    res.setHeader('X-Auth-Mode', env().authViaCookie ? 'cookie' : 'header');

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

const bootstrapSuperAdmin = async (req, res, next) => {
  try {
    const bootstrapTokenHeader = req.headers['x-bootstrap-token'];
    const bootstrapToken = Array.isArray(bootstrapTokenHeader)
      ? bootstrapTokenHeader[0]
      : bootstrapTokenHeader;
    if (!bootstrapToken) {
      return res.status(403).json({
        code: 'INVALID_BOOTSTRAP_TOKEN',
        message: 'Bootstrap token is required'
      });
    }

    const { username, password, email, organizationName, clinicName } = req.body;
    const result = await authService.bootstrapSuperAdmin({
      username,
      email,
      password,
      organizationName,
      clinicName,
      bootstrapToken
    });

    res.status(201).json({
      message: 'Bootstrap completed successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '';
    const { user, token } = await authService.login(email, password, ip, rememberMe);

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

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword
    });

    res.json({
      message: 'Password updated successfully',
      user: result.user,
      passwordChangedAt: result.passwordChangedAt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, bootstrapSuperAdmin, login, logout, changePassword };
