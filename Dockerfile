# Multi-stage hardened unprivileged Python container
FROM python:3.12-slim AS runner

# Create dedicated non-root user and group
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/false -m appuser

WORKDIR /app

# Copy application assets with proper permissions
COPY --chown=appuser:appgroup screening.py storage.py app.py ./
COPY --chown=appuser:appgroup templates/ ./templates/
COPY --chown=appuser:appgroup static/ ./static/

# Switch to unprivileged non-root user
USER 10001:10001

ENV PORT=8000
EXPOSE 8000

# Healthcheck targeting statistics API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/stats')" || exit 1

ENTRYPOINT ["python3", "app.py"]
