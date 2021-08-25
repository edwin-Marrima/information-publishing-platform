const Express = require('express');
const UserService = require('../user/UserService');
const AuthenticationException = require('./AuthenticationException');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const ForbiddenException = require('../error/ForbiddenException');

const router = Express.Router();

router.post('/api/1.0/auth', check('email').isEmail(), async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new AuthenticationException());
  }
  const { email, password } = req.body;
  const user = await UserService.findByEmail(email);
  if (!user) {
    return next(new AuthenticationException());
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return next(new AuthenticationException());
  }
  if (user.inactive) {
    return next(new ForbiddenException());
  }
  return res.send({
    id: user.id,
    username: user.username,
  });
});

module.exports = router;
