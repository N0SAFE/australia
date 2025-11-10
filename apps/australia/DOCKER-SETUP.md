# Australia App Docker Setup

This document describes the Docker configuration created for the australia app.

## Files Created

### Dockerfiles

1. **`docker/Dockerfile.australia.dev`**
   - Multi-stage build for development
   - Stages: base, pruner, installer, runner
   - Port: 3010
   - Hot reloading enabled with volume mounts
   - BuildKit cache mounts for faster builds
   - Health check configured

2. **`docker/Dockerfile.australia.build-time.prod`**
   - Production build-time compilation
   - Stages: base, pruner, installer, builder, runner
   - Builds during Docker build phase (faster startup)
   - Runs as nextjs user for security
   - Includes health check with 120s start period
   - Port: 3010

3. **`docker/Dockerfile.australia.runtime.prod`**
   - Production runtime compilation
   - Stages: base, pruner, installer, runner
   - Builds during container startup (fresh builds)
   - Runs as nextjs user for security
   - Includes health check with 180s start period
   - Port: 3010

### Docker Compose Files

4. **`docker-compose.australia.yml`**
   - Standalone development configuration
   - Uses host networking for easy external API connection
   - Mounts source code for hot reloading
   - Anonymous volumes for node_modules
   - Persistent cache volumes (bun, turbo)
   - Port: 3010

5. **`docker-compose.australia.prod.yml`**
   - Standalone production configuration
   - Uses build-time compilation by default
   - Host networking for external API connection
   - Persistent cache volumes
   - Port: 3010

### Updated Files

6. **`docker-compose.yml`** (Main development stack)
   - Added `australia-dev` service
   - Configured to use Docker network with API
   - Port: 3010
   - Shares bun and turbo caches with web/doc services
   - Depends on api-dev service

7. **`docker-compose.prod.yml`** (Main production stack)
   - Added `australia-prod` service
   - Uses build-time compilation
   - Configured with proper environment variables
   - Port: 3010
   - Shares network with API and database

8. **`package.json`** (Root)
   - Added development scripts:
     - `dev:australia` - Start australia dev service
     - `dev:australia:build` - Build and start
     - `dev:australia:new` - Fresh build with new volumes
     - `dev:australia:down` - Stop service
     - `dev:australia:down:volumes` - Stop and remove volumes
     - `dev:australia:logs` - View logs
     - `dev:australia:run` - Shell into container
   - Added production scripts:
     - `prod:australia` - Start australia prod service
     - `prod:australia:build` - Build and start
     - `prod:australia:new` - Fresh production build
     - `prod:australia:down` - Stop service
     - `prod:australia:down:volumes` - Stop and remove volumes
     - `prod:australia:logs` - View logs
     - `prod:australia:run` - Shell into container
   - Added workspace script:
     - `australia` - Run commands in australia workspace

## Port Allocation

- **Australia App**: 3010
- **Web App**: 3000
- **API**: 3001/3005
- **Docs**: 3020

## Environment Variables

### Development
```bash
NEXT_PUBLIC_AUSTRALIA_APP_URL=http://localhost:3010
NEXT_PUBLIC_AUSTRALIA_APP_PORT=3010
NEXT_PUBLIC_API_URL=http://localhost:3001
API_PORT=3001
NEXT_PUBLIC_DOC_URL=http://localhost:3020
NEXT_PUBLIC_DOC_PORT=3020
AUTH_SECRET=your-auth-secret
API_ADMIN_TOKEN=your-admin-token
DEV_AUTH_KEY=dev-auth-key
BETTER_AUTH_SECRET=your-better-auth-secret
```

### Production
Same as development but with proper production values.

## Usage

### Development

#### Standalone Australia (connects to external API)
```bash
# Start australia dev service only
bun run dev:australia

# Build and start
bun run dev:australia:build

# View logs
bun run dev:australia:logs

# Stop service
bun run dev:australia:down
```

#### Full Stack (australia + API + database)
```bash
# Start full stack including australia
bun run dev

# Australia will be available at http://localhost:3010
```

#### Shell Access
```bash
# Get shell in australia container
bun run dev:australia:run
```

### Production

#### Standalone Australia
```bash
# Start australia production service
bun run prod:australia

# Build and start
bun run prod:australia:build

# Fresh build
bun run prod:australia:new
```

#### Full Stack Production
```bash
# Start full production stack
bun run prod
# or
docker compose -f docker-compose.prod.yml up
```

### Workspace Commands
```bash
# Run any script in australia workspace
bun run australia -- <script-name>

# Examples:
bun run australia -- dev
bun run australia -- build
bun run australia -- test
bun run australia -- lint
```

## Architecture

### Development Flow
1. Source code mounted via volumes for hot reloading
2. node_modules in anonymous volumes to avoid conflicts
3. Persistent cache volumes (bun, turbo) shared across services
4. Declarative routing watch mode enabled
5. Connects to API via Docker network or localhost

### Production Flow
1. **Build-time variant** (default):
   - Runs `dr:build` during Docker build
   - Runs `turbo build` during Docker build
   - Fast startup (5-10 seconds)
   - Larger image size

2. **Runtime variant**:
   - Runs `dr:build` during container startup
   - Runs `turbo build` during container startup
   - Slower startup (2-5 minutes)
   - Fresh builds on each start

## Next Steps

1. **Setup ORPC** - Configure ORPC like in web app
2. **Setup Better Auth** - Implement Better Auth with middleware stack
3. **Implement mockApi** - Create API to handle mockApi folder
4. **Test Development Flow** - Verify hot reloading works
5. **Test Production Build** - Verify production builds work
6. **Configure Environment** - Add australia variables to .env

## Troubleshooting

### Port Conflicts
If port 3010 is in use:
1. Change `NEXT_PUBLIC_AUSTRALIA_APP_PORT` in .env
2. Update docker-compose files
3. Update Dockerfile EXPOSE statements

### Build Failures
```bash
# Clear Docker cache
bun run docker:cleanup:cache

# Rebuild from scratch
bun run dev:australia:new
```

### Hot Reloading Not Working
1. Check volume mounts in docker-compose.yml
2. Verify WATCHPACK_POLLING=true is set
3. Check file permissions match USER_ID/GROUP_ID

### Memory Issues
- Development: 4GB limit set
- Production: No limit
- Adjust `mem_limit` in docker-compose files if needed
