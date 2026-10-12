FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
