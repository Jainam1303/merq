/**
 * Backfill client_id for existing users who don't have one.
 * Run: node backfill_client_ids.js
 * 
 * This script:
 * 1. Adds the client_id column if it doesn't exist
 * 2. Generates unique MQ-XXXXXX IDs for all existing users
 */

const { sequelize } = require('./src/config/db');
const crypto = require('crypto');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateClientId() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CHARS.charAt(crypto.randomInt(CHARS.length));
    }
    return `MQ-${code}`;
}

async function backfill() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Step 1: Check if column exists, add if not
        try {
            await sequelize.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS client_id VARCHAR(20) UNIQUE;`);
            console.log('✅ client_id column ensured.');
        } catch (e) {
            console.log('Column may already exist:', e.message);
        }

        // Step 2: Get all users without a client_id
        const [users] = await sequelize.query(`SELECT id, username FROM "user" WHERE client_id IS NULL;`);
        console.log(`Found ${users.length} users without client_id.`);

        if (users.length === 0) {
            console.log('Nothing to do. All users have client IDs.');
            process.exit(0);
        }

        // Step 3: Collect existing IDs to avoid collisions
        const [existing] = await sequelize.query(`SELECT client_id FROM "user" WHERE client_id IS NOT NULL;`);
        const usedIds = new Set(existing.map(r => r.client_id));

        // Step 4: Generate and assign
        let updated = 0;
        for (const user of users) {
            let attempts = 0;
            let newId;
            do {
                newId = generateClientId();
                attempts++;
            } while (usedIds.has(newId) && attempts < 100);

            if (usedIds.has(newId)) {
                console.error(`❌ Could not generate unique ID for user ${user.username} after 100 attempts!`);
                continue;
            }

            await sequelize.query(`UPDATE "user" SET client_id = $1 WHERE id = $2;`, {
                bind: [newId, user.id]
            });
            usedIds.add(newId);
            updated++;
            console.log(`  ${user.username} → ${newId}`);
        }

        console.log(`\n✅ Backfill complete. Updated ${updated} users.`);
        process.exit(0);
    } catch (error) {
        console.error('Backfill failed:', error);
        process.exit(1);
    }
}

backfill();
