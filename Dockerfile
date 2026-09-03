FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY backend ./backend
COPY index.html styles.css ./
COPY src ./src
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--experimental-strip-types", "backend/server.ts"]
