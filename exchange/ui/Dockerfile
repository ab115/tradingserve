FROM nginx:alpine

# Copy pre-built assets from Host (Context is Project Root)
# We copy into a subdirectory to support subpath routing (e.g. /exchange/)
COPY exchange/ui/dist /usr/share/nginx/html/exchange/

# Create Nginx Config for SPA Routing
# Falls back to /exchange/index.html for client-side routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /exchange/index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
