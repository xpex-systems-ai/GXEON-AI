FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY public ./public
ENV NODE_ENV=production
CMD ["node", "server.mjs"]
