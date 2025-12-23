const db = require('../db');

const GARDEN_ACHIEVEMENTS = {
    first_seed: { name: 'First Seed', description: 'Plant your first flower', icon: '🌱', threshold: 1 },
    sunshine_collector: { name: 'Sunshine Collector', description: 'Plant 10 happy plants', icon: '🌻', threshold: 10 },
    emotional_balance: { name: 'Emotional Balance', description: 'Plant all mood categories', icon: '🌈', threshold: 6 },
    century_garden: { name: 'Century Garden', description: 'Plant 100 flowers', icon: '🌿', threshold: 100 },
    streak_master: { name: 'Streak Master', description: '30-day watering streak', icon: '🔥', threshold: 30 },
    legendary_gardener: { name: 'Legendary Gardener', description: 'Unlock a legendary plant', icon: '👑', threshold: 1 },
    full_spectrum: { name: 'Full Spectrum', description: 'Have 10 different plant types', icon: '🎨', threshold: 10 },
    garden_guru: { name: 'Garden Guru', description: 'Reach level 25', icon: '🎖️', threshold: 25 },
};

/**
 * XP required for each level (cumulative)
 */
const getLevelXpRequirement = (level) => {
    // Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, etc.
    // Formula: level * 100 + (level - 1) * 50
    return level * 100 + (level - 1) * 50;
};

/**
 * Calculate level from total XP
 */
const calculateLevel = (totalXp) => {
    let level = 1;
    while (getLevelXpRequirement(level + 1) <= totalXp) {
        level++;
    }
    return level;
};

/**
 * Map mood labels to garden categories
 */
const moodToCategory = (moodLabel) => {
    const moodMap = {
        // Happy moods
        happy: 'happy', joyful: 'happy', content: 'happy', cheerful: 'happy',
        // Sad moods
        sad: 'sad', melancholic: 'sad', down: 'sad', blue: 'sad',
        // Calm moods
        calm: 'calm', peaceful: 'calm', relaxed: 'calm', serene: 'calm',
        // Excited moods
        excited: 'excited', energetic: 'excited', enthusiastic: 'excited', motivated: 'excited',
        // Grateful moods
        grateful: 'grateful', thankful: 'grateful', appreciative: 'grateful', blessed: 'grateful',
        // Neutral/other
        neutral: 'neutral', anxious: 'neutral', stressed: 'neutral', angry: 'neutral',
        tired: 'neutral', hopeful: 'calm', nostalgic: 'calm', confident: 'excited'
    };
    return moodMap[moodLabel?.toLowerCase()] || 'neutral';
};

/**
 * Get or create user's garden
 */
async function getOrCreateGarden(userId) {
    // Check if garden exists
    const [gardens] = await db.query(
        `SELECT * FROM user_gardens WHERE user_id = ?`,
        [userId]
    );

    if (gardens.length > 0) {
        return gardens[0];
    }

    // Create new garden
    await db.query(
        `INSERT INTO user_gardens (user_id) VALUES (?)`,
        [userId]
    );

    const [newGarden] = await db.query(
        `SELECT * FROM user_gardens WHERE user_id = ?`,
        [userId]
    );

    return newGarden[0];
}

/**
 * GET /api/garden
 * Get user's garden with all plants
 */
async function getGarden(req, res) {
    try {
        const userId = req.user.id;

        // Get or create garden
        const garden = await getOrCreateGarden(userId);

        // Calculate current level based on XP
        const level = calculateLevel(garden.total_xp);
        const nextLevelXp = getLevelXpRequirement(level + 1);

        // Get all plants in the garden
        const [plants] = await db.query(`
            SELECT gp.*, gpt.name, gpt.emoji, gpt.category, gpt.rarity, gpt.description
            FROM garden_plants gp
            JOIN garden_plant_types gpt ON gp.plant_type_id = gpt.id
            WHERE gp.user_id = ?
            ORDER BY gp.planted_at DESC
        `, [userId]);

        // Get plant counts by category
        const [categoryCounts] = await db.query(`
            SELECT gpt.category, COUNT(*) as count
            FROM garden_plants gp
            JOIN garden_plant_types gpt ON gp.plant_type_id = gpt.id
            WHERE gp.user_id = ?
            GROUP BY gpt.category
        `, [userId]);

        // Get rarity counts
        const [rarityCounts] = await db.query(`
            SELECT gpt.rarity, COUNT(*) as count
            FROM garden_plants gp
            JOIN garden_plant_types gpt ON gp.plant_type_id = gpt.id
            WHERE gp.user_id = ?
            GROUP BY gpt.rarity
        `, [userId]);

        // Format stats
        const stats = {
            byCategory: {},
            byRarity: {}
        };
        categoryCounts.forEach(c => { stats.byCategory[c.category] = c.count; });
        rarityCounts.forEach(r => { stats.byRarity[r.rarity] = r.count; });

        // Check if watering is needed (last watered > 24 hours ago)
        const lastWatered = garden.last_watered_at ? new Date(garden.last_watered_at) : null;
        const hoursElapsed = lastWatered ? (Date.now() - lastWatered.getTime()) / (1000 * 60 * 60) : 999;
        const needsWatering = hoursElapsed >= 24;

        res.json({
            garden: {
                id: garden.id,
                level,
                xp: garden.total_xp,
                nextLevelXp,
                totalPlants: garden.total_plants,
                streak: garden.current_streak,
                longestStreak: garden.longest_streak,
                theme: garden.garden_theme,
                lastWatered: garden.last_watered_at,
                needsWatering
            },
            plants,
            stats
        });

    } catch (err) {
        console.error('Get garden error:', err);
        res.status(500).json({ message: 'Failed to fetch garden' });
    }
}

/**
 * POST /api/garden/plant
 * Plant a new flower (called when entry is created)
 */
