const authService = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    const { user, token, organization } = await authService.register(username, email, password);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user,
      organization
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, organizationId } = req.body;

    if (!email || !password || !organizationId) {
      return res.status(400).json({ error: 'Email, password and organizationId are required' });
    }

    const { user, token } = await authService.login(email, password, parseInt(organizationId));

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };
