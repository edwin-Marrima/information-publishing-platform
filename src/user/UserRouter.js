const Express = require('express');
const UserService = require('./UserService');
const { body, validationResult } = require('express-validator');
const router = Express.Router();
const ValidationException = require('../error/validationException');
const pagination = require('../middleware/pagination');
const ForbiddenException = require('../error/ForbiddenException');

const basicAuthentication = require('../middleware/basicAuthentication');

router.post(
  '/api/1.0/users',
  body('username').notEmpty().withMessage('name_null').bail().isLength({ min: 4, max: 32 }).withMessage('name_size'),
  body('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('email_inuse');
      }
    }),
  body('password').notEmpty().withMessage('password_null').bail().isLength({ min: 6 }).withMessage('password_size'),
  async (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return next(new ValidationException(error.array()));
    }
    try {
      await UserService.save(req.body);
      return res.send({ message: req.t('user_create_sucess') });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/api/1.0/users/token/:token', async (req, res, next) => {
  const token = req.params.token;
  try {
    await UserService.activate(token);
    res.send({ message: req.t('account_activation_success') });
  } catch (error) {
    next(error);
  }
});

router.get('/api/1.0/users', pagination, basicAuthentication, async (req, res) => {
  const authenticatedUser = req.authenticatedUser;

  const { size, page } = req.pagination;
  const users = await UserService.getUsers(page, size, authenticatedUser);
  res.status(200).send(users);
});

router.get('/api/1.0/users/:id', async (req, res, next) => {
  try {
    const user = await UserService.getUser(req.params.id);
    res.send(user);
  } catch (error) {
    next(error);
  }
});

router.put('/api/1.0/users/:id', basicAuthentication, async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser || authenticatedUser.id != req.params.id) {
    return next(new ForbiddenException('unauthroized_user_update'));
  }
  await UserService.updateUser(req.params.id, req.body);
  return res.status(200).send();
});
module.exports = router;
