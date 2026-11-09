FROM node:26-alpine
# Refresh base OS packages and force zlib onto the fixed release (ALPINE-CVE-2026-4738).
RUN apk upgrade --no-cache \
 && apk add --no-cache --upgrade 'zlib>=1.4-r0' \
 && apk info -v zlib
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
# next start binds 0.0.0.0 and honors $PORT.
CMD ["npm","start"]
