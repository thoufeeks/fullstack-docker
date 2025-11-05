FROM node:18-alpine

WORKDIR /usr/src/app

# Install simple wait-for and dependencies
COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
