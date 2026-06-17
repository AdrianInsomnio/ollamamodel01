const authService = require('./auth.service');
const { setAuthCookie, clearAuthCookie } = require('../../core/utils/cookie.util');

let env = null;
try {
  // Lazy require para que los tests puedan mutar env antes de leerlo.
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
    // Si estamos en modo cookie, limpiamos la cookie
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
    // Agregar header informativo sobre el modo de autenticacion
    res.setHeader('X-Auth-Mode', env().authViaCookie ? 'cookie' : 'header');
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, organizationId } = req.body;

    if (!email || !password || !organizationId) {
      return res.status(400).json({ error: 'Email, password and organizationId are required' });
    }

    const { user, token } = await authService.login(email, password, parseInt(organizationId));

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
    // Agregar header informativo sobre el modo de autenticacion
    res.setHeader('X-Auth-Mode', env().authViaCookie ? 'cookie' : 'header');
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, logout };
