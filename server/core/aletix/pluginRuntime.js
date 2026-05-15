export const PLUGIN_STATES = Object.freeze({
  LOADED: 'loaded',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  FAILED: 'failed'
});

class AletixPluginRuntime {
  constructor() {
    this.plugins = new Map();
    this.registerPlugin('core-api-executor', ['scan', 'monitor', 'sync', 'report', 'alert', 'monetize'], 'api');
    this.registerPlugin('browser-automation-hook', ['scrape'], 'browser');
    this.registerPlugin('trade-safety-executor', ['trade'], 'api', { requiresFunding: true });
  }

  registerPlugin(name, taskTypes, hookType = 'api', metadata = {}) {
    const plugin = {
      name,
      task_types: taskTypes,
      hook_type: hookType,
      state: PLUGIN_STATES.LOADED,
      metadata,
      receipts: [],
      loaded_at: new Date().toISOString()
    };
    this.plugins.set(name, plugin);
    return plugin;
  }

  activate(name) {
    const plugin = this.plugins.get(name);
    if (plugin) plugin.state = PLUGIN_STATES.ACTIVE;
    return plugin;
  }

  pluginFor(taskType) {
    return Array.from(this.plugins.values()).find((plugin) => plugin.task_types.includes(taskType) && plugin.state !== PLUGIN_STATES.SUSPENDED);
  }

  async execute(task, agent) {
    const plugin = this.pluginFor(task.type);
    if (!plugin) throw new Error(`NO_PLUGIN_FOR_${task.type}`);
    plugin.state = PLUGIN_STATES.ACTIVE;
    const receipt = {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      plugin: plugin.name,
      agent_id: agent?.id || null,
      task_id: task.id,
      task_type: task.type,
      status: 'executed',
      proof: `proof_${task.id}_${plugin.name}`,
      callback: task.callback_url || null,
      ts: new Date().toISOString()
    };
    plugin.receipts.push(receipt);
    plugin.receipts = plugin.receipts.slice(-100);
    return receipt;
  }

  getStatus() {
    return {
      plugins: Array.from(this.plugins.values()).map((plugin) => ({
        ...plugin,
        receipts: plugin.receipts.slice(-10)
      }))
    };
  }
}

export const aletixRuntime = new AletixPluginRuntime();
export default aletixRuntime;
