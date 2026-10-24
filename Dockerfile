# Use the official Node.js 26 image as the base image
FROM node:26

# Install pnpm (corepack is no longer bundled in Node 25+ images)
RUN npm install -g pnpm@10

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD ["pnpm", "run", "start"]