async function plantFlower(req, res) {
    try {
        const userId = req.user.id;
        const { entryId, mood } = req.body;

        if (!mood) {
            return res.status(400).json({ message: 'Mood is required' });
        }

        // Get or create garden
        const garden = await getOrCreateGarden(userId);

        // Determine plant category from mood
        const category = moodToCategory(mood);

        // Get available plants for this category (weighted by rarity)
        const [availablePlants] = await db.query(`
            SELECT * FROM garden_plant_types WHERE category = ?
        `, [category]);

        if (availablePlants.length === 0) {
            return res.status(400).json({ message: 'No plants available for this mood' });
        }

        // Weighted random selection based on rarity
        // common: 60%, uncommon: 25%, rare: 10%, legendary: 5%
        const weights = { common: 60, uncommon: 25, rare: 10, legendary: 5 };
        const weightedPlants = [];
        availablePlants.forEach(plant => {
            const weight = weights[plant.rarity] || 10;
            for (let i = 0; i < weight; i++) {
                weightedPlants.push(plant);
            }
        });

        const selectedPlant = weightedPlants[Math.floor(Math.random() * weightedPlants.length)];

        // Calculate grid position (simple sequential for now)
        const posX = garden.total_plants % 10;
        const posY = Math.floor(garden.total_plants / 10);

        // Insert the plant
        const [result] = await db.query(`
            INSERT INTO garden_plants (user_id, plant_type_id, entry_id, position_x, position_y)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, selectedPlant.id, entryId || null, posX, posY]);

        // Update garden stats
        const newXp = garden.total_xp + selectedPlant.xp_value;
        const newLevel = calculateLevel(newXp);
        const leveledUp = newLevel > calculateLevel(garden.total_xp);

        await db.query(`
            UPDATE user_gardens 
            SET total_xp = ?, total_plants = total_plants + 1, updated_at = NOW()
            WHERE user_id = ?
        `, [newXp, userId]);

        // Check for achievements
        const newAchievements = await checkGardenAchievements(userId, garden.total_plants + 1, selectedPlant);

        res.json({
            plant: {
                id: result.insertId,
                name: selectedPlant.name,
                emoji: selectedPlant.emoji,
                category: selectedPlant.category,
                rarity: selectedPlant.rarity,
                description: selectedPlant.description,
                position: { x: posX, y: posY }
            },
            xpEarned: selectedPlant.xp_value,
            totalXp: newXp,
            leveledUp,
            newLevel: leveledUp ? newLevel : null,
            achievements: newAchievements
        });

    } catch (err) {
        console.error('Plant flower error:', err);
        res.status(500).json({ message: 'Failed to plant flower' });
    }
}

/**
 * POST /api/garden/water
 * Water the garden (maintain streak, restore health)
 */
async function waterGarden(req, res) {
    try {
        const userId = req.user.id;

        // Get or create garden
        const garden = await getOrCreateGarden(userId);

        // Check if already watered today
        const lastWatered = garden.last_watered_at ? new Date(garden.last_watered_at) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastWatered) {
            const lastWateredDate = new Date(lastWatered);
            lastWateredDate.setHours(0, 0, 0, 0);

            if (lastWateredDate.getTime() === today.getTime()) {
                return res.json({
                    message: 'Garden already watered today',
                    alreadyWatered: true,
                    streak: garden.current_streak
                });
            }
        }

        // Calculate streak
        let newStreak = 1;
        if (lastWatered) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const lastWateredDate = new Date(lastWatered);
            lastWateredDate.setHours(0, 0, 0, 0);

            if (lastWateredDate.getTime() === yesterday.getTime()) {
                // Consecutive day - increment streak
                newStreak = garden.current_streak + 1;
            }
            // Otherwise streak resets to 1
        }

        const longestStreak = Math.max(newStreak, garden.longest_streak);

        // Calculate XP bonus (15 base + 5 per streak day, max 50)
        const streakBonus = Math.min(5 * newStreak, 35);
        const wateringXp = 15 + streakBonus;
        const newXp = garden.total_xp + wateringXp;

        // Update garden
        await db.query(`
            UPDATE user_gardens 
            SET last_watered_at = NOW(), 
                current_streak = ?,
                longest_streak = ?,
                total_xp = ?,
                updated_at = NOW()
            WHERE user_id = ?
        `, [newStreak, longestStreak, newXp, userId]);

        // Restore health to all plants
        const [healResult] = await db.query(`
            UPDATE garden_plants 
            SET health = 100 
            WHERE user_id = ? AND health < 100
        `, [userId]);

        // Check for streak achievements
        const achievements = await checkStreakAchievements(userId, newStreak);

        res.json({
            message: 'Garden watered successfully! 💧',
            streak: newStreak,
            longestStreak,
            xpEarned: wateringXp,
            totalXp: newXp,
            plantsHealed: healResult.affectedRows,
            achievements
        });

    } catch (err) {
        console.error('Water garden error:', err);
        res.status(500).json({ message: 'Failed to water garden' });
    }
}

/**
 * GET /api/garden/achievements
 * Get garden achievements
 */
async function getGardenAchievements(req, res) {
    try {
        const userId = req.user.id;

        // Get unlocked achievements
        const [unlocked] = await db.query(`
            SELECT achievement_type, unlocked_at, metadata
            FROM garden_achievements 
            WHERE user_id = ?
            ORDER BY unlocked_at DESC
        `, [userId]);

        // Build full achievements list with unlock status
        const achievements = Object.entries(GARDEN_ACHIEVEMENTS).map(([type, data]) => {
            const unlockedData = unlocked.find(a => a.achievement_type === type);
            return {
                type,
                ...data,
                unlocked: !!unlockedData,
                unlockedAt: unlockedData?.unlocked_at || null
            };
        });

        res.json({
            achievements,
            totalUnlocked: unlocked.length,
            totalAchievements: Object.keys(GARDEN_ACHIEVEMENTS).length
        });

    } catch (err) {
        console.error('Get garden achievements error:', err);
        res.status(500).json({ message: 'Failed to fetch achievements' });
    }
}

/**
 * GET /api/garden/plant-types
 * Get all available plant types
 */
async function getPlantTypes(req, res) {
    try {
        const [plantTypes] = await db.query(`
            SELECT * FROM garden_plant_types ORDER BY category, rarity
        `);

        res.json({ plantTypes });

    } catch (err) {
        console.error('Get plant types error:', err);
        res.status(500).json({ message: 'Failed to fetch plant types' });
    }
}

/**
 * Helper: Check and unlock garden achievements
 */
async function checkGardenAchievements(userId, totalPlants, plant) {
    const unlockedNow = [];

    try {
        const [existing] = await db.query(
            `SELECT achievement_type FROM garden_achievements WHERE user_id = ?`,
            [userId]
        );
        const existingTypes = new Set(existing.map(a => a.achievement_type));

        // First Seed achievement
        if (totalPlants === 1 && !existingTypes.has('first_seed')) {
            await db.query(
                `INSERT INTO garden_achievements (user_id, achievement_type) VALUES (?, 'first_seed')`,
                [userId]
            );
            unlockedNow.push({ ...GARDEN_ACHIEVEMENTS.first_seed, type: 'first_seed' });
        }

        // Century Garden (100 plants)
        if (totalPlants >= 100 && !existingTypes.has('century_garden')) {
            await db.query(
                `INSERT INTO garden_achievements (user_id, achievement_type) VALUES (?, 'century_garden')`,
                [userId]
            );
            unlockedNow.push({ ...GARDEN_ACHIEVEMENTS.century_garden, type: 'century_garden' });
        }

        // Legendary Gardener (plant a legendary)
        if (plant.rarity === 'legendary' && !existingTypes.has('legendary_gardener')) {
            await db.query(
                `INSERT INTO garden_achievements (user_id, achievement_type) VALUES (?, 'legendary_gardener')`,
                [userId]
            );
            unlockedNow.push({ ...GARDEN_ACHIEVEMENTS.legendary_gardener, type: 'legendary_gardener' });
        }

        // Check for Emotional Balance (all 6 categories)
        const [categories] = await db.query(`
            SELECT DISTINCT gpt.category
            FROM garden_plants gp
            JOIN garden_plant_types gpt ON gp.plant_type_id = gpt.id
            WHERE gp.user_id = ?
        `, [userId]);

        if (categories.length >= 6 && !existingTypes.has('emotional_balance')) {
            await db.query(
                `INSERT INTO garden_achievements (user_id, achievement_type) VALUES (?, 'emotional_balance')`,
                [userId]
            );
            unlockedNow.push({ ...GARDEN_ACHIEVEMENTS.emotional_balance, type: 'emotional_balance' });
        }

        // Check for Full Spectrum (10 different plant types)
        const [plantTypesCount] = await db.query(`
            SELECT COUNT(DISTINCT plant_type_id) as count FROM garden_plants WHERE user_id = ?
        `, [userId]);

        if (plantTypesCount[0].count >= 10 && !existingTypes.has('full_spectrum')) {
            await db.query(
                `INSERT INTO garden_achievements (user_id, achievement_type) VALUES (?, 'full_spectrum')`,
                [userId]
            );
            unlockedNow.push({ ...GARDEN_ACHIEVEMENTS.full_spectrum, type: 'full_spectrum' });
        }

    } catch (err) {
        console.error('Check garden achievements error:', err);
    }

    return unlockedNow;
}

/**
 * Helper: Check streak achievements
 */
async function checkStreakAchievements(userId, streak) {
    const unlockedNow = [];

    try {
        const [existing] = await db.query(
            `SELECT achievement_type FROM garden_achievements WHERE user_id = ?`,
            [userId]
        );
        const existingTypes = new Set(existing.map(a => a.achievement_type));

        // Streak Master (30 days)
        if (streak >= 30 && !existingTypes.has('streak_master')) {
            await db.query(
                `INSERT INTO garden_achievements (user_id, achievement_type) VALUES (?, 'streak_master')`,
                [userId]
            );
            unlockedNow.push({ ...GARDEN_ACHIEVEMENTS.streak_master, type: 'streak_master' });
        }

        // Check Garden Guru (level 25)
        const [garden] = await db.query(`SELECT total_xp FROM user_gardens WHERE user_id = ?`, [userId]);
        if (garden.length > 0) {
            const level = calculateLevel(garden[0].total_xp);
            if (level >= 25 && !existingTypes.has('garden_guru')) {
                await db.query(
                    `INSERT INTO garden_achievements (user_id, achievement_type) VALUES (?, 'garden_guru')`,
                    [userId]
                );
                unlockedNow.push({ ...GARDEN_ACHIEVEMENTS.garden_guru, type: 'garden_guru' });
            }
        }

    } catch (err) {
        console.error('Check streak achievements error:', err);
    }

    return unlockedNow;
}

module.exports = {
    getGarden,
    plantFlower,
    waterGarden,
    getGardenAchievements,
    getPlantTypes,
    moodToCategory,
    GARDEN_ACHIEVEMENTS
};
