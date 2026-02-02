const { sequelize, User, Plan, Subscription, Stock, StrategyConfig } = require('./src/models');

async function syncDatabase() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connection established.');

        // Sync models - this will create tables if they don't exist
        // Use alter: true to update existing tables
        console.log('Syncing all tables...');
        await sequelize.sync({ alter: true });

        console.log('Database sync completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Database sync failed:', error);
        process.exit(1);
    }
}

syncDatabase();
