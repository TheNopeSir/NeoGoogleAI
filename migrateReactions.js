/**
 * Migration Script: Convert all reactions to LIKE-only system
 *
 * This script:
 * 1. Converts all existing reactions (FIRE, HEART, STAR, TROPHY, COOL) to LIKE
 * 2. Restores proper like counters from reactions data
 * 3. Ensures view counters are preserved
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/neogoogleai';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrateReactions() {
    console.log('Starting reactions migration...');

    try {
        // Get all exhibits
        const result = await pool.query('SELECT id, data FROM exhibits');
        const exhibits = result.rows;

        console.log(`Found ${exhibits.length} exhibits to process`);

        let updated = 0;
        let skipped = 0;

        for (const exhibit of exhibits) {
            const data = exhibit.data;
            let needsUpdate = false;

            // Handle reactions
            if (data.reactions && Array.isArray(data.reactions) && data.reactions.length > 0) {
                // Collect all users who reacted with any type
                const allUsers = new Set();

                for (const reaction of data.reactions) {
                    if (reaction.users && Array.isArray(reaction.users)) {
                        reaction.users.forEach(user => allUsers.add(user));
                    }
                }

                // Convert to single LIKE reaction
                if (allUsers.size > 0) {
                    data.reactions = [{
                        type: 'LIKE',
                        users: Array.from(allUsers)
                    }];
                    needsUpdate = true;
                }
            } else if (data.likedBy && Array.isArray(data.likedBy) && data.likedBy.length > 0) {
                // Migrate from legacy likedBy
                data.reactions = [{
                    type: 'LIKE',
                    users: data.likedBy
                }];
                needsUpdate = true;
            }

            // Update likes counter
            if (data.reactions && data.reactions.length > 0) {
                const totalLikes = data.reactions.reduce((sum, r) => sum + (r.users?.length || 0), 0);
                data.likes = totalLikes;
                data.likedBy = data.reactions.flatMap(r => r.users || []);
                needsUpdate = true;
            } else {
                // Ensure likes counter is 0 if no reactions
                if (data.likes !== 0) {
                    data.likes = 0;
                    data.likedBy = [];
                    needsUpdate = true;
                }
            }

            // Ensure views counter exists and is a number
            if (typeof data.views !== 'number') {
                data.views = data.views ? parseInt(data.views, 10) : 0;
                if (isNaN(data.views)) data.views = 0;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await pool.query(
                    'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                    [data, exhibit.id]
                );
                updated++;

                if (updated % 10 === 0) {
                    console.log(`Progress: ${updated}/${exhibits.length} exhibits updated`);
                }
            } else {
                skipped++;
            }
        }

        console.log('\n✅ Migration complete!');
        console.log(`   Updated: ${updated} exhibits`);
        console.log(`   Skipped: ${skipped} exhibits (no changes needed)`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
migrateReactions().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
