# Docker Deployment Guide

## Overview
This is a NestJS backend application with PostgreSQL database and Redis cache. The application includes a multi-stage signup flow with email verification and JWT authentication.

## Prerequisites
- Docker Engine 20.10+
- Docker Compose v2.0+
- Minimum 2GB RAM
- 10GB available disk space

## Quick Start

### 1. Build the Docker Image
```bash
# Build production image
docker build -f Dockerfile.prod -t backend-api:latest .

# Or build with version tag
docker build -f Dockerfile.prod -t backend-api:v1.0.0 .
```

### 2. Environment Setup
```bash
# Copy the production environment template
cp config/production.env.template config/production.env

# Edit the production.env file with actual values
# Make sure to set secure passwords and secrets!
```

### 3. Run with Docker Compose
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
```

## Environment Variables

### Required Variables
- `NODE_ENV=production`
- `PORT=3000`
- `POSTGRES_HOST`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`

### Optional Variables
- OAuth credentials (Google, Facebook, GitHub)
- Email service credentials
- Frontend/Backend URLs

## Security Considerations

### 1. Secrets Management
- Use Docker secrets or external secret management
- Never commit production.env to version control
- Rotate JWT secrets regularly

### 2. Network Security
- Use custom Docker networks (included in docker-compose.prod.yml)
- Configure firewall rules
- Use HTTPS in production

### 3. Database Security
- Use strong passwords
- Enable SSL/TLS for database connections
- Regular backups

## Production Deployment

### Option 1: Docker Compose (Simple)
```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Update
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Option 2: Docker Swarm (Scalable)
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml backend-stack

# Scale API service
docker service scale backend-stack_api=3
```

### Option 3: Kubernetes (Enterprise)
- Use the provided Dockerfile.prod
- Create Kubernetes manifests for deployment
- Consider using Helm charts

## Image Management

### Building for Different Architectures
```bash
# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.prod -t backend-api:latest .
```

### Pushing to Registry
```bash
# Tag for registry
docker tag backend-api:latest your-registry.com/backend-api:latest
docker tag backend-api:latest your-registry.com/backend-api:v1.0.0

# Push to registry
docker push your-registry.com/backend-api:latest
docker push your-registry.com/backend-api:v1.0.0
```

## Monitoring and Logging

### Health Checks
- Built-in health check endpoint (included in Dockerfile.prod)
- Docker health checks configured
- Monitor with: `docker-compose -f docker-compose.prod.yml ps`

### Logs
```bash
# View API logs
docker-compose -f docker-compose.prod.yml logs -f api

# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# Export logs
docker-compose -f docker-compose.prod.yml logs > application.log
```

### Metrics
- Consider adding Prometheus metrics
- Use monitoring tools like DataDog, New Relic, or Grafana

## Backup and Recovery

### Database Backup
```bash
# Backup PostgreSQL
docker exec backend-postgres-prod pg_dump -U username database_name > backup.sql

# Restore PostgreSQL
docker exec -i backend-postgres-prod psql -U username database_name < backup.sql
```

### Redis Backup
```bash
# Redis data is persisted in volume: redis_data
# Backup volume or use Redis BGSAVE command
docker exec backend-redis-prod redis-cli BGSAVE
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check environment variables
   - Verify database connectivity
   - Check logs: `docker logs container-name`

2. **Database connection errors**
   - Verify PostgreSQL is running
   - Check network connectivity
   - Validate credentials

3. **Redis connection errors**
   - Verify Redis is running
   - Check Redis password (if set)
   - Validate network configuration

### Debugging
```bash
# Access container shell
docker exec -it backend-api-prod sh

# Check container resources
docker stats

# Inspect container
docker inspect backend-api-prod
```

## Performance Tuning

### Container Resources
```yaml
# Add to docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

### Database Performance
- Configure PostgreSQL connection pooling
- Monitor database query performance
- Consider read replicas for scaling

## API Endpoints

The application provides these main endpoints:
- `POST /auth/signup/step1` - Initial signup
- `POST /auth/signup/step2` - Email verification
- `POST /auth/signup/step3` - Complete registration
- `POST /auth/login` - User login
- `GET /health` - Health check

For complete API documentation, access `/api` endpoint when the application is running.

## Support

### Logs Location
- Application logs: Docker container logs
- Database logs: PostgreSQL container logs
- Redis logs: Redis container logs

### Configuration Files
- `config/production.env` - Environment variables
- `docker-compose.prod.yml` - Production compose file
- `Dockerfile.prod` - Production Dockerfile

### Contact
For technical support, contact the development team with:
- Container logs
- Environment configuration (without secrets)
- Error messages and stack traces