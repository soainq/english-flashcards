FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
RUN mkdir -p /app/data
ENV PORT=4173 DATA_DIR=/app/data NODE_ENV=production
EXPOSE 4173
CMD ["node", "server.js"]
