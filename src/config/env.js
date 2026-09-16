const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .required(),

  PORT: Joi.number().required(),

  JWT_SECRET: Joi.string().min(10).required(),

  JWT_EXPIRES_IN: Joi.string().required(),

  IDEMPOTENCY_TTL_MINUTES: Joi.number().required(),

  DATABASE_URL: Joi.string().uri().required(),

  // Flags de cookies HttpOnly (Fase D1)
  AUTH_VIA_COOKIE: Joi.boolean().default(false),
  AUTH_COOKIE_NAME: Joi.string().default('access_token'),
  AUTH_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  AUTH_COOKIE_MAX_AGE_MS: Joi.number().default(86400000),

  LOG_LEVEL: Joi.string()
    .valid('info', 'warn', 'error', 'debug')
    .required(),
}).unknown();

const { error, value } = schema.validate(process.env);

if (error) {
  console.error('❌ Error en variables de entorno:\n', error.message);
  process.exit(1);
}

if (value.NODE_ENV === 'production') {
  if (value.JWT_SECRET === 'your-secret-key-change-in-production' || value.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must contain at least 32 non-default characters in production');
    process.exit(1);
  }

  if (value.BOOTSTRAP_SUPERADMIN_TOKEN && value.BOOTSTRAP_SUPERADMIN_TOKEN.length < 32) {
    console.error('BOOTSTRAP_SUPERADMIN_TOKEN must contain at least 32 characters in production');
    process.exit(1);
  }
}

module.exports.env = {
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  databaseUrl: value.DATABASE_URL,
  jwtSecret: value.JWT_SECRET,
  jwtExpiresIn: value.JWT_EXPIRES_IN,
  bootstrapSuperAdminToken: value.BOOTSTRAP_SUPERADMIN_TOKEN || '',
  idempotencyTtl: value.IDEMPOTENCY_TTL_MINUTES,
  logLevel: value.LOG_LEVEL,
  authViaCookie: value.AUTH_VIA_COOKIE,
  authCookieName: value.AUTH_COOKIE_NAME,
  authCookieSameSite: value.AUTH_COOKIE_SAME_SITE,
  authCookieMaxAgeMs: value.AUTH_COOKIE_MAX_AGE_MS,
};
