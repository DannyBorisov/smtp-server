FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY smtp-cert.pem smtp-key.pem ./

EXPOSE 2525

CMD ["npm", "start"]