FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (ffmpeg for audio processing, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements and Spacy NLP engine
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download en_core_web_sm

# Copy full application code including pipeline and models
COPY . .

# Set container execution parameters
ENV PYTHONUNBUFFERED=1
ENV DEVICE=cpu
ENV COMPUTE_TYPE=int8
ENV WHISPER_THREADS=4

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
