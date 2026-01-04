FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port (default 8001, but can be overridden)
EXPOSE 8001

# Command to run the application
# We use shell form to allow variable expansion if needed, but array form is properly better.
# We will use python to run main.py directly or uvicorn. 
# main.py has uvicorn.run, let's use that but ensure it listens on 0.0.0.0
CMD ["python", "main.py"]
