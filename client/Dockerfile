FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASEPATH
ARG NEXT_PUBLIC_PUBLIC_API_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG API_BASEPATH

ENV NEXT_PUBLIC_API_BASEPATH=${NEXT_PUBLIC_API_BASEPATH}
ENV NEXT_PUBLIC_PUBLIC_API_KEY=${NEXT_PUBLIC_PUBLIC_API_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV API_BASEPATH=${API_BASEPATH}

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASEPATH=${NEXT_PUBLIC_API_BASEPATH}
ENV NEXT_PUBLIC_PUBLIC_API_KEY=${NEXT_PUBLIC_PUBLIC_API_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV API_BASEPATH=${API_BASEPATH}
ENV NEXT_DISABLE_FETCH_DURING_BUILD=true

COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./

COPY . .
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
CMD ["sh", "./entrypoint.sh"]
