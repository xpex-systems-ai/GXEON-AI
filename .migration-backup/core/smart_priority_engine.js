// GXEON Smart Priority Engine
// Rankeia e filtra tasks baseado em potencial de lucro e facilidade de execução

class SmartPriorityEngine {
  constructor(config = {}) {
    this.config = {
      weights: {
        reward_value: 0.4,
        task_type: 0.2,
        execution_complexity: 0.2,
        time_decay: 0.1,
        success_probability: 0.1,
        ...config.weights
      },
      minRewardThreshold: config.minRewardThreshold || 0.2,
      excludeTypes: config.excludeTypes || ['only_social_no_reward']
    };
  }

  // ==================== MAIN SCORING ====================
  
  calculatePriorityScore(task) {
    const scores = {
      reward_value: this.scoreRewardValue(task),
      task_type: this.scoreTaskType(task),
      execution_complexity: this.scoreExecutionComplexity(task),
      time_decay: this.scoreTimeDecay(task),
      success_probability: this.scoreSuccessProbability(task)
    };

    // Calculate weighted total
    let totalScore = 0;
    for (const [factor, score] of Object.entries(scores)) {
      const weight = this.config.weights[factor] || 0;
      totalScore += score * weight;
    }

    // Round to 2 decimal places
    totalScore = Math.round(totalScore * 100) / 100;

    // Classify
    const complexity = this.classifyComplexity(task);
    const successProb = this.classifySuccessProbability(task);

    return {
      priority_score: totalScore,
      complexity: complexity,
      success_probability: successProb,
      factor_scores: scores,
      recommendation: this.generateRecommendation(totalScore),
      actions: this.determineActions(totalScore)
    };
  }

  // ==================== INDIVIDUAL SCORERS ====================

  scoreRewardValue(task) {
    const value = this.extractNumericValue(task.reward_value_estimate || task.reward?.value || 0);
    
    // Scoring tiers
    if (value >= 10) return 100;      // High: >= 10
    if (value >= 1) return 70;         // Medium: >= 1
    if (value >= 0.1) return 50;      // Low: >= 0.1
    if (value >= 0.01) return 30;     // Very low: >= 0.01
    return 10;                         // Negligible
  }

  scoreTaskType(task) {
    const typeScores = {
      'onchain': 100,
      'api': 80,
      'social': 40,
      'quest': 60,
      'manual': 20
    };

    const type = (task.type || '').toLowerCase();
    return typeScores[type] || 30;
  }

  scoreExecutionComplexity(task) {
    const complexity = this.classifyComplexity(task);
    
    const complexityScores = {
      'low': 100,
      'medium': 60,
      'high': 20
    };

    return complexityScores[complexity] || 50;
  }

  scoreTimeDecay(task) {
    const createdAt = task.created_at || task.timing?.start;
    if (!createdAt) return 100; // Fresh task, no decay

    const created = new Date(createdAt);
    const now = new Date();
    const hoursSince = (now - created) / (1000 * 60 * 60);

    // Decay formula: 100 - (hours * 0.5), min 10
    // Tasks older than 7 days get minimum score
    if (hoursSince > 168) return 10; // > 7 days
    if (hoursSince > 24) return 50;   // > 1 day
    if (hoursSince > 6) return 75;    // > 6 hours
    return 100;                       // Fresh
  }

  scoreSuccessProbability(task) {
    const probability = this.classifySuccessProbability(task);
    
    const probabilityScores = {
      'deterministic': 100,
      'semi_deterministic': 70,
      'uncertain': 30
    };

    return probabilityScores[probability] || 50;
  }

  // ==================== CLASSIFICATION ====================

  classifyComplexity(task) {
    const type = (task.type || '').toLowerCase();
    const requirements = task.requirements || [];
    const steps = task.execution_steps || [];

    // Type-based classification
    if (type === 'api') return 'low';
    if (type === 'onchain') return 'medium';
    if (type === 'social') return 'high';

    // Step count-based
    const stepCount = steps.length || requirements.length;
    if (stepCount <= 1) return 'low';
    if (stepCount <= 3) return 'medium';
    return 'high';
  }

  classifySuccessProbability(task) {
    const type = (task.type || '').toLowerCase();
    const requirements = task.requirements || [];

    // Type-based classification
    if (type === 'api') return 'deterministic';
    if (type === 'onchain') return 'semi_deterministic';
    if (type === 'social') return 'uncertain';

    // Check for uncertain requirements
    const hasSocial = requirements.some(r => 
      r.action?.includes('twitter') || 
      r.action?.includes('discord') ||
      r.action?.includes('telegram')
    );

    if (hasSocial) return 'uncertain';
    return 'semi_deterministic';
  }

  // ==================== FILTERS ====================

  shouldProcessTask(task) {
    // Check minimum reward threshold
    const value = this.extractNumericValue(task.reward_value_estimate || task.reward?.value || 0);
    if (value < this.config.minRewardThreshold) {
      return {
        shouldProcess: false,
        reason: `Reward ${value} below threshold ${this.config.minRewardThreshold}`
      };
    }

    // Check excluded types
    const type = (task.type || '').toLowerCase();
    const hasReward = value > 0;
    
    // Check "only_social_no_reward" pattern
    if (this.config.excludeTypes.includes('only_social_no_reward')) {
      if (type === 'social' && !hasReward) {
        return {
          shouldProcess: false,
          reason: 'Social task without reward'
        };
      }
    }

    return {
      shouldProcess: true,
      reason: 'Task passes all filters'
    };
  }

