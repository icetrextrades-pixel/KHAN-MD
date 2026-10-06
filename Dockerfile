FROM node:lts-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
EXPOSE 9090
CMD ["npm", "start"]
