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

# Copy nginx config to sites-available
echo "📝 Installing Nginx configuration..."
cp nginx.conf /etc/nginx/sites-available/gossip-club

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

# Reload nginx to apply HTTPS configuration
echo ""
echo "🔄 Reloading Nginx with SSL configuration..."
systemctl reload nginx

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
