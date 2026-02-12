#!/bin/bash
#
# Docker & Docker Compose Installation Script
# This script manages the installation and cleanup of the Docker environment on a Linux server.
# It deploys a comprehensive DevOps, Data, and Monitoring stack with a central Dashboard.
#
# Usage: ./install_linux_stack.sh {install|cleanup}
#

set -e

# Configuration
INSTALL_DIR="/opt/scalegrad"
DOCKER_GPG_KEY="/usr/share/keyrings/docker-archive-keyring.gpg"

# Helper function to print colored messages
info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

warn() {
    echo -e "\033[1;33m[WARN]\033[0m $1"
}

error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
    exit 1
}

verify_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Please run as root (use sudo)"
    fi
}

install_docker() {
    info "Checking for existing Docker installation..."
    
    FOLDER_MISSING=0
    # Check if docker binary exists
    if command -v docker &> /dev/null; then
        info "Docker is already installed."
    else
        FOLDER_MISSING=1
    fi
    
    # Check if docker-compose-plugin is available (command "docker compose")
    if docker compose version &> /dev/null; then
        info "Docker Compose is already installed."
    else
        FOLDER_MISSING=1
    fi

    if [ $FOLDER_MISSING -eq 0 ]; then
        info "Skipping Docker installation steps."
        return
    fi

    info "Preparing system for Docker installation..."
    apt-get update
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    info "Adding Docker's official GPG key..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o "$DOCKER_GPG_KEY" --yes

    info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=$DOCKER_GPG_KEY] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    info "Installing Docker Engine and Docker Compose..."
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    info "Docker installed successfully."
}

configure_permissions() {
    info "Configuring permissions..."
    
    if ! getent group docker > /dev/null; then
        groupadd docker
    fi

    if [ ! -d "$INSTALL_DIR" ]; then
        mkdir -p "$INSTALL_DIR"
        info "Created shared directory: $INSTALL_DIR"
    fi

    chown -R root:docker "$INSTALL_DIR"
    chmod -R 2775 "$INSTALL_DIR"
    
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
        info "Ensured user '$SUDO_USER' is in the docker group."
    fi
}

