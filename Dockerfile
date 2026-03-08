# Use the official Python 3.9 slim image for a lightweight production build
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Set the port to 8000 (usually required by AWS AppRunner / ECS)
ENV PORT=8000

# Set working directory
WORKDIR /app

# Install system dependencies (required for pandas, C extensions, etc if needed)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies securely
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn uvicorn

# Copy the entire project code into the container
COPY . .

# Expose the application port
EXPOSE 8000

# Run the FastAPI application using Gunicorn as the production process manager
# managing Uvicorn async workers.
CMD gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
