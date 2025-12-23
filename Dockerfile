#Base image for nodejs
FROM node:24.1.0-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variables (optional if you're using --env-file)
# ENV PORT=3500

# Expose the port your app runs on
EXPOSE 4000

# Start the application
CMD ["npm", "start"]