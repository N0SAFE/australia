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

# Configure environment file and secrets
print_header "⚙️  Configuring Environment Variables and Secrets"

# Function to validate secrets file
validate_secrets() {
    local secrets_file="$1"
    
    if [ ! -f "$secrets_file" ]; then
        return 1
    fi
    
    # Source the secrets file
    source "$secrets_file"
    
    # Check if all required variables are set and non-empty
    if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$AUTH_SECRET" ]; then
        return 1
    fi
    
    # Validate DATABASE_URL format
    if [ -z "$DATABASE_URL" ] || ! echo "$DATABASE_URL" | grep -q "postgresql://.*:.*@.*:.*/."; then
        return 1
    fi
    
    return 0
}

# Function to generate secrets
generate_secrets() {
    print_info "Generating new secure secrets..."
    
    DB_USER="gossip_club"
    DB_NAME="gossip_club"
    DB_PASSWORD=$(openssl rand -hex 32)
    AUTH_SECRET=$(openssl rand -hex 32)
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@host.docker.internal:5432/${DB_NAME}"
    
    # Save secrets to file
    cat > "$PROJECT_DIR/.secrets.txt" << EOF
# Generated Secrets - Keep this file secure!
# Generated on: $(date)

DB_USER=$DB_USER
DB_NAME=$DB_NAME
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=$DATABASE_URL
AUTH_SECRET=$AUTH_SECRET
BETTER_AUTH_SECRET=$AUTH_SECRET
EOF
    
    chmod 600 "$PROJECT_DIR/.secrets.txt"
    chown "$ACTUAL_USER:$ACTUAL_USER" "$PROJECT_DIR/.secrets.txt"
    
    print_success "New secrets generated and saved to .secrets.txt"
}

# Check if secrets file exists and is valid
if [ -f "$PROJECT_DIR/.secrets.txt" ]; then
    print_info "Checking existing secrets file..."
    
    if validate_secrets "$PROJECT_DIR/.secrets.txt"; then
        print_info "Loading existing secrets from .secrets.txt..."
        source "$PROJECT_DIR/.secrets.txt"
        
        print_success "Loaded existing secrets"
        print_info "  User: $DB_USER"
        print_info "  Database: $DB_NAME"
        print_info "  Password: [REUSING EXISTING]"
        print_info "  Database URL: postgresql://$DB_USER:****@host.docker.internal:5432/$DB_NAME"
    else
        print_warning ".secrets.txt is malformed or incomplete. Regenerating..."
        
        # Backup the malformed file
        if [ -f "$PROJECT_DIR/.secrets.txt" ]; then
            mv "$PROJECT_DIR/.secrets.txt" "$PROJECT_DIR/.temp/.secrets/.secrets.txt.backup.$(date +%Y%m%d_%H%M%S)"
            print_info "Backed up malformed secrets to .temp/.secrets/.secrets.txt.backup"
        fi
        
        # Generate new secrets
        generate_secrets
        source "$PROJECT_DIR/.secrets.txt"
    fi
else
    print_info "No secrets file found. Generating new secrets..."
    generate_secrets
    source "$PROJECT_DIR/.secrets.txt"
fi

# Ensure .env.prod exists
if [ ! -f "$PROJECT_DIR/.env.prod" ]; then
    print_warning ".env.prod not found. Creating from example..."
    
    if [ -f "$PROJECT_DIR/.env.prod.example" ]; then
        cp "$PROJECT_DIR/.env.prod.example" "$PROJECT_DIR/.env.prod"
        print_success ".env.prod created from example"
    else
        print_error ".env.prod.example not found!"
        exit 1
    fi
fi

# Always update .env.prod with secrets from .secrets.txt (source of truth)
print_info "Updating .env.prod with secrets from .secrets.txt..."

sed -i "s|DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|g" "$PROJECT_DIR/.env.prod"
sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|g" "$PROJECT_DIR/.env.prod"
sed -i "s|BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${AUTH_SECRET}|g" "$PROJECT_DIR/.env.prod"

print_success "✓ .env.prod updated with secrets from .secrets.txt"
print_info "  Database URL: postgresql://$DB_USER:****@host.docker.internal:5432/$DB_NAME"

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

# Configure Nginx (HTTP-only first, SSL later)
print_header "🌐 Configuring Nginx"

