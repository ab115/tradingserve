FROM python:3.9-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Install dependencies
RUN pip install fastapi "uvicorn[standard]" redis confluent-kafka requests docker

# Copy backend code
COPY . .

# Expose port
EXPOSE 8001

# Run app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
