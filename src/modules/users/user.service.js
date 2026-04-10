const userRepository = require('./user.repository');
const { AppError } = require('../../core/errors/AppError');

const getProfile = async (userId, organizationId) => {
  const user = await userRepository.findUserById(userId, organizationId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

const getAllUsers = async (organizationId) => {
  return await userRepository.getAllUsers(organizationId);
};

module.exports = { getProfile, getAllUsers };
