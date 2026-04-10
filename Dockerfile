FROM node:20-alpine
WORKDIR /app
COPY . .
COPY package*.json ./
RUN npm install
ENV NODE_ENV=production
CMD ["node", "index.js"]