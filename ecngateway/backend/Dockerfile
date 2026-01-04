# Use Python 3.10 to ensure compatibility with QuickFIX binaries/wheels
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for building extensions if necessary
# QuickFIX often distributes manylinux wheels, so this might largely be preventative
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create directories for logs and store if they don't depend on bind
# (QuickFIX will create them if configured, but good practice)
RUN mkdir -p log store

# Expose FIX port
EXPOSE 9898

# Run the server
CMD ["python", "main.py"]
