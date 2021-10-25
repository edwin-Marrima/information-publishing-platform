
const TokenService = require('../auth/TokenService')

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token= authorization.split(' ')[1];
    try{
      const user = await TokenService.verifyToken(token);
      req.authenticatedUser = user;
    }catch (e) {}
  }
  next();
};
module.exports = tokenAuthentication;