# Create certbot webroot first
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

if [ -f "$PROJECT_DIR/nginx.conf" ]; then
    print_info "Creating temporary HTTP-only Nginx configuration..."
    
    # Backup existing config if present
    if [ -f "/etc/nginx/sites-available/gossip-club" ]; then
        cp /etc/nginx/sites-available/gossip-club /etc/nginx/sites-available/gossip-club.backup.$(date +%Y%m%d%H%M%S)
        print_info "Backed up existing Nginx configuration"
    fi
    
    # Create temporary HTTP-only configuration for certificate generation
    cat > /etc/nginx/sites-available/gossip-club << 'EOF'
# Temporary HTTP-only configuration for SSL certificate generation
server {
    listen 80;
    listen [::]:80;
    server_name app.gossip-club.sebille.net;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary proxy to app (will redirect to HTTPS after SSL setup)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.gossip-club.sebille.net;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary proxy to API (will redirect to HTTPS after SSL setup)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create symlink
    ln -sf /etc/nginx/sites-available/gossip-club /etc/nginx/sites-enabled/
    
    # Test configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Temporary HTTP-only Nginx configuration installed"
        print_info "Full SSL configuration will be installed after obtaining certificates"
    else
        print_error "Nginx configuration test failed!"
        exit 1
    fi
else
    print_warning "nginx.conf not found, skipping Nginx configuration"
fi

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
            -d app.gossip-club.sebille.net \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive; then
            print_success "Certificate obtained for app.gossip-club.sebille.net"
        else
            print_warning "Failed to obtain certificate for app.gossip-club.sebille.net"
            print_info "Make sure DNS is properly configured and ports 80/443 are open"
        fi
        
        # Obtain certificate for API
        if certbot certonly --webroot -w /var/www/certbot \
            -d api.gossip-club.sebille.net \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive; then
            print_success "Certificate obtained for api.gossip-club.sebille.net"
        else
            print_warning "Failed to obtain certificate for api.gossip-club.sebille.net"
            print_info "Make sure DNS is properly configured and ports 80/443 are open"
        fi
        
        # Enable auto-renewal
        systemctl enable certbot.timer
        systemctl start certbot.timer
        
        # Install full SSL Nginx configuration
        print_info "Installing full SSL Nginx configuration..."
        if [ -f "$PROJECT_DIR/nginx.conf" ]; then
            cp "$PROJECT_DIR/nginx.conf" /etc/nginx/sites-available/gossip-club
            
            if nginx -t; then
                systemctl reload nginx
                print_success "Full SSL Nginx configuration installed and activated"
            else
                print_warning "Full SSL configuration test failed, keeping temporary HTTP configuration"
                print_info "You may need to manually update the configuration later"
            fi
        fi
        
        print_success "SSL certificates configured"
    fi
else
    print_warning "Skipping SSL certificate setup"
    print_info "You can run ./setup-ssl.sh later to obtain certificates"
fi

# Configure PostgreSQL database and user
print_header "🐘 Configuring PostgreSQL Database and User"

if command -v psql &> /dev/null; then
    print_info "PostgreSQL found. Setting up database and user..."
    
    # Use credentials from .secrets.txt (already loaded and validated)
    print_info "Using database credentials from .secrets.txt:"
    print_info "  User: $DB_USER"
    print_info "  Database: $DB_NAME"
    print_info "  Password: [HIDDEN]"
    
    # Validate that we have the required credentials
    if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
        print_error "Database credentials are missing from .secrets.txt!"
        print_error "This should not happen. Please check the secrets generation logic."
        exit 1
    fi
    
    # Check if user exists
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';")
    
    if [ "$USER_EXISTS" = "1" ]; then
        print_info "✓ PostgreSQL user '$DB_USER' already exists"
        
        # Update password just in case it changed
        print_info "Updating user password..."
        sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null
        print_success "✓ Password updated for user '$DB_USER'"
    else
        print_info "Creating PostgreSQL user '$DB_USER'..."
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null
        print_success "✓ Created PostgreSQL user '$DB_USER'"
    fi
    
    # Grant necessary privileges to the user
    print_info "Granting privileges to user '$DB_USER'..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH CREATEDB;" > /dev/null
    print_success "✓ Granted CREATEDB privilege to '$DB_USER'"
    
    # Check if database exists
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
    
    if [ "$DB_EXISTS" = "1" ]; then
        print_info "✓ Database '$DB_NAME' already exists"
    else
        print_info "Creating database '$DB_NAME'..."
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null
        print_success "✓ Created database '$DB_NAME'"
    fi
    
    # Ensure the user owns the database
    print_info "Setting database ownership..."
    sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;" > /dev/null
    print_success "✓ Set '$DB_USER' as owner of '$DB_NAME'"
    
    # Grant all privileges on the database
    print_info "Granting database privileges..."
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null
    print_success "✓ Granted all privileges on '$DB_NAME' to '$DB_USER'"
    
    print_success "PostgreSQL database and user configuration complete!"
    print_info ""
else
    print_warning "PostgreSQL not found on host."
    print_info "If using external PostgreSQL, ensure database and user are created manually."
fi

# Configure PostgreSQL for Docker network access
print_header "🐘 Configuring PostgreSQL for Docker Network Access"

if command -v psql &> /dev/null; then
    print_info "Configuring network access for Docker containers..."
    
    # Docker containers access host PostgreSQL via the Docker bridge gateway IP
    # The gateway IP is stable (typically 172.x.0.1) and acts as the "host" from container perspective
    # We add common Docker network ranges to handle any bridge network Docker might create
    
    print_info "Configuring PostgreSQL to accept connections from Docker bridge networks..."
    print_info "Containers connect from IPs within Docker subnets (e.g., 172.18.0.2, 172.18.0.3)"
    
    # Docker Network Subnets
    # Containers get IPs from these subnets (e.g., 172.18.0.2)
    # We must allow the ENTIRE subnet, not just gateway IPs
    
    declare -a DOCKER_SUBNETS=()
    
    # Add standard Docker bridge network ranges (172.16-31.0.0/16)
    # Docker uses 172.17.0.0/16 by default and allocates custom bridges sequentially
    for i in {16..31}; do
        DOCKER_SUBNETS+=("172.${i}.0.0/16")
    done
    
    # Check for custom Docker network ranges in daemon.json
    DOCKER_CONFIG="/etc/docker/daemon.json"
    if [ -f "$DOCKER_CONFIG" ]; then
        print_info "Checking Docker daemon.json for custom network ranges..."
        
        # Extract default-address-pools if configured
        # Example: "default-address-pools": [{"base": "10.10.0.0/16", "size": 24}]
        CUSTOM_BASES=$(grep -oP '"base"\s*:\s*"\K[0-9.]+/[0-9]+' "$DOCKER_CONFIG" 2>/dev/null || echo "")
        
        if [ ! -z "$CUSTOM_BASES" ]; then
            while IFS= read -r BASE; do
                DOCKER_SUBNETS+=("$BASE")
                print_info "Found custom Docker network: $BASE"
            done <<< "$CUSTOM_BASES"
        fi
    fi
    
    print_info "Total Docker subnets to configure: ${#DOCKER_SUBNETS[@]}"
    
    # Configure postgresql.conf to listen on Docker bridge interfaces
    PG_CONF="/etc/postgresql/16/main/postgresql.conf"
    if [ -f "$PG_CONF" ]; then
        print_info "Configuring PostgreSQL to listen on all interfaces..."
        
        # Check if already configured
        if grep -q "^listen_addresses = '\*'" "$PG_CONF"; then
            print_info "✓ PostgreSQL already listening on all interfaces"
        else
            # Backup and update
            cp "$PG_CONF" "$PG_CONF.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Update listen_addresses to accept connections from all interfaces
            # This is safe because pg_hba.conf controls authentication
            sed -i "s/^#listen_addresses = .*/listen_addresses = '*'/" "$PG_CONF"
            sed -i "s/^listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
            
            print_success "✓ Updated listen_addresses to '*'"
            NEED_RESTART=true
        fi
    fi
    
    # Configure pg_hba.conf
    PG_HBA_CONF="/etc/postgresql/16/main/pg_hba.conf"
    
    if [ -f "$PG_HBA_CONF" ]; then
        print_info "Updating $PG_HBA_CONF..."
        
        for SUBNET in "${DOCKER_SUBNETS[@]}"; do
            # Check if subnet already exists in pg_hba.conf
            if grep -q "host.*all.*all.*$SUBNET" "$PG_HBA_CONF"; then
                print_info "✓ $SUBNET already configured"
            else
                print_info "Adding subnet $SUBNET to pg_hba.conf..."
                # Use md5 authentication (password-based, no SSL required)
                # This is safe because Docker networks are isolated from external access
                echo "host    all             all             $SUBNET           md5" >> "$PG_HBA_CONF"
                print_success "✓ Added $SUBNET to PostgreSQL allowed connections"
            fi
        done
        
        # Restart or reload PostgreSQL based on what changed
        if systemctl is-active --quiet postgresql; then
            if [ "${NEED_RESTART:-false}" = "true" ]; then
                print_info "Restarting PostgreSQL to apply listen_addresses change..."
                systemctl restart postgresql
                print_success "PostgreSQL restarted"
            else
                systemctl reload postgresql
                print_success "PostgreSQL configuration reloaded"
            fi
        else
            print_warning "PostgreSQL service is not running. Configuration will apply on next start."
        fi
        
        print_info ""
        print_info "📝 PostgreSQL Network Configuration:"
        print_info "   ✓ Docker bridge networks (172.16-31.0.0/16) are allowed"
        print_info "   ✓ Containers connect via: host.docker.internal → PostgreSQL"
        print_info "   ✓ Authentication: MD5 password (no SSL required for Docker networks)"
        print_info "   ✓ Docker networks are isolated from external access"
        print_info ""
        print_info "   Connection string: postgresql://user:pass@host.docker.internal:5432/db"
        print_info ""
    else
        print_warning "PostgreSQL configuration file not found at $PG_HBA_CONF"
        print_info "If using a different PostgreSQL version, manually add Docker network ranges to pg_hba.conf"
    fi
else
    print_info "PostgreSQL not found on host. Skipping network configuration."
    print_info "If using external PostgreSQL, ensure Docker network has access."
fi

# Build and start Docker containers
print_header "🐳 Building and Starting Docker Containers"

print_info "Building Docker images (this may take a while)..."
cd "$PROJECT_DIR"

# Run docker-compose as the actual user (with sudo privileges for docker)
if su - "$ACTUAL_USER" -c "cd $PROJECT_DIR && docker-compose -f docker/compose/docker-compose.prod.yml --env-file .env.prod up -d --build"; then
    print_success "Docker containers started successfully"
    print_info "PostgreSQL is accessible via Docker bridge gateway (already configured)"
else
    print_error "Failed to start Docker containers"
    print_info "Check logs with: docker-compose -f docker/compose/docker-compose.prod.yml logs"
    exit 1
fi

# Wait for services to be healthy
print_info "Waiting for services to start..."
sleep 10

# Check container status
print_header "📊 Container Status"
su - "$ACTUAL_USER" -c "cd $PROJECT_DIR && docker-compose -f docker/compose/docker-compose.prod.yml --env-file .env.prod ps"

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
echo "  🌐 Australia App: https://app.gossip-club.sebille.net"
echo "  🔌 API: https://api.gossip-club.sebille.net"
echo ""
print_info "Useful Commands:"
echo ""
echo "  📊 View logs: docker-compose -f docker/compose/docker-compose.prod.yml logs -f"
echo "  🔄 Restart services: docker-compose -f docker/compose/docker-compose.prod.yml restart"
echo "  🛑 Stop services: docker-compose -f docker/compose/docker-compose.prod.yml down"
echo "  📈 Container status: docker-compose -f docker/compose/docker-compose.prod.yml ps"
echo "  🔒 SSL status: sudo certbot certificates"
echo ""
print_warning "Next Steps:"
echo ""
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')
echo "  1. Make sure your DNS records are configured:"
echo "     - app.gossip-club.sebille.net → $SERVER_IP"
echo "     - api.gossip-club.sebille.net → $SERVER_IP"
echo ""
echo "  2. If you skipped SSL setup, run: sudo ./setup-ssl.sh"
echo ""
echo "  3. Review your secrets in: $PROJECT_DIR/.secrets.txt"
echo ""
echo "  4. Test your application:"
echo "     - Open https://app.gossip-club.sebille.net in your browser"
echo "     - Check API health: https://api.gossip-club.sebille.net/health"
echo ""
print_success "Happy deploying! 🚀"
echo ""
