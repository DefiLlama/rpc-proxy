# Use the official Node.js 22 image as the base image
FROM node:23

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

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