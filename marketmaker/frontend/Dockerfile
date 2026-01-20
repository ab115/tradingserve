FROM nginx:alpine

# Copy pre-built assets from Host
COPY marketmaker/frontend/dist /usr/share/nginx/html/marketmaker/

# Create Nginx Config for SPA Routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /marketmaker/index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
