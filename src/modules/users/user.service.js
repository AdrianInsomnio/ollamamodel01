const userRepository = require('./user.repository');
const { AppError } = require('../../core/errors/AppError');

const getProfile = async (userId, clinicId) => {
  const user = await userRepository.findUserById(userId, clinicId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

const getAllUsers = async (clinicId, organizationId) => {
  return await userRepository.getAllUsers(clinicId, organizationId);
};

module.exports = { getProfile, getAllUsers };
