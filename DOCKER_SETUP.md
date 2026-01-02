# Docker Setup Guide

Bu sənəd Docker istifadə edərək projeni işə salmaq üçün təlimatlar verir.

## Tələblər

- Docker
- Docker Compose

## İşə Salma

1. Backend və Frontend üçün `.env` fayllarını təyin edin
2. Docker compose ilə containerləri işə salın:

```bash
docker-compose up -d
```

## Docker Compose Faylı

Yaratmalı olduğunuz `docker-compose.yml` faylı:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: online_exam
      POSTGRES_PASSWORD: password
      POSTGRES_DB: online_exam
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://online_exam:password@postgres:5432/online_exam
      JWT_SECRET: your-secret-key
      PORT: 3001
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

## Dockerfile-lər

### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```
