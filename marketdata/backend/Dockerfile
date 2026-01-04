FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for networking debugging
RUN apt-get update && apt-get install -y curl iputils-ping

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose the port
EXPOSE 9001

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001", "--reload", "--proxy-headers", "--forwarded-allow-ips", "*"]
