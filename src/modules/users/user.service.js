const userRepository = require('./user.repository');

const getProfile = async (userId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const getAllUsers = async () => {
  return await userRepository.getAllUsers();
};

module.exports = { getProfile, getAllUsers };
