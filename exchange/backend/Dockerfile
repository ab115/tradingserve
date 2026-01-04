FROM python:3.9-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for kafka)
# RUN apt-get update && apt-get install -y ...

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure src is in python path
ENV PYTHONPATH=/app

CMD ["python", "main.py"]
