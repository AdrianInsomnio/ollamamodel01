const userService = require('./user.service');

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id, req.user.organizationId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(req.user.organizationId);
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, getAll };
