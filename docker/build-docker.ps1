# PowerShell Docker Build Script
param(
    [string]$Version = "latest"
)

Write-Host "🐳 Backend Docker Build Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Set variables
$ImageName = "backend-api"
$FullImageName = "$ImageName`:$Version"

Write-Host "📦 Building Docker image: $FullImageName" -ForegroundColor Yellow

# Build the production Docker image
docker build -f Dockerfile.prod -t $FullImageName .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker image built successfully!" -ForegroundColor Green
    
    # Show image details
    Write-Host ""
    Write-Host "📊 Image Details:" -ForegroundColor Blue
    docker images | Select-String $ImageName
    
    Write-Host ""
    Write-Host "🏷️  Available commands:" -ForegroundColor Magenta
    Write-Host "  Test image:      docker run --rm $FullImageName node --version"
    Write-Host "  Run container:   docker run -p 3000:3000 --env-file config/production.env $FullImageName"
    Write-Host "  Push to registry: docker tag $FullImageName your-registry.com/$FullImageName; docker push your-registry.com/$FullImageName"
    Write-Host "  Save to file:    docker save $FullImageName | gzip > $ImageName-$Version.tar.gz"
    
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Green
    Write-Host "1. Copy config/production.env.template to config/production.env"
    Write-Host "2. Fill in your production environment variables"
    Write-Host "3. Test locally: docker-compose -f docker-compose.prod.yml up"
    Write-Host "4. Share with DevOps team: Send them the image and DEPLOYMENT.md"
    
} else {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}