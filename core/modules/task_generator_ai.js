require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const axios = require('axios');

async function analyzeOpportunities() {
    // Aqui a IA analisa dados externos ou internos (ex: tendências, API de mercado, scraping)
    return [
        { title: 'Auto Task 1', description: 'Generated via AI', reward: 0.01 },
        { title: 'Auto Task 2', description: 'Generated via AI', reward: 0.015 }
    ];
}

async function generateTasks() {
    const tasks = await analyzeOpportunities();

    for (const t of tasks) {
        const { data, error } = await supabase.from('task_marketplace').insert([{ title: t.title, description: t.description, reward: t.reward }]);
        if (error) console.error('[TASK_GEN_ERROR]', error.message);
        else console.log('[TASK_GENERATED]', t.title);
    }
}

async function runTaskGenerator(interval = 60000) {
    console.log('[GX]: Task Generation AI started...');
    setInterval(async () => {
        try {
            await generateTasks();
        } catch (err) {
            console.error('[GX_TASK_GEN_ERROR]', err.message);
        }
    }, interval);
}

module.exports = {
    runTaskGenerator
};
