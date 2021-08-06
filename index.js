const app = require('./src/app');
const sequelize = require('./src/config/database')

sequelize.sync();
app.listen(8080, () => {
  console.log('Server is runnig');
});
