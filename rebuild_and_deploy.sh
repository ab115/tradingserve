#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}Optimized Rebuild and Deploy (Linux)...${NC}"
ROOT_PATH=$(pwd)
echo "Working Directory: $ROOT_PATH"

# Error Handler
handle_error() {
    echo -e "${RED}Error occurred in command: '$BASH_COMMAND'${NC}"
    exit 1
}
trap 'handle_error' ERR

# 1. Build Shared Libraries
echo -e "${CYAN}[0/6] Building Shared Libraries (Host)...${NC}"
cd "$ROOT_PATH/packages/ui-core"
echo -e "${CYAN}Installing/Building @tradingserver/ui-core...${NC}"
npm install
npm run build
npm run build
cd "$ROOT_PATH"

# 2. Ensure Network Exists
echo -e "${CYAN}Checking Docker Network...${NC}"
docker network inspect tradingserver_backbone_net >/dev/null 2>&1 || \
    docker network create tradingserver_backbone_net


# Function to Build and Deploy a Service
deploy_service() {
    local NAME=$1
    local COMPOSE_FILE=$2
    local UI_PATH=$3
    local COLOR=$4

    START_TIME=$(date +%s)
    echo -e "${COLOR}[$NAME] Building UI Locally...${NC}"

    # Build UI
    cd "$ROOT_PATH/$UI_PATH"
    npm install
    npm run build

    # Return to Root
    cd "$ROOT_PATH"

    # Docker Operations
    echo -e "${COLOR}[$NAME] Packaging Docker Image...${NC}"
    docker-compose -f "$COMPOSE_FILE" build

    echo -e "${COLOR}[$NAME] Deploying...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d --force-recreate

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo -e "${GREEN}[$NAME] Complete (${DURATION}s)${NC}"
}

# 2. Build and Deploy Services
# Exchange
deploy_service "EXCH" "exchange/docker-compose.prod.yml" "exchange/ui" "$GREEN"

# Market Data
deploy_service "MD" "marketdata/docker-compose.prod.yml" "marketdata/ui" "$MAGENTA"

# Market Maker
deploy_service "MM" "marketmaker/docker-compose.prod.yml" "marketmaker/frontend" "$YELLOW"

# ECN Gateway
deploy_service "ECN" "ecngateway/docker-compose.prod.yml" "ecngateway/ui" "$CYAN"

# 3. Infrastructure
echo -e "${CYAN}[Infrastructure] Restarting Portal Gateway...${NC}"
docker compose -f infrastructure/docker-compose.infra.yml up -d --force-recreate nginx-portal

echo -e "${GREEN}Deployment Complete! Access at http://localhost/${NC}"
echo -e "${GREEN}All Builds Successful!${NC}"

# 4. Start Infrastructure (Ensure everything is running)
echo -e "${CYAN}[2/6] Starting Infrastructure...${NC}"
docker compose -f infrastructure/docker-compose.infra.yml up -d

echo "Waiting 5s for Infrastructure..."
sleep 5

# 5. Start remaining services (Redundant check)
echo -e "${CYAN}[3/6] Starting ECN Gateway...${NC}"
docker compose -f ecngateway/docker-compose.prod.yml up -d

echo -e "${CYAN}[4/6] Starting Exchange...${NC}"
docker compose -f exchange/docker-compose.prod.yml up -d

echo -e "${CYAN}[5/6] Starting Market Data...${NC}"
docker compose -f marketdata/docker-compose.prod.yml up -d

echo -e "${CYAN}[6/6] Starting Market Maker...${NC}"
docker compose -f marketmaker/docker-compose.prod.yml up -d

echo -e "${GREEN}-------------------------------------------${NC}"
echo -e "${GREEN}Full Stack Deployed with Proxy Routing!${NC}"
echo -e "Access everything at: http://localhost"
echo -e "${GREEN}-------------------------------------------${NC}"
