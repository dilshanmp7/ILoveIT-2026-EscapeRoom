FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/data ./data 2>/dev/null || true

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

