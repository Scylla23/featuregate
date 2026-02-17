#!/bin/sh
set -e

# Cloud Run provides PORT env var (default 8080) — used by Nginx
export NGINX_PORT="${PORT:-8080}"

# Replace ${NGINX_PORT} in the nginx config template
envsubst '${NGINX_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Starting Node.js server on port 4000..."
PORT=4000 node /app/server/dist/index.js &
NODE_PID=$!

# Wait for Node.js to connect to databases before accepting traffic
sleep 2

echo "Starting Nginx on port ${NGINX_PORT}..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Trap signals for graceful shutdown
trap "kill $NODE_PID $NGINX_PID; wait $NODE_PID $NGINX_PID" SIGTERM SIGINT

# Wait for either process to exit
wait -n $NODE_PID $NGINX_PID

# If one exits, kill the other and exit with error
kill $NODE_PID $NGINX_PID 2>/dev/null || true
wait $NODE_PID $NGINX_PID 2>/dev/null || true
exit 1
