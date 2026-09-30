FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application files (excluding node_modules and .next via .dockerignore)
COPY . .

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
