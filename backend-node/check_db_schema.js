const { sequelize } = require('./src/config/db');
const { User } = require('./src/models');

async function checkSchema() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const tableInfo = await sequelize.getQueryInterface().describeTable('user');
        console.log('Columns in "user" table:', Object.keys(tableInfo));

        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

checkSchema();
