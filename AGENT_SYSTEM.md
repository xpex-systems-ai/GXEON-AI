# GXEON Agent System

## Agent Loop Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT LIFECYCLE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. REGISTER                                                 │
│     POST /api/agents/register                                │
│     { id: "agent_01", name: "GXEON Agent 01" }                │
│                                                              │
│  2. HEARTBEAT (every 30s)                                    │
│     POST /api/agents/:id/heartbeat                           │
│     Keeps agent status as "active"                          │
│                                                              │
│  3. TASK LOOP                                                │
│     ┌─────────────┐                                         │
│     │ Fetch Task  │  GET /api/tasks/next                   │
│     └──────┬──────┘                                         │
│            │                                                 │
│            ▼                                                 │
│     ┌─────────────┐                                         │
│     │ Execute     │  Process task (scrape, analyze, etc)   │
│     └──────┬──────┘                                         │
│            │                                                 │
│            ▼                                                 │
│     ┌─────────────┐                                         │
│     │ Submit      │  POST /api/tasks/result                │
│     │ Result      │  { taskId, result }                    │
│     └──────┬──────┘                                         │
│            │                                                 │
│            └──────────┐                                      │
│                       │ Repeat loop                         │
│                       └──────────┐                         │
│                                  │                         │
│  4. IF NO TASK → Wait 5s → Back to step 3                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Agents
- `GET /api/agents` - List all active agents
- `POST /api/agents/register` - Register new agent
- `POST /api/agents/:id/heartbeat` - Agent heartbeat

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/next` - Get next pending task
- `POST /api/tasks/result` - Submit task result

### Stats
- `GET /api/stats` - System statistics

## Task Types

### SCRAPE_TITLE
```json
{
  "type": "SCRAPE_TITLE",
  "url": "https://example.com"
}
```

## Example Agent Implementation (Browser Extension)

```javascript
// agent.js
const AGENT_ID = 'agent_01';
const AGENT_NAME = 'GXEON Agent 01';
const API_URL = 'https://your-api.railway.app';

class GxeonAgent {
  constructor() {
    this.agentId = AGENT_ID;
    this.status = 'idle';
  }

  async register() {
    await fetch(`${API_URL}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.agentId, name: AGENT_NAME })
    });
  }

  async heartbeat() {
    await fetch(`${API_URL}/api/agents/${this.agentId}/heartbeat`, {
      method: 'POST'
    });
  }

  async fetchTask() {
    const res = await fetch(`${API_URL}/api/tasks/next`);
    const data = await res.json();
    return data.task;
  }

  async executeTask(task) {
    // Execute based on task type
    switch(task.type) {
      case 'SCRAPE_TITLE':
        return await this.scrapeTitle(task.url);
      default:
        return 'Unknown task type';
    }
  }

  async scrapeTitle(url) {
    // Browser extension API to get page title
    const response = await fetch(url);
    const text = await response.text();
    const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1] : 'No title found';
  }

  async submitResult(taskId, result) {
    await fetch(`${API_URL}/api/tasks/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, result })
    });
  }

  async run() {
    await this.register();
    
    // Heartbeat every 30s
    setInterval(() => this.heartbeat(), 30000);

    // Main task loop
    while (true) {
      const task = await this.fetchTask();
      
      if (task) {
        this.status = 'working';
        const result = await this.executeTask(task);
        await this.submitResult(task.id, result);
        this.status = 'idle';
      } else {
        // No tasks, wait 5 seconds
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
}

// Start agent
const agent = new GxeonAgent();
agent.run();
```

## Dashboard Integration

The dashboard now displays:
- **Active Agents**: Real count from `/api/agents`
- **Total Tasks**: Real count from `/api/stats`
- **Completed/Pending**: Live task statistics
- **Balance**: Real balance (currently 0, ready for blockchain integration)

All mock data removed. Stats refresh every 5 seconds.
