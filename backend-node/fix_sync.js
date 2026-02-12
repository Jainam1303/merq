/* eslint-disable no-console */
require('dotenv').config();
const { sequelize } = require('./src/config/db');

async function fixSyncIssue() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected to database.');

        // 1. Manually add whatsapp columns if missing (safe operations)
        console.log('Checking whatsapp columns...');
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='whatsapp_phone') THEN
                    ALTER TABLE "user" ADD COLUMN "whatsapp_phone" VARCHAR(20);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='whatsapp_api_key') THEN
                    ALTER TABLE "user" ADD COLUMN "whatsapp_api_key" VARCHAR(100);
                END IF;
            END
            $$;
        `);

        // 2. Manually add client_id column if missing
        console.log('Checking client_id column...');
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='client_id') THEN
                    ALTER TABLE "user" ADD COLUMN "client_id" VARCHAR(20);
                    -- Add unique constraint only if we just created it or it's missing
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_client_id_key') THEN
                     -- Try to add constraint if data allows (might fail if duplicates exist, but this is a fix script)
                     BEGIN
                        ALTER TABLE "user" ADD CONSTRAINT "user_client_id_key" UNIQUE ("client_id");
                     EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Could not add unique constraint to client_id (duplicates might exist)';
                     END;
                END IF;
            END
            $$;
        `);

        // 3. Fix referral_code manually to prevent Sequelize error
        console.log('Fixing referral_code...');
        // Change type safely
        await sequelize.query(`ALTER TABLE "user" ALTER COLUMN "referral_code" TYPE VARCHAR(20);`);

        // Add unique constraint safely
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_referral_code_key') THEN
                    -- Only add if valid
                    BEGIN
                        ALTER TABLE "user" ADD CONSTRAINT "user_referral_code_key" UNIQUE ("referral_code");
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Could not add unique constraint to referral_code';
                    END;
                END IF;
            END
            $$;
        `);

        console.log('✅ Database schema patched successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database fix failed:', error);
        if (error.original) console.error(error.original);
        process.exit(1);
    }
}

fixSyncIssue();
