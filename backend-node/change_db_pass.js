const { Sequelize } = require('sequelize');

async function changePassword() {
    // Connect with working 'admin' password
    const sequelize = new Sequelize('merq', 'postgres', 'admin', {
        host: 'localhost',
        dialect: 'postgres',
        logging: console.log
    });

    try {
        await sequelize.authenticate();
        console.log('Connected with admin. Changing password to postgres...');
        await sequelize.query("ALTER USER postgres PASSWORD 'postgres';");
        console.log('Password changed successfully.');
    } catch (error) {
        console.error('Failed to change password:', error);
    } finally {
        await sequelize.close();
    }
}

changePassword();
