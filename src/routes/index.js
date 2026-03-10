const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
};
