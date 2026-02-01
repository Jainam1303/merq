const { sequelize } = require('./src/config/db');
const Plan = require('./src/models/Plan');

const seedPlans = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database Connected.');

        // Sync to ensure table exists
        await Plan.sync();

        const plansData = [
            {
                name: "1 Month",
                price: 2000,
                duration_days: 30,
                features: ["Basic Strategy Access", "Real-time Data", "5 Backtests/Day", "Community Support"],
                is_active: true
            },
            {
                name: "3 Months",
                price: 5500,
                duration_days: 90,
                features: ["Advanced Strategies", "Priority Data", "20 Backtests/Day", "Email Support", "Save 8%"],
                is_active: true
            },
            {
                name: "6 Months",
                price: 10000,
                duration_days: 180,
                features: ["All Strategies", "Ultra-low Latency", "Unlimited Backtests", "Priority Support", "Save 16%"],
                is_active: true
            },
            {
                name: "1 Year",
                price: 18000,
                duration_days: 365,
                features: ["VIP Access", "Dedicated Server", "Unlimited Everything", "24/7 Phone Support", "Save 25%"],
                is_active: true
            }
        ];

        for (const p of plansData) {
            // Check if plan exists to avoid duplicates
            const existing = await Plan.findOne({ where: { name: p.name } });
            if (!existing) {
                await Plan.create(p);
                console.log(`Created plan: ${p.name}`);
            } else {
                // Update existing plan features/price to match homepage
                await existing.update(p);
                console.log(`Updated plan: ${p.name}`);
            }
        }

        console.log('Plans seeding completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedPlans();
