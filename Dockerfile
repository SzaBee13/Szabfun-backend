# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Expose the port your app runs on (e.g., 3000)
EXPOSE 3000

# Start the application
CMD ["node", "app/src/server.js"]