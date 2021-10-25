const { randomString } = require('../shared/generator');
const Token = require('./Token');
const Sequelize = require('sequelize');
const ONE_WEEK_IN_MILLS = 7 * 24 * 60 * 60 * 1000;

const createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token: token,
    userId: user.id,
    lastUsedAt: new Date(Date.now()),
  });
  return token;
};
const verifyToken = async (token) => {
  const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLS);
  const tokenInDB = await Token.findOne({
    where: {
      token: token,
      lastUsedAt: {
        [Sequelize.Op.gt]: oneWeekAgo,
      },
    },
  });
  tokenInDB.lastUsedAt = new Date();
  await tokenInDB.save();
  const userId = tokenInDB.userId;
  return { id: userId };
};
const deleteToken = async (token) => {
  await Token.destroy({ where: { token: token } });
};
const scheduleCleanup = () => {
  setInterval(async () => {
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLS);
    await Token.destroy({
      where: {
        lastUsedAt: {
          [Sequelize.Op.lt]: oneWeekAgo,
        },
      },
    });
  }, 60 * 60 * 1000);
};
const clearToken = async (id) => {
  await Token.destroy({ where: { userId: id } });
};

module.exports = { createToken, verifyToken, deleteToken, scheduleCleanup, clearToken };
