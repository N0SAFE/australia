#!/bin/bash
# SSL Certificate Setup Script for the-gossip-club.sebille.net
# This script helps you obtain Let's Encrypt SSL certificates using certbot

set -e

echo "🔒 SSL Certificate Setup for The Gossip Club"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    apt-get install -y nginx
fi

# Create certbot webroot directory
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

# Create temporary HTTP-only Nginx configuration for certificate generation
echo "📝 Installing temporary HTTP-only Nginx configuration..."
cat > /etc/nginx/sites-available/gossip-club << 'EOF'
# Temporary HTTP-only configuration for SSL certificate generation
server {
    listen 80;
    listen [::]:80;
    server_name the-gossip-club.sebille.net;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Client max body size (for uploads - supports very large files)
    client_max_body_size 500M;
    
    # Upload optimization settings
    client_body_buffer_size 1M;
    client_body_timeout 600s;

    # Temporary proxy to app
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts (increased for very large file uploads - 10 minutes)
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        
        # Disable buffering for uploads (stream directly)
        proxy_request_buffering off;
        proxy_buffering off;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api-the-gossip-club.sebille.net;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Client max body size (for uploads - supports very large files)
    client_max_body_size 500M;
    
    # Upload optimization settings
    client_body_buffer_size 1M;
    client_body_timeout 600s;

    # Temporary proxy to API
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # CRITICAL: Forward cookies for authentication
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
        
        # CRITICAL: Forward Range header for video streaming
        proxy_set_header Range $http_range;

        # Timeouts (increased for very large file uploads - 10 minutes)
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        
        # Disable buffering for uploads/streaming (stream directly)
        proxy_request_buffering off;
        proxy_buffering off;
        
        # HTTP/2 specific: Don't buffer responses for range requests
        proxy_force_ranges on;
        proxy_ignore_headers X-Accel-Buffering;
    }
}
EOF

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Create symlink to sites-enabled
ln -sf /etc/nginx/sites-available/gossip-club /etc/nginx/sites-enabled/

# Test nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Reload nginx to apply HTTP configuration (for Let's Encrypt challenge)
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo ""
echo "📧 Enter your email address for Let's Encrypt notifications:"
read -r EMAIL

# Obtain certificates for both domains
echo ""
echo "🔐 Obtaining SSL certificate for the-gossip-club.sebille.net..."
certbot certonly --webroot -w /var/www/certbot \
    -d the-gossip-club.sebille.net \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

echo ""
echo "🔐 Obtaining SSL certificate for api-the-gossip-club.sebille.net..."
certbot certonly --webroot -w /var/www/certbot \
    -d api-the-gossip-club.sebille.net \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# Install full SSL Nginx configuration
echo ""
echo "📝 Installing full SSL Nginx configuration..."
if [ -f "nginx.conf" ]; then
    cp nginx.conf /etc/nginx/sites-available/gossip-club
    
    # Test the new configuration
    if nginx -t; then
        echo "🔄 Reloading Nginx with SSL configuration..."
        systemctl reload nginx
        echo "✅ Full SSL configuration activated"
    else
        echo "⚠️  SSL configuration test failed, keeping temporary HTTP configuration"
        echo "Please check nginx.conf and manually update later"
    fi
else
    echo "⚠️  nginx.conf not found, keeping temporary HTTP configuration"
    echo "Please create nginx.conf with SSL configuration and reload nginx manually"
fi

# Set up auto-renewal
echo "⏰ Setting up automatic certificate renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "✅ SSL certificates installed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure your DNS records point to this server:"
echo "   - the-gossip-club.sebille.net → $(curl -s ifconfig.me)"
echo "   - api-the-gossip-club.sebille.net → $(curl -s ifconfig.me)"
echo ""
echo "2. Start your Docker containers:"
echo "   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
echo ""
echo "3. Visit your sites:"
echo "   - https://the-gossip-club.sebille.net"
echo "   - https://api-the-gossip-club.sebille.net"
echo ""
echo "4. Certificates will auto-renew. Check status with:"
echo "   certbot certificates"
echo ""
