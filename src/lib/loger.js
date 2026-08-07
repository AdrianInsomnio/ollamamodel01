// stub logger - replaced with real pino if needed.
// pino-http espera que logger tenga shape compatible con pino, por lo que
// exponemos un objeto con la API minima + bindings y child.
const makeStub = () => {
  const base = {
    warn: () => {},
    info: () => {},
    error: () => {},
    debug: () => {},
    fatal: () => {},
    trace: () => {},
    silent: () => {},
    level: 'info',
    bindings: () => ({}),
    isLevelEnabled: () => false,
    child: function (bindings) {
      return Object.assign(makeStub(), { bindings: () => bindings || {} });
    },
    [Symbol.for('pino.metadata')]: true,
  };
  return base;
};

module.exports = { logger: makeStub() };