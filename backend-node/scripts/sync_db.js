const { sequelize } = require('../src/models');

(async () => {
    try {
        console.log('Syncing database schema (alter: true)...');
        // 'alter: true' checks current state and adds missing columns/tables
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error syncing database:', error);
        process.exit(1);
    }
})();
