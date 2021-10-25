const Express = require('express');
const UserService = require('../user/UserService');
const AuthenticationException = require('./AuthenticationException');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const ForbiddenException = require('../error/ForbiddenException');
const TokenService = require('./TokenService');

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
  const token = await TokenService.createToken(user);
  return res.send({
    id: user.id,
    username: user.username,
    image:user.image,
    token,
    
  });
});

router.post('/api/1.0/logout',async (req,res)=>{
  const authorization = req.headers.authorization;
  if (authorization) {
    const token= authorization.split(' ')[1];
    await TokenService.deleteToken(token)
  }
  res.send();
})

module.exports = router;
