# Context: Project Root
FROM node:20-alpine as base
FROM nginx:alpine

# Copy pre-built assets from Host
COPY marketdata/ui/dist /usr/share/nginx/html/marketdata/

# Create Nginx Config for SPA Routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /marketdata/index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
