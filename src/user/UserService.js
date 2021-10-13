const User = require('./User');
const bcrypt = require('bcrypt');
const emailService = require('../email/EmailService');
const EmailExcepection = require('../email/EmailException');
const sequelize = require('../config/database');
const InvalidTokenException = require('./InvalidTokenException');
const NotFoundException = require('../error/NotFoundException');
const Sequelize = require('sequelize');
const { randomString } = require('../shared/generator');
const EmailException = require('../email/EmailException');
const TokenService = require('../auth/TokenService');
const FileService = require('../file/FileService');

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = { username, email, password: hash, activationToken: randomString(16) };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await emailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new EmailExcepection();
  }
};
const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (page, size, authenticatedUser) => {
  const userWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ['id', 'username', 'email', 'image'],
    limit: size,
    offset: page * size,
  });

  return {
    content: userWithCount.rows,
    page: page,
    size: size,
    totalPages: Math.ceil(userWithCount.count / size),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: {
      id: id,
      inactive: false,
    },
    attributes: ['id', 'username', 'email', 'image'],
  });
  if (!user) {
    throw new NotFoundException('user_not_found');
  }
  return user;
};

const updateUser = async (id, updatedBody) => {
  const user = await User.findOne({ where: { id: id } });
  user.username = updatedBody.username;
  if(updatedBody.image){
    if(user.image){
      await FileService.deleteProfileImage(user.image);
    }
    user.image = await FileService.saveProfileImage(updatedBody.image);
  }
  await user.save();
  return {
    id: id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
};

const deleteUser = async (id) => {
  await User.destroy({ where: { id: id } });
};
const passwordResetResquest = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('email_not_inuse');
  }
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await emailService.sendPasswordReset(user.email, user.passwordResetToken);
  } catch (e) {
    throw new EmailExcepection();
  }
};
const updatePassword = async (updateResquest) => {
  const user = await findByPasswordResetToken(updateResquest.passwordResetToken);
  const hash = await bcrypt.hash(updateResquest.password, 10);
  user.password = hash;
  user.passwordResetToken = null;
  user.activationToken = null;
  user.inactive = false;
  await user.save();
  await TokenService.clearToken(user.id);
};
const findByPasswordResetToken = async (passwordResetToken) => {
  return User.findOne({ where: { passwordResetToken: passwordResetToken } });
};
module.exports = {
  save,
  findByEmail,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordResetResquest,
  updatePassword,
  findByPasswordResetToken,
};
