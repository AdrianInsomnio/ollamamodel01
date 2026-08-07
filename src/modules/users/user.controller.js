const userService = require('./user.service');

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id, req.user.clinicId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    // SUPER_ADMIN sees all users in organization, ADMIN sees only their clinic's users
    const clinicId = req.user.role === 'SUPER_ADMIN' ? null : req.user.clinicId;
    const organizationId = req.user.organizationId;
    const users = await userService.getAllUsers(clinicId, organizationId);
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, getAll };
