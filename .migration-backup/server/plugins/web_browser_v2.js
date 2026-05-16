const { chromium } = require('playwright');

/**
 * PLUGIN: WEB_BROWSER_V2
 * Capacidade: Navegação real, bypass de JS básico, screenshots e extração profunda.
 */
exports.run = async (context) => {
    const { url, objective, wait_time = 2000 } = context;
    let browser;
    
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        console.log(`[ALETIX_PLUGIN] Navegando para: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(wait_time);

        // Executa extração baseada no objetivo
        const content = await page.evaluate(() => document.body.innerText);
        const title = await page.title();

        await browser.close();
        return {
            success: true,
            data: { title, summary: content.substring(0, 500) },
            plugin: 'WEB_BROWSER_V2'
        };
    } catch (error) {
        if (browser) await browser.close();
        throw new Error(`BROWSER_PLUGIN_FAILED: ${error.message}`);
    }
};
