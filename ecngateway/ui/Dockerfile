# Context: Project Root
FROM node:20-alpine as base
WORKDIR /app

# DEV STAGE
FROM base as dev
# Copy package files using path from root
COPY ecngateway/ui/package.json ecngateway/ui/package-lock.json* ./
FROM nginx:alpine

# Copy pre-built assets from Host
COPY ecngateway/ui/dist /usr/share/nginx/html/ecn/

# Create Nginx Config for SPA Routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /ecn/index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
