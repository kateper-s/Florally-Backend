#!/bin/bash

set -e  # Прерывать выполнение при ошибке любой команды

echo "Stopping florally-backend container..."
docker compose stop florally-backend
docker rm florally-backend || echo "Container florally-back does not exist or already removed"
docker image rm florally-back-florally-backend || echo "florally-back-florally-backend image does not exist or already removed"
echo "Building new image..."
docker compose build --no-cache florally-backend
echo "Starting container..."
docker compose up -d florally-backend

echo "Script completed successfully"