generate_dashboard() {
    info "Generating Dashboard UI..."
    mkdir -p "$INSTALL_DIR/dashboard"

    # Generate System Info JSON
    DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
    COMPOSE_VER=$(docker compose version | awk '{print $4}')
    DATE=$(date)
    
    cat <<EOF > "$INSTALL_DIR/dashboard/system_info.json"
{
  "docker_version": "$DOCKER_VER",
  "compose_version": "$COMPOSE_VER",
  "install_date": "$DATE"
}
EOF

    # Generate Dashboard HTML
    cat <<EOF > "$INSTALL_DIR/dashboard/index.html"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ScaleGrad Server Dashboard</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
            --success: #22c55e;
            --danger: #ef4444;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            margin: 0;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            margin-bottom: 3rem;
            border-bottom: 1px solid #334155;
            padding-bottom: 1rem;
        }
        h1 { margin: 0; font-size: 2rem; }
        .meta { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem; }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .card {
            background-color: var(--card-bg);
            border-radius: 0.75rem;
            padding: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #334155;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            border-color: var(--accent);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        .card-title { font-size: 1.25rem; font-weight: 600; margin: 0; }
        .status-dot {
            height: 10px;
            width: 10px;
            border-radius: 50%;
            background-color: #64748b;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
        }
        .status-dot.up { background-color: var(--success); box-shadow: 0 0 8px var(--success); }
        .status-dot.down { background-color: var(--danger); }
        
        .card-desc { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; flex-grow: 1; }
        
        .btn {
            display: inline-block;
            background-color: var(--accent);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            text-decoration: none;
            font-weight: 500;
            text-align: center;
            transition: background-color 0.2s;
        }
        .btn:hover { background-color: #2563eb; }
        .btn.disabled { background-color: #64748b; pointer-events: none; opacity: 0.7; }
        
        .system-info {
            background-color: #1e293b;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 2rem;
            font-family: monospace;
            color: var(--text-secondary);
            border: 1px solid #334155;
        }
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--bg-color);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .login-box {
            background-color: var(--card-bg);
            padding: 2rem;
            border-radius: 0.75rem;
            border: 1px solid #334155;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .login-input {
            width: 100%;
            padding: 0.75rem;
            margin: 1rem 0;
            background-color: #0f172a;
            border: 1px solid #334155;
            color: white;
            border-radius: 0.375rem;
            box-sizing: border-box;
        }
        .login-btn {
            background-color: var(--accent);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.375rem;
            cursor: pointer;
            width: 100%;
            font-weight: 600;
        }
        .login-btn:hover { background-color: #2563eb; }
        .hidden { display: none !important; }
        .error { color: var(--danger); margin-top: 0.5rem; font-size: 0.9rem; display: none; }
    </style>
</head>
<body>
    <div id="loginOverlay" class="overlay">
        <div class="login-box">
            <h2>ScaleGrad Login</h2>
            <div style="color:#94a3b8; margin-bottom:1rem;">Enter admin password to access dashboard</div>
            <input type="password" id="passwordInput" class="login-input" placeholder="Password">
            <button onclick="checkLogin()" class="login-btn">Login</button>
            <div id="loginError" class="error">Invalid Password</div>
        </div>
    </div>

    <div class="container">
        <header>
            <h1>ScaleGrad Server Dashboard</h1>
            <div class="meta">Centralized Management Hub</div>
        </header>

        <div class="system-info" id="sysInfo">
            Loading system details...
        </div>

        <div class="grid" id="serviceGrid">
            <!-- Cards injected by JS -->
        </div>
    </div>

    <script>
        const services = [
            { id: 'jenkins', name: 'Jenkins', port: 8080, desc: 'Automation Server (CI/CD)' },
            { id: 'grafana', name: 'Grafana', port: 3000, desc: 'Metrics Visualization & Dashboards' },
            { id: 'prometheus', name: 'Prometheus', port: 9090, desc: 'Time Series Database' },
            { id: 'node_exporter', name: 'Node Exporter', port: 9100, desc: 'Host Hardware & OS Metrics' },
            { id: 'cadvisor', name: 'cAdvisor', port: 8081, desc: 'Container Resource Usage' },
            { id: 'redis_ui', name: 'Redis Commander', port: 8082, desc: 'Redis Web Management Interface' },
            { id: 'redpanda_ui', name: 'Redpanda Console', port: 8083, desc: 'Kafka/Redpanda Topic Browser' },
            { id: 'python', name: 'Python Utility', port: null, desc: 'Headless Container (Exec via CLI)' },
            { id: 'ladder', name: 'Engineering Ladder', url: 'http://103.76.228.222:8088/edulab.html', desc: 'ScaleGrad Engineering Ladder' },
            { id: 'pod', name: 'Trading Tech POD', url: 'http://103.76.228.222:8088/', desc: 'ScaleGrad Equity Trading Technology POD' }
        ];

        // Auth Logic
        const SESSION_KEY = 'scalegrad_auth';
        
        function checkLogin() {
            const input = document.getElementById('passwordInput');
            const overlay = document.getElementById('loginOverlay');
            const error = document.getElementById('loginError');
            
            if (input.value === 'admin@mruh') {
                sessionStorage.setItem(SESSION_KEY, 'true');
                overlay.classList.add('hidden');
                initDashboard();
            } else {
                error.style.display = 'block';
                input.value = '';
            }
        }

        // Check if already logged in on load
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
            document.getElementById('loginOverlay').classList.add('hidden');
            initDashboard();
        }

        const host = window.location.hostname;

        async function createCards() {
            const grid = document.getElementById('serviceGrid');
            
            services.forEach(svc => {
                const card = document.createElement('div');
                card.className = 'card';
                
                let targetUrl = '';
                if (svc.url) {
                    targetUrl = svc.url;
                } else if (svc.port) {
                    targetUrl = \`http://\${host}:\${svc.port}\`;
                }

                let btnHtml = '';
                if (targetUrl) {
                    btnHtml = \`<a href="\${targetUrl}" target="_blank" class="btn">Open Console</a>\`;
                } else {
                    btnHtml = \`<span class="btn disabled">CLI Only</span>\`;
                }

                card.innerHTML = \`
                    <div class="card-header">
                        <h3 class="card-title">\${svc.name}</h3>
                        \${targetUrl ? \`<div class="status-dot" id="status-\${svc.id}"></div>\` : ''}
                    </div>
                    <div class="card-desc">\${svc.desc} \${svc.port ? \`(Port \${svc.port})\` : ''}</div>
                    \${btnHtml}
                \`;
                grid.appendChild(card);
                
                if (targetUrl) checkHealth(svc.id, targetUrl);
            });
        }

        async function checkHealth(id, url) {
            const dot = document.getElementById(\`status-\${id}\`);
            // We expect opaque responses (mode: 'no-cors') because most services won't support CORS.
            // A successful fetch (even rigid) means the port is open and listening.
            // A network error usually means connection refused (Down).
            try {
                await fetch(url, { mode: 'no-cors', cache: 'no-cache' });
                dot.classList.add('up');
                dot.title = "Service Reachable";
            } catch (e) {
                dot.classList.add('down');
                dot.title = "Connection Refused / Down";
            }
        }

        async function loadSysInfo() {
            try {
                const res = await fetch('system_info.json');
                const data = await res.json();
                document.getElementById('sysInfo').innerHTML = 
                    \`Docker v\${data.docker_version} | Compose v\${data.compose_version} | Installed: \${data.install_date}\`;
            } catch (e) {
                document.getElementById('sysInfo').innerText = "System info unavailable.";
            }
        }

        function initDashboard() {
            createCards();
            loadSysInfo();
        }

        // Support Enter key on login
        document.getElementById('passwordInput').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                checkLogin();
            }
        });

    </script>
</body>
</html>
EOF

    # Fix permissions
    chown -R root:docker "$INSTALL_DIR/dashboard"
    chmod -R 775 "$INSTALL_DIR/dashboard"
}

generate_compose_file() {
    info "Generating docker-compose.yml in $INSTALL_DIR..."
    
    cat <<EOF > "$INSTALL_DIR/docker-compose.yml"
version: '3.8'

services:
  # --- Main Dashboard ---
  nginx:
    image: nginx:alpine
    container_name: scalegrad_dashboard
    ports:
      - "80:80"
    volumes:
      - ./dashboard:/usr/share/nginx/html:ro
    restart: unless-stopped
    networks:
      - scalegrad_net

  # --- DevOps Tools ---
  jenkins:
    image: jenkins/jenkins:lts-jdk11
    container_name: scalegrad_jenkins
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
    restart: unless-stopped
    networks:
      - scalegrad_net

  python_env:
    image: python:3.9-slim
    container_name: scalegrad_python
    # Utility container: keep alive indefinitely
    entrypoint: ["tail", "-f", "/dev/null"]
    volumes:
      - .:/workspace
    restart: unless-stopped
    networks:
      - scalegrad_net

  # --- Monitoring Stack ---
  prometheus:
    image: prom/prometheus:latest
    container_name: scalegrad_prometheus
    ports:
      - "9090:9090"
    volumes:
      - prometheus_data:/prometheus
    restart: unless-stopped
    networks:
      - scalegrad_net

  grafana:
    image: grafana/grafana:latest
    container_name: scalegrad_grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_storage:/var/lib/grafana
    restart: unless-stopped
    networks:
      - scalegrad_net

  node_exporter:
    image: prom/node-exporter:latest
    container_name: scalegrad_node_exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
    restart: unless-stopped
    networks:
      - scalegrad_net

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: scalegrad_cadvisor
    ports:
      - "8081:8080"
      # Maps host 8081 to container 8080 (cAdvisor UI)
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    restart: unless-stopped
    networks:
      - scalegrad_net

  # --- Data Stores ---
  redis:
    image: redis:alpine
    container_name: scalegrad_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - scalegrad_net

  redis_commander:
    image: rediscommander/redis-commander:latest
    container_name: scalegrad_redis_commander
    ports:
      - "8082:8081"
    environment:
      - REDIS_HOSTS=local:redis:6379
    restart: unless-stopped
    depends_on:
      - redis
    networks:
      - scalegrad_net

  redpanda:
    image: redpandadata/redpanda:latest
    container_name: scalegrad_redpanda
    command:
      - redpanda
      - start
      - --mode
      - dev-container
    ports:
      - "9092:9092"
      - "9644:9644"
    volumes:
      - redpanda_data:/var/lib/redpanda/data
    restart: unless-stopped
    networks:
      - scalegrad_net

  redpanda_console:
    image: redpandadata/console:latest
    container_name: scalegrad_redpanda_console
    ports:
      - "8083:8080"
    environment:
      - KAFKA_BROKERS=redpanda:9092
    restart: unless-stopped
    depends_on:
      - redpanda
    networks:
      - scalegrad_net

networks:
  scalegrad_net:
    driver: bridge

volumes:
  jenkins_home:
  prometheus_data:
  grafana_storage:
  redis_data:
  redpanda_data:
EOF
    
    chown root:docker "$INSTALL_DIR/docker-compose.yml"
    chmod 664 "$INSTALL_DIR/docker-compose.yml"
}

deploy_stack() {
    info "Deploying container stack..."
    cd "$INSTALL_DIR"
    
    if ! docker info > /dev/null 2>&1; then
       warn "Unable to contact Docker Daemon. Ensure service is running (systemctl start docker)."
    fi

    docker compose up -d
    info "Containers deployed."
}

verify_installation() {
    info "Verifying installation..."
    
    echo "--------------------------------------------------------"
    echo "Docker Version:"
    docker --version
    echo "Docker Compose Version:"
    docker compose version
    echo "--------------------------------------------------------"
    
    cd "$INSTALL_DIR"
    echo "Current Stack Status ($INSTALL_DIR/docker-compose.yml):"
    docker compose ps
    
    info "Verification Check:"
    MISSING=0
    CONTAINERS=(
        "scalegrad_dashboard"
        "scalegrad_jenkins"
        "scalegrad_prometheus"
        "scalegrad_grafana"
        "scalegrad_python"
        "scalegrad_node_exporter"
        "scalegrad_cadvisor"
        "scalegrad_redis"
        "scalegrad_redis_commander"
        "scalegrad_redpanda"
        "scalegrad_redpanda_console"
    )

    for container in "${CONTAINERS[@]}"; do
        if [ "$(docker inspect -f '{{.State.Running}}' $container 2>/dev/null)" = "true" ]; then
            echo -e "  $container: \033[1;32mRUNNING\033[0m"
        else
            echo -e "  $container: \033[1;31mNOT RUNNING\033[0m"
            MISSING=1
        fi
    done
    
    if [ $MISSING -eq 0 ]; then
        info "All services are up and running!"
        echo "================================================================"
        echo "   DASHBOARD ACCESS: http://<your-server-ip>/"
        echo "================================================================"
        echo "Individual Links (also available via dashboard):"
        echo "  - Jenkins:           http://<host-ip>:8080"
        echo "  - Grafana:           http://<host-ip>:3000"
        echo "  - Redis UI:          http://<host-ip>:8082"
        echo "  - Redpanda UI:       http://<host-ip>:8083"
    else
        warn "Some services did not start correctly. Check logs with: docker compose logs <service_name>"
    fi
}

install_stack() {
    verify_root
    install_docker
    configure_permissions
    generate_dashboard  # <-- Generates UI assets
    generate_compose_file
    deploy_stack
    verify_installation
}

cleanup_stack() {
    verify_root
    
    warn "This will remove Docker containers, volumes, matching Software, and data in '$INSTALL_DIR'."
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Cleanup aborted."
        exit 0
    fi

    if [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
        info "Stopping stack via Docker Compose..."
        cd "$INSTALL_DIR"
        docker compose down -v
    fi

    info "Stopping any remaining containers..."
    if command -v docker &> /dev/null; then
        # Failsafe stop
        docker ps -aq | xargs -r docker stop || true
        docker ps -aq | xargs -r docker rm || true
    fi

    info "Uninstalling Docker packages..."
    apt-get purge -y docker-ce docker-ce-cli containerd.io docker-compose-plugin || true
    apt-get autoremove -y || true

    info "Removing Docker configuration..."
    rm -rf /var/lib/docker
    rm -f /etc/apt/sources.list.d/docker.list
    rm -f "$DOCKER_GPG_KEY"

    if [ -d "$INSTALL_DIR" ]; then
        warn "Removing shared directory: $INSTALL_DIR"
        rm -rf "$INSTALL_DIR"
    fi

    info "Cleanup Complete."
}

# Main execution
case "$1" in
    install)
        install_stack
        ;;
    cleanup)
        cleanup_stack
        ;;
    *)
        echo "Usage: $0 {install|cleanup}"
        exit 1
        ;;
esac
