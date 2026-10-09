FROM node:20-alpine
WORKDIR /app
COPY hackathons/assemblyai-voice-agent/package.json ./
COPY hackathons/assemblyai-voice-agent/server.mjs ./
COPY hackathons/assemblyai-voice-agent/public ./public
ENV NODE_ENV=production
CMD ["node", "server.mjs"]
