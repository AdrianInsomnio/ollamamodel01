const service = require('./admin.service');

const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await service.getDashboardMetrics(req.user);
    res.json({ metrics });
  } catch (error) {
    next(error);
  }
};

const getClinics = async (req, res, next) => {
  try {
    const payload = await service.listClinics(req.user);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const payload = await service.listUsers(req.user);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getClinics,
  getUsers,
};
