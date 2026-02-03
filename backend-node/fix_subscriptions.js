const { sequelize } = require('./src/config/db');

async function fixSubscriptionsTable() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Drop the existing subscriptions table
        console.log('Dropping subscriptions table...');
        await sequelize.query(`DROP TABLE IF EXISTS subscriptions CASCADE;`);

        // Create without FK constraints (Sequelize sync will add them)
        console.log('Creating subscriptions table with INTEGER id...');
        await sequelize.query(`
            CREATE TABLE subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                plan_id INTEGER NOT NULL,
                status VARCHAR(20) NOT NULL,
                start_date TIMESTAMP WITH TIME ZONE NOT NULL,
                end_date TIMESTAMP WITH TIME ZONE NOT NULL,
                auto_renew BOOLEAN DEFAULT false,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `);

        console.log('Subscriptions table recreated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing subscriptions table:', error.message);
        process.exit(1);
    }
}

fixSubscriptionsTable();
