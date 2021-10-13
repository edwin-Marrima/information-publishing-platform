const profiles  = require('../config/index');
const dbConfigs = {}

Object.keys(profiles).forEach(profile => {
  dbConfigs[profile] = { ...profiles[profile].database }
});
module.exports = dbConfigs;
