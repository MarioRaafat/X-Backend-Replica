#!/bin/bash

# Docker Build and Test Script
# This script helps you build and test your Docker image

echo "🐳 Backend Docker Build Script"
echo "=============================="

# Set variables
IMAGE_NAME="backend-api"
VERSION=${1:-"latest"}
FULL_IMAGE_NAME="$IMAGE_NAME:$VERSION"

echo "📦 Building Docker image: $FULL_IMAGE_NAME"

# Build the production Docker image
docker build -f Dockerfile.prod -t $FULL_IMAGE_NAME . 

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    
    # Show image details
    echo ""
    echo "📊 Image Details:"
    docker images | grep $IMAGE_NAME
    
    echo ""
    echo "🔍 Image Layers:"
    docker history $FULL_IMAGE_NAME --no-trunc
    
    echo ""
    echo "🏷️  Available commands:"
    echo "  Test image:     docker run --rm $FULL_IMAGE_NAME node --version"
    echo "  Run container: docker run -p 3000:3000 --env-file config/production.env $FULL_IMAGE_NAME"
    echo "  Push to registry: docker tag $FULL_IMAGE_NAME your-registry.com/$FULL_IMAGE_NAME && docker push your-registry.com/$FULL_IMAGE_NAME"
    echo "  Save to file:  docker save $FULL_IMAGE_NAME | gzip > ${IMAGE_NAME}-${VERSION}.tar.gz"
    
else
    echo "❌ Docker build failed!"
    exit 1
fi