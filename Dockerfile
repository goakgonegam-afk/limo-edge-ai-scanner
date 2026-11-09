FROM node:26-alpine
RUN apk upgrade --no-cache
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
