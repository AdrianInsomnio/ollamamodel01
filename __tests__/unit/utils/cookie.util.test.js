const env = require('../../../src/config/env');
const cookie = require('../../../src/core/utils/cookie.util');

describe('cookie.util', () => {
  const originalViaCookie = env.env.authViaCookie;
  const originalName = env.env.authCookieName;

  const makeRes = () => {
    const res = {
      _cookie: null,
      _cleared: null,
      cookie(name, value, options) {
        this._cookie = { name, value, options };
      },
      clearCookie(name, options) {
        this._cleared = { name, options };
      },
    };
    return res;
  };

  describe('modo legacy (AUTH_VIA_COOKIE=false)', () => {
    beforeAll(() => {
      env.env.authViaCookie = false;
    });
    afterAll(() => {
      env.env.authViaCookie = originalViaCookie;
    });

    it('setAuthCookie no hace nada', () => {
      const res = makeRes();
      cookie.setAuthCookie(res, 'jwt-falso');
      expect(res._cookie).toBeNull();
    });

    it('clearAuthCookie no hace nada', () => {
      const res = makeRes();
      cookie.clearAuthCookie(res);
      expect(res._cleared).toBeNull();
    });

    it('readAuthCookie devuelve null aunque haya header Cookie', () => {
      const req = { headers: { cookie: 'access_token=abc' } };
      expect(cookie.readAuthCookie(req)).toBeNull();
    });
  });

  describe('modo cookie (AUTH_VIA_COOKIE=true)', () => {
    beforeAll(() => {
      env.env.authViaCookie = true;
    });
    afterAll(() => {
      env.env.authViaCookie = originalViaCookie;
    });

    it('setAuthCookie emite Set-Cookie con httpOnly y sameSite', () => {
      const res = makeRes();
      cookie.setAuthCookie(res, 'jwt-real');
      expect(res._cookie).not.toBeNull();
      expect(res._cookie.name).toBe(env.env.authCookieName);
      expect(res._cookie.value).toBe('jwt-real');
      expect(res._cookie.options.httpOnly).toBe(true);
      expect(res._cookie.options.sameSite).toBe(env.env.authCookieSameSite);
      expect(res._cookie.options.path).toBe('/');
      expect(res._cookie.options.maxAge).toBe(env.env.authCookieMaxAgeMs);
    });

    it('clearAuthCookie limpia la cookie con las mismas opciones criticas', () => {
      const res = makeRes();
      cookie.clearAuthCookie(res);
      expect(res._cleared).not.toBeNull();
      expect(res._cleared.name).toBe(env.env.authCookieName);
      expect(res._cleared.options.httpOnly).toBe(true);
      expect(res._cleared.options.path).toBe('/');
    });

    it('readAuthCookie devuelve el valor del cookie si esta presente', () => {
      const req = { headers: { cookie: 'access_token=jwt-aqui; other=foo' } };
      expect(cookie.readAuthCookie(req)).toBe('jwt-aqui');
    });

    it('readAuthCookie devuelve null si el cookie no esta', () => {
      const req = { headers: { cookie: 'session=other' } };
      expect(cookie.readAuthCookie(req)).toBeNull();
    });

    it('readAuthCookie maneja req sin header Cookie', () => {
      expect(cookie.readAuthCookie({ headers: {} })).toBeNull();
      expect(cookie.readAuthCookie({})).toBeNull();
    });
  });

  describe('parseCookieHeader (fallback sin modulo cookie)', () => {
    it('parsea un solo par nombre=valor', () => {
      const out = cookie.parseCookieHeader('a=1');
      expect(out).toEqual({ a: '1' });
    });

    it('parsea multiples cookies separadas por ;', () => {
      const out = cookie.parseCookieHeader('a=1; b=2; c=hello%20world');
      expect(out.a).toBe('1');
      expect(out.b).toBe('2');
      expect(out.c).toBe('hello world');
    });

    it('ignora segmentos invalidos sin =', () => {
      const out = cookie.parseCookieHeader('a=1; invalido; b=2');
      expect(out.a).toBe('1');
      expect(out.b).toBe('2');
      expect(out.invalido).toBeUndefined();
    });

    it('devuelve {} si el header es vacio', () => {
      expect(cookie.parseCookieHeader('')).toEqual({});
      expect(cookie.parseCookieHeader(undefined)).toEqual({});
      expect(cookie.parseCookieHeader(null)).toEqual({});
    });
  });
});
