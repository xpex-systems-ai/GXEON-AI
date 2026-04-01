# GXEON Dashboard

Modern AI control dashboard for GXEON system built with React + Vite + Tailwind CSS.

## Features

- 🎨 Dark theme with neon accents
- 📊 Real-time system health monitoring
- 🤖 Agent management interface
- 📝 System logs viewer
- 🔄 Auto-refresh (5 second intervals)
- 📱 Responsive design
- 🚀 Connected to Railway backend

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)

## Getting Started

### 1. Install dependencies

```bash
cd dashboard
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your Railway backend URL:
```
VITE_API_URL=https://SEU-APP.up.railway.app
```

### 3. Run development server

```bash
npm run dev
```

Open http://localhost:3001

### 4. Build for production

```bash
npm run build
```

## Project Structure

```
dashboard/
├── src/
│   ├── components/        # React components
│   │   ├── StatusCard/
│   │   ├── AgentsList/
│   │   └── SystemLogs/
│   ├── pages/            # Page components
│   │   └── Dashboard/
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## API Endpoints

The dashboard connects to the following backend endpoints:

- `GET /health` - System health status
- `GET /agents` - List all agents and their status
- `GET /logs` - System logs (placeholder)

## UI Components

### StatusCard
Displays API health status with auto-refresh. Shows:
- Online/Offline status
- Uptime
- Version

### AgentsList
Lists all active agents with:
- Agent name and type
- Status indicator
- System status overview

### SystemLogs
Displays system logs with:
- Log level filtering
- Timestamp formatting
- Color-coded levels

## Customization

### Theme
Edit `tailwind.config.js` to customize:
- Primary color (neon): `#00ffcc`
- Dark backgrounds
- Animations

### Auto-refresh Interval
Change the interval in hooks (default: 5000ms):
```typescript
useAutoRefresh({
  fetchFn: apiClient.getHealth,
  interval: 5000, // milliseconds
});
```

## License

MIT
