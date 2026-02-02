# Build Stage
FROM node:18-alpine as build
WORKDIR /app

# 1. Setup JS Dependencies
# Context is 'demo/', so we grab package.json from the UI folder
COPY student-demo/ui/package.json student-demo/ui/package-lock.json* ./
RUN npm install

# 2. Copy UI Source
# Copy the entire UI project into /app
COPY student-demo/ui/ .

# 3. Inject Labs Mirror
# Copy labs from 'demo/labs' to the alias target '/app/src/labs_mirror'
COPY labs/ /app/src/labs_mirror/

# 4. Build
ENV DOCKER_BUILD=true
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Fix: Path relative to context
COPY student-demo/ui/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
