FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY backend ./backend
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--experimental-strip-types", "backend/server.ts"]
