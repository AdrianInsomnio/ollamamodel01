const service = require('./admin.service');
const { AppError } = require('../../core/errors/AppError');

const getDashboardMetrics = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await service.getDashboardMetrics(user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getClinics = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await service.listClinics(user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await service.listUsers(user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await service.createUser(req.body, user);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const data = await service.updateUser(Number(id), req.body, user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    await service.deleteUser(Number(id), user);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const updateUserClinics = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'SUPER_ADMIN') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    const { clinicIds } = req.body;
    await service.updateUserClinics(req.params.userId, clinicIds);
    res.status(200).json({ message: 'Clinicas actualizadas' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getClinics,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserClinics,
};