  // ==================== RECOMMENDATIONS & ACTIONS ====================

  generateRecommendation(score) {
    if (score >= 80) return 'HIGH_PRIORITY - Execute immediately';
    if (score >= 60) return 'MEDIUM_PRIORITY - Queue for execution';
    if (score >= 40) return 'LOW_PRIORITY - Consider execution';
    return 'SKIP - Low value/complexity ratio';
  }

  determineActions(score) {
    if (score >= 80) {
      return ['auto_enqueue', 'assign_best_agent', 'notify_operator'];
    }
    if (score >= 60) {
      return ['auto_enqueue', 'assign_standard_agent'];
    }
    if (score >= 40) {
      return ['manual_review'];
    }
    return ['archive_or_ignore'];
  }

  // ==================== BATCH PROCESSING ====================

  async processTasks(tasks) {
    const results = {
      processed: [],
      filtered: [],
      total_score: 0,
      high_priority: [],
      medium_priority: [],
      low_priority: []
    };

    for (const task of tasks) {
      // Filter check
      const filterCheck = this.shouldProcessTask(task);
      if (!filterCheck.shouldProcess) {
        results.filtered.push({
          task: task,
          reason: filterCheck.reason
        });
        continue;
      }

      // Calculate score
      const scoring = this.calculatePriorityScore(task);
      
      const processedTask = {
        ...task,
        priority_score: scoring.priority_score,
        complexity: scoring.complexity,
        success_probability: scoring.success_probability,
        factor_scores: scoring.factor_scores,
        recommendation: scoring.recommendation,
        actions: scoring.actions
      };

      results.processed.push(processedTask);
      results.total_score += scoring.priority_score;

      // Categorize by priority
      if (scoring.priority_score >= 80) {
        results.high_priority.push(processedTask);
      } else if (scoring.priority_score >= 60) {
        results.medium_priority.push(processedTask);
      } else {
        results.low_priority.push(processedTask);
      }
    }

    // Sort by priority score descending
    const sortByScore = (a, b) => b.priority_score - a.priority_score;
    results.processed.sort(sortByScore);
    results.high_priority.sort(sortByScore);
    results.medium_priority.sort(sortByScore);
    results.low_priority.sort(sortByScore);

    // Calculate average score
    if (results.processed.length > 0) {
      results.average_score = results.total_score / results.processed.length;
    }

    return results;
  }

  // ==================== UTILITIES ====================

  extractNumericValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // Get best agent based on task and score
  getBestAgent(task, availableAgents = []) {
    const type = (task.type || '').toLowerCase();
    const score = task.priority_score || 0;

    // Agent preference by type
    const typeAgentMap = {
      'social': 'social_agent',
      'onchain': 'onchain_agent',
      'api': 'api_agent',
      'quest': 'api_agent'
    };

    const preferredAgent = typeAgentMap[type];
    
    if (availableAgents.includes(preferredAgent)) {
      return preferredAgent;
    }

    // Fallback to any available agent
    if (availableAgents.length > 0) {
      return availableAgents[0];
    }

    return preferredAgent || 'api_agent';
  }

  // Generate summary report
  generateReport(processedResults) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total_tasks: processedResults.processed.length + processedResults.filtered.length,
        processed: processedResults.processed.length,
        filtered: processedResults.filtered.length,
        average_score: processedResults.average_score?.toFixed(2) || 0,
        high_priority: processedResults.high_priority.length,
        medium_priority: processedResults.medium_priority.length,
        low_priority: processedResults.low_priority.length
      },
      top_tasks: processedResults.high_priority.slice(0, 5).map(t => ({
        id: t.id || t.task_id,
        title: t.title,
        score: t.priority_score,
        type: t.type,
        reward: t.reward_value_estimate || t.reward?.value,
        recommendation: t.recommendation
      })),
      filtered_reasons: this.aggregateFilterReasons(processedResults.filtered)
    };
  }

  aggregateFilterReasons(filteredTasks) {
    const reasons = {};
    for (const item of filteredTasks) {
      const reason = item.reason;
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
    return reasons;
  }
}

module.exports = { SmartPriorityEngine };

// Standalone test
if (require.main === module) {
  const engine = new SmartPriorityEngine();
  
  // Test tasks
  const testTasks = [
    {
      id: 'test_001',
      title: 'High Value Onchain Task',
      type: 'onchain',
      reward: { value: 15, type: 'token' },
      requirements: [{ action: 'swap' }],
      created_at: new Date().toISOString()
    },
    {
      id: 'test_002',
      title: 'Low Value Social Task',
      type: 'social',
      reward: { value: 0.05, type: 'points' },
      requirements: [{ action: 'twitter_follow' }],
      created_at: new Date().toISOString()
    },
    {
      id: 'test_003',
      'title': 'Medium API Task',
      type: 'api',
      reward: { value: 5, type: 'token' },
      requirements: [{ action: 'fetch' }],
      created_at: new Date().toISOString()
    }
  ];

  engine.processTasks(testTasks).then(results => {
    console.log('=== Smart Priority Engine Test ===');
    console.log(JSON.stringify(engine.generateReport(results), null, 2));
  });
}
