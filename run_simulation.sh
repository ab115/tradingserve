#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}Starting Simulation Setup...${NC}"

# 1. Run Dataloader (Inside running Market Maker container)
echo -e "${CYAN}[1/2] Loading Initial Market Data...${NC}"
docker-compose -f marketmaker/docker-compose.prod.yml exec marketmaker-backend python dataloader.py

# 2. Run Realtime Simulation (Transient container)
echo -e "${CYAN}[2/2] Running Realtime Trading Simulation...${NC}"
# Note: Using ecn-fix-server service as the base for the simulation client
#docker-compose -f ecngateway/docker-compose.prod.yml run --rm --name ecn-tester \
#    -v "./ecngateway/tests:/tests" \
#    -w /tests \
#    ecn-fix-server \
#    python test_realtime_simulation.py
###################################################
#cd ecngateway
#docker-compose run --rm --name ecn-tester -v "$($PWD)/tests:/tests" -w /tests ecn-fix-server python test_realtime_simulation.py
docker-compose -f ecngateway/docker-compose.prod.yml run --rm --name ecn-tester \
    -v "$(pwd)/ecngateway/tests:/tests" \
    -w /tests \
    ecn-fix-server \
    python test_realtime_simulation.py

echo -e "${GREEN}Simulation Complete!${NC}"
