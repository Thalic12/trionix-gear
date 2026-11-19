FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --chown=node:node . .
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "app.js"]
