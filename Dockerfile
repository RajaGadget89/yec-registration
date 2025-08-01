# Stage 1: Base for building
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM base AS build
COPY . .
RUN npm run build

# Stage 3: Production-ready image
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/package*.json ./
COPY --from=build /app/next.config.js ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
