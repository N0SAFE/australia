#!/bin/bash
# Automated Deployment Script for The Gossip Club
# Ubuntu/Debian compatible
# This script will install all dependencies, configure Nginx, obtain SSL certificates, and start the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_header "🚀 The Gossip Club - Automated Deployment"

# Get the actual user who ran sudo
ACTUAL_USER="${SUDO_USER:-$USER}"
ACTUAL_HOME=$(eval echo ~$ACTUAL_USER)

print_info "Running as user: $ACTUAL_USER"
print_info "Home directory: $ACTUAL_HOME"

# Project directory (current directory)
PROJECT_DIR="$(pwd)"
print_info "Project directory: $PROJECT_DIR"

# Update system packages
print_header "📦 Updating System Packages"
apt-get update -y
apt-get upgrade -y
print_success "System packages updated"

# Install essential packages
print_header "📦 Installing Essential Packages"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip
print_success "Essential packages installed"

# Install Docker if not present
print_header "🐳 Installing Docker"
if ! command -v docker &> /dev/null; then
    print_info "Docker not found. Installing Docker..."
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    usermod -aG docker "$ACTUAL_USER"
    
    print_success "Docker installed successfully"
else
    print_success "Docker already installed ($(docker --version))"
fi

# Install Docker Compose (standalone) if not present
print_header "🐳 Installing Docker Compose"
if ! command -v docker-compose &> /dev/null; then
    print_info "Docker Compose not found. Installing..."
    
    DOCKER_COMPOSE_VERSION="v2.24.0"
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose already installed ($(docker-compose --version))"
fi

# Install Bun if not present
print_header "🥟 Installing Bun"
if ! command -v bun &> /dev/null; then
    print_info "Bun not found. Installing Bun..."
    
    # Install Bun as the actual user
    su - "$ACTUAL_USER" -c "curl -fsSL https://bun.sh/install | bash"
    
    # Add Bun to PATH for root as well
    export BUN_INSTALL="$ACTUAL_HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    print_success "Bun installed successfully"
else
    print_success "Bun already installed ($(bun --version))"
fi

# Install Node.js if not present (fallback)
print_header "📦 Installing Node.js"
if ! command -v node &> /dev/null; then
    print_info "Node.js not found. Installing Node.js 20..."
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    print_success "Node.js installed successfully"
else
    print_success "Node.js already installed ($(node --version))"
fi

# Install Nginx
print_header "🌐 Installing Nginx"
if ! command -v nginx &> /dev/null; then
    print_info "Nginx not found. Installing..."
    apt-get install -y nginx
    print_success "Nginx installed successfully"
else
    print_success "Nginx already installed ($(nginx -v 2>&1))"
fi

# Install Certbot
print_header "🔒 Installing Certbot"
if ! command -v certbot &> /dev/null; then
    print_info "Certbot not found. Installing..."
    apt-get install -y certbot python3-certbot-nginx
    print_success "Certbot installed successfully"
else
    print_success "Certbot already installed ($(certbot --version))"
fi

# Configure environment file
print_header "⚙️  Configuring Environment Variables"

if [ ! -f "$PROJECT_DIR/.env.prod" ]; then
    print_warning ".env.prod not found. Creating from example..."
    
    if [ -f "$PROJECT_DIR/.env.prod.example" ]; then
        cp "$PROJECT_DIR/.env.prod.example" "$PROJECT_DIR/.env.prod"
        
        # Generate secure secrets
        print_info "Generating secure secrets..."
        DB_PASSWORD=$(openssl rand -hex 32)
        JWT_SECRET=$(openssl rand -hex 32)
        AUTH_SECRET=$(openssl rand -hex 32)
        API_ADMIN_TOKEN=$(openssl rand -hex 32)
        
        # Update .env.prod with generated secrets
        sed -i "s/your-secure-database-password-here/$DB_PASSWORD/g" "$PROJECT_DIR/.env.prod"
        sed -i "s/your-secure-jwt-secret-here/$JWT_SECRET/g" "$PROJECT_DIR/.env.prod"
        sed -i "s/your-secure-auth-secret-here/$AUTH_SECRET/g" "$PROJECT_DIR/.env.prod"
        sed -i "s/your-secure-admin-token-here/$API_ADMIN_TOKEN/g" "$PROJECT_DIR/.env.prod"
        
        # Save secrets to a file
        cat > "$PROJECT_DIR/.secrets.txt" << EOF
# Generated Secrets - Keep this file secure!
# Generated on: $(date)

DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
AUTH_SECRET=$AUTH_SECRET
API_ADMIN_TOKEN=$API_ADMIN_TOKEN
EOF
        
        chmod 600 "$PROJECT_DIR/.secrets.txt"
        chown "$ACTUAL_USER:$ACTUAL_USER" "$PROJECT_DIR/.secrets.txt"
        
        print_success "Environment file created with secure secrets"
        print_warning "Secrets saved to .secrets.txt - KEEP THIS FILE SECURE!"
    else
        print_error ".env.prod.example not found!"
        exit 1
    fi
else
    print_success ".env.prod already exists"
fi

# Set proper ownership for project files
chown -R "$ACTUAL_USER:$ACTUAL_USER" "$PROJECT_DIR"

# Install project dependencies
print_header "📦 Installing Project Dependencies"
cd "$PROJECT_DIR"

if [ -f "package.json" ]; then
    print_info "Installing dependencies with Bun..."
    su - "$ACTUAL_USER" -c "cd $PROJECT_DIR && $ACTUAL_HOME/.bun/bin/bun install"
    print_success "Dependencies installed"
