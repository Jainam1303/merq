const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const User = sequelize.define('User', {
  angel_api_key: DataTypes.STRING,
  angel_client_code: DataTypes.STRING,
  angel_access_token: DataTypes.TEXT
}, { timestamps: false });

async function run() {
  const users = await User.findAll();
  console.log(users.map(u => ({
    api_key: u.angel_api_key, 
    client_code: u.angel_client_code, 
    access_token: u.angel_access_token ? 'YES' : 'NO'
  })));
}
run();
