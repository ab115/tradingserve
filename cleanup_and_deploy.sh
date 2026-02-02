#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}!!! WARNING: AGGRESSIVE CLEANUP INITIATED !!!${NC}"
echo "This will stop and remove all TradingServer containers and the backbone network."
echo "Press Ctrl+C to cancel in 3 seconds..."
sleep 3

# List of containers to remove (Explicit names from compose files)
CONTAINERS=(
    "demo_ui"
    "demo_backend"
    "fintech_haproxy"
    "fintech_redis"
    "fintech_redpanda"
    "fintech_console"
    "fintech_redis_ui"
    "fintech_portal"
    "exchange-api"
    "exchange-matching-engine"
    "marketdata-api"
    "marketdata-websocket"
    "marketmaker-backend"
    "marketmaker-ui"
    "ecngateway-api"
    "ecngateway-ui"
)

echo -e "${CYAN}Stopping and Removing Containers...${NC}"
for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "Removing $container..."
        docker rm -f "$container" || true
    fi
done

echo -e "${CYAN}Removing Network 'tradingserver_backbone_net'...${NC}"
docker network rm tradingserver_backbone_net 2>/dev/null || echo "Network already gone."

echo -e "${GREEN}Cleanup Complete. Starting Deployment...${NC}"
chmod +x ./rebuild_and_deploy.sh
./rebuild_and_deploy.sh
