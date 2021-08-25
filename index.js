const app = require('./src/app');
const sequelize = require('./src/config/database')
const User = require('./src/user/User');
const bcrypt = require('bcrypt');

const addUsers = async (activeUserCount, inactiveUsercount = 0) => {
  const hash = await bcrypt.hash('P4ssword',10);
  for (let i = 0; i < activeUserCount + inactiveUsercount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};
sequelize.sync({force:true}).then(async()=>{
   await addUsers(25)
})
// sequelize.sync();

app.listen(8080, () => {
  console.log('Server is runnig');
});
