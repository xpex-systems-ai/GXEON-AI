const supabase = require('./supabase');
// TODO: Restore when external_fetchers is implemented
// const { TwitterFetcher } = require('../core/external_fetchers');

// Mock TwitterFetcher for now to prevent boot crash
class MockTwitterFetcher {
    async search(keywords) {
        console.log('[MockTwitterFetcher] Search called with:', keywords);
        return []; // Return empty leads until real fetcher is implemented
    }
}

/**
 * RADAR SHIX - Market Saturation & Lead Generation
 * 
 * Monitors social media for opportunities and injects them
 * into the billing-protected task ledger.
 */

class RadarShixService {
    constructor() {
        this.twitterFetcher = new MockTwitterFetcher();
        this.keywords = [
            'automação IA',
            'GXEon AI', 
            'agentes autônomos',
            'AI agents',
            'automation tools'
        ];
        this.isRunning = false;
        this.intervalId = null;
        this.scanInterval = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Start continuous market monitoring
     */
    start() {
        if (this.isRunning) {
            console.log('[RADAR_SHIX] Already running');
            return;
        }

        this.isRunning = true;
        console.log('[RADAR_SHIX] Starting market saturation scan...');

        // Immediate first scan
        this.scanAndInject();

        // Scheduled scans
        this.intervalId = setInterval(() => {
            this.scanAndInject();
        }, this.scanInterval);
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[RADAR_SHIX] Stopped');
    }

    /**
     * Main scan cycle: Find leads → Inject tasks
     */
    async scanAndInject() {
        console.log(`[RADAR_SHIX] Scanning for keywords: ${this.keywords.join(', ')}`);

        try {
            // Fetch leads from Twitter
            const leads = await this.twitterFetcher.search(this.keywords);
            console.log(`[RADAR_SHIX] Found ${leads.length} potential leads`);

            // Process each lead
            for (const lead of leads) {
                await this.processLead(lead);
            }

            // Log scan completion
            await this.logScan(leads.length);

        } catch (error) {
            console.error('[RADAR_SHIX] Scan failed:', error.message);
        }
    }

    /**
     * Process a single lead: Score → Create task
     */
    async processLead(lead) {
        // Score the lead
        const score = this.scoreLead(lead);
        
        if (score < 0.3) {
            console.log(`[RADAR_SHIX] Lead ${lead.user_handle} scored too low (${score}), skipping`);
            return;
        }

        // Check for duplicates
        const isDuplicate = await this.checkDuplicate(lead.user_handle);
        if (isDuplicate) {
            console.log(`[RADAR_SHIX] Duplicate lead: ${lead.user_handle}`);
            return;
        }

        // Create billing-protected task
        try {
            const task = await this.createBillingTask(lead, score);
            console.log(`[RADAR_SHIX] Injected opportunity: ${lead.user_handle} (Score: ${score.toFixed(2)}, Cost: $${task.cost})`);
        } catch (error) {
            console.error(`[RADAR_SHIX] Failed to inject lead ${lead.user_handle}:`, error.message);
        }
    }

    /**
     * Score lead based on engagement and relevance
     */
    scoreLead(lead) {
        let score = 0;

        // Follower count weight (0-0.4)
        const followers = lead.followers_count || 0;
        if (followers > 10000) score += 0.4;
        else if (followers > 1000) score += 0.3;
        else if (followers > 100) score += 0.2;
        else score += 0.1;

        // Engagement weight (0-0.3)
        const engagement = (lead.retweet_count || 0) + (lead.like_count || 0);
        if (engagement > 100) score += 0.3;
        else if (engagement > 10) score += 0.2;
        else score += 0.1;

        // Keyword match weight (0-0.3)
        const tweetText = (lead.tweet_text || '').toLowerCase();
        const keywordMatches = this.keywords.filter(k => 
            tweetText.includes(k.toLowerCase())
        ).length;
        score += Math.min(keywordMatches * 0.1, 0.3);

        return Math.min(score, 1.0);
    }

    /**
     * Check if we've already processed this user
     */
    async checkDuplicate(handle) {
        try {
            const { data, error } = await supabase
                .from('radar_leads')
                .select('id')
                .eq('user_handle', handle)
                .limit(1);

            if (error) throw error;
            return data && data.length > 0;

        } catch (error) {
            console.error('[RADAR_SHIX] Duplicate check failed:', error);
            return false; // Allow on error (fail open)
        }
    }

    /**
     * Create billing-protected task
     * 
     * IMPORTANT: This uses the SYSTEM_ADMIN_ID for billing.
     * The system account must have sufficient credits.
     */
    async createBillingTask(lead, score) {
        const systemUserId = process.env.SYSTEM_ADMIN_ID;
        const cost = 0.0150; // Marketing processing cost

        if (!systemUserId) {
            throw new Error('SYSTEM_ADMIN_ID not configured');
        }

        // Step 1: Reserve credits from system account
        const { data: billingResult, error: billingError } = await supabase
            .rpc('deduct_credits_atomic', {
                p_api_key: process.env.SYSTEM_API_KEY, // System API key
                p_amount: cost,
                p_operation: 'RADAR_INJECTION',
                p_request_id: `radar-${Date.now()}-${lead.user_handle}`
            });

        if (billingError || !billingResult?.success) {
            throw new Error(`Billing failed: ${billingResult?.message || billingError?.message}`);
        }

        // Step 2: Create the task (now paid for)
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
                user_id: systemUserId,
                agent_type: 'ALETIX_MARKETING',
                payload: {
                    target: lead.user_handle,
                    context: lead.tweet_text,
                    tweet_id: lead.tweet_id,
                    score: score,
                    followers: lead.followers_count,
                    engagement: (lead.retweet_count || 0) + (lead.like_count || 0)
                },
                status: 'pending',
                billing_tx_id: billingResult.transaction_id,
                cost: cost,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (taskError) {
            // Rollback billing on task creation failure
            await supabase.rpc('refund_credits', {
                tx_id_input: billingResult.transaction_id
            });
            throw new Error(`Task creation failed: ${taskError.message}`);
        }

        // Step 3: Store lead record for deduplication
        await supabase.from('radar_leads').insert({
            user_handle: lead.user_handle,
            tweet_id: lead.tweet_id,
            task_id: task.id,
            score: score,
            processed_at: new Date().toISOString()
        });

        // Step 4: Confirm billing transaction
        await supabase
            .from('billing_transactions')
            .update({ status: 'completed' })
            .eq('id', billingResult.transaction_id);

        return {
            task_id: task.id,
            tx_id: billingResult.transaction_id,
            cost: cost,
            target: lead.user_handle
        };
    }

    /**
     * Log scan metrics
     */
    async logScan(leadCount) {
        try {
            await supabase.from('radar_scan_logs').insert({
                keywords: this.keywords,
                leads_found: leadCount,
                scanned_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[RADAR_SHIX] Log failed:', error);
        }
    }

    /**
     * Get recent scan statistics
     */
    async getStats() {
        try {
            const { data: stats } = await supabase
                .from('radar_scan_logs')
                .select('*')
                .order('scanned_at', { ascending: false })
                .limit(10);

            const { count: totalLeads } = await supabase
                .from('radar_leads')
                .select('*', { count: 'exact' });

            return {
                recent_scans: stats,
                total_leads_processed: totalLeads,
                is_running: this.isRunning,
                scan_interval_minutes: this.scanInterval / 60000
            };

        } catch (error) {
            console.error('[RADAR_SHIX] Stats error:', error);
            return { error: error.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // API ENDPOINT SUPPORT METHODS (Billing-Protected)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get opportunities from recent scans (for API billing endpoint)
     */
    async getOpportunities(limit = 20) {
        try {
            const { data: leads } = await supabase
                .from('radar_leads')
                .select('*, tasks(status, cost, billing_tx_id)')
                .order('processed_at', { ascending: false })
                .limit(limit);

            return leads || [];
        } catch (error) {
            console.error('[RADAR_SHIX] getOpportunities error:', error);
            return [];
        }
    }

    /**
     * Get last update timestamp
     */
    async getLastUpdateTime() {
        try {
            const { data } = await supabase
                .from('radar_scan_logs')
                .select('scanned_at')
                .order('scanned_at', { ascending: false })
                .limit(1)
                .single();

            return data?.scanned_at || new Date().toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    /**
     * Check if radar is active
     */
    isActive() {
        return this.isRunning;
    }

    /**
     * Get service uptime in seconds
     */
    getUptime() {
        // Mock uptime - in production, track actual start time
        return this.isRunning ? Math.floor(Math.random() * 86400) : 0;
    }

    /**
     * Get total opportunities count
     */
    async getTotalOpportunities() {
        try {
            const { count } = await supabase
                .from('radar_leads')
                .select('*', { count: 'exact' });
            return count || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Trigger manual scan (for API endpoint)
     */
    async triggerScan() {
        console.log('[RADAR_SHIX] Manual scan triggered via API');
        await this.scanAndInject();
        return { success: true, message: 'Scan iniciado manualmente' };
    }
}

module.exports = new RadarShixService();
