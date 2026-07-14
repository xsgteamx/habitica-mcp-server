FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8000 \
    MCP_PATH=/mcp

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY index.js i18n.js start-http.js ./

USER node

EXPOSE 8000

CMD ["npm", "run", "start:http"]
