# Use Node base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the port
EXPOSE 3001

# Start the service
CMD ["npm", "run", "dev"]
