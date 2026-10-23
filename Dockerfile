FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=8080
ENV STATIC_DIR=/app/frontend/dist
ENV DATABASE_PATH=/data/sevasetu.db
ENV STORAGE_PATH=/data/uploads
ENV BACKUP_PATH=/data/backups
COPY backend /app/backend
COPY --from=frontend /app/frontend/dist /app/frontend/dist
RUN mkdir -p /data/uploads /data/backups
EXPOSE 8080
VOLUME ["/data"]
WORKDIR /app/backend
CMD ["node", "src/index.js"]
