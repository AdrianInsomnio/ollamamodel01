const service = require('./admin.service');
const { AppError } = require('../../core/errors/AppError');

const getDashboardMetrics = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await service.getDashboardMetrics(user);
    res.json({ metrics: data });
  } catch (error) {
    next(error);
  }
};

const getClinics = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await service.listClinics(user);
    res.json({ clinics: data });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await service.listUsers(user);
    res.json({ users: data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getClinics,
  getUsers,
};