else
    print_warning "No package.json found, skipping dependency installation"
fi

# Configure Nginx
print_header "🌐 Configuring Nginx"

if [ -f "$PROJECT_DIR/nginx.conf" ]; then
    print_info "Installing Nginx configuration..."
    
    # Backup existing config if present
    if [ -f "/etc/nginx/sites-available/gossip-club" ]; then
        cp /etc/nginx/sites-available/gossip-club /etc/nginx/sites-available/gossip-club.backup.$(date +%Y%m%d%H%M%S)
        print_info "Backed up existing Nginx configuration"
    fi
    
    # Copy new configuration
    cp "$PROJECT_DIR/nginx.conf" /etc/nginx/sites-available/gossip-club
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create symlink
    ln -sf /etc/nginx/sites-available/gossip-club /etc/nginx/sites-enabled/
    
    # Test configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Nginx configured successfully"
    else
        print_error "Nginx configuration test failed!"
        exit 1
    fi
else
    print_warning "nginx.conf not found, skipping Nginx configuration"
fi

# Create certbot webroot
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

# SSL Certificate setup
print_header "🔒 SSL Certificate Setup"

print_info "Do you want to obtain SSL certificates now? (y/n)"
read -r OBTAIN_SSL

if [[ "$OBTAIN_SSL" =~ ^[Yy]$ ]]; then
    print_info "Enter your email address for Let's Encrypt notifications:"
    read -r EMAIL
    
    if [ -z "$EMAIL" ]; then
        print_warning "No email provided, skipping SSL certificate setup"
        print_info "You can run ./setup-ssl.sh later to obtain certificates"
    else
        print_info "Obtaining SSL certificates..."
        
        # Obtain certificate for Australia app
        if certbot certonly --webroot -w /var/www/certbot \
            -d the-gossip-club.sebille.net \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive; then
            print_success "Certificate obtained for the-gossip-club.sebille.net"
        else
            print_warning "Failed to obtain certificate for the-gossip-club.sebille.net"
            print_info "Make sure DNS is properly configured and ports 80/443 are open"
        fi
        
        # Obtain certificate for API
        if certbot certonly --webroot -w /var/www/certbot \
            -d api-the-gossip-club.sebille.net \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive; then
            print_success "Certificate obtained for api-the-gossip-club.sebille.net"
        else
            print_warning "Failed to obtain certificate for api-the-gossip-club.sebille.net"
            print_info "Make sure DNS is properly configured and ports 80/443 are open"
        fi
        
        # Enable auto-renewal
        systemctl enable certbot.timer
        systemctl start certbot.timer
        
        # Reload Nginx with SSL
        systemctl reload nginx
        
        print_success "SSL certificates configured"
    fi
else
    print_warning "Skipping SSL certificate setup"
    print_info "You can run ./setup-ssl.sh later to obtain certificates"
fi

# Build and start Docker containers
print_header "🐳 Building and Starting Docker Containers"

print_info "Building Docker images (this may take a while)..."
cd "$PROJECT_DIR"

# Run docker-compose as the actual user (with sudo privileges for docker)
if su - "$ACTUAL_USER" -c "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"; then
    print_success "Docker containers started successfully"
else
    print_error "Failed to start Docker containers"
    print_info "Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

# Wait for services to be healthy
print_info "Waiting for services to start..."
sleep 10

# Check container status
print_header "📊 Container Status"
su - "$ACTUAL_USER" -c "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps"

# Configure firewall (if UFW is available)
print_header "🔥 Configuring Firewall"
if command -v ufw &> /dev/null; then
    print_info "Configuring UFW firewall..."
    
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    
    # Enable UFW if not already enabled
    print_info "Do you want to enable UFW firewall? (y/n)"
    read -r ENABLE_UFW
    
    if [[ "$ENABLE_UFW" =~ ^[Yy]$ ]]; then
        echo "y" | ufw enable
        print_success "Firewall configured and enabled"
    else
        print_warning "Firewall rules added but not enabled"
    fi
else
    print_warning "UFW not found, skipping firewall configuration"
fi

# Final summary
print_header "🎉 Deployment Complete!"

echo ""
print_success "The Gossip Club has been deployed successfully!"
echo ""
print_info "Important Information:"
echo ""
echo "  📁 Project Directory: $PROJECT_DIR"
echo "  🔑 Secrets File: $PROJECT_DIR/.secrets.txt (KEEP SECURE!)"
echo "  ⚙️  Environment File: $PROJECT_DIR/.env.prod"
echo ""
print_info "Services:"
echo ""
echo "  🌐 Australia App: https://the-gossip-club.sebille.net"
echo "  🔌 API: https://api-the-gossip-club.sebille.net"
echo ""
print_info "Useful Commands:"
echo ""
echo "  📊 View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  🔄 Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  🛑 Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  📈 Container status: docker-compose -f docker-compose.prod.yml ps"
echo "  🔒 SSL status: sudo certbot certificates"
echo ""
print_warning "Next Steps:"
echo ""
echo "  1. Make sure your DNS records are configured:"
echo "     - the-gossip-club.sebille.net → $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo "     - api-the-gossip-club.sebille.net → $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo ""
echo "  2. If you skipped SSL setup, run: sudo ./setup-ssl.sh"
echo ""
echo "  3. Review your secrets in: $PROJECT_DIR/.secrets.txt"
echo ""
echo "  4. Test your application:"
echo "     - Open https://the-gossip-club.sebille.net in your browser"
echo "     - Check API health: https://api-the-gossip-club.sebille.net/health"
echo ""
print_success "Happy deploying! 🚀"
echo ""
