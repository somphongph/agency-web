#!/bin/sh
# Renders the nginx template with the API host taken from the environment, so one image
# can point at localhost:8080, a service name, or a real domain without a rebuild.
set -eu

TEMPLATE=/etc/agency/nginx.conf.template
CONF=/etc/nginx/conf.d/default.conf

host="${API_HOST:-http://api:8080}"
case "$host" in
  *://*) ;;
  # nginx needs an explicit scheme: `api.example.com` becomes `http://api.example.com`.
  *) host="http://$host" ;;
esac

export API_HOST="$host"
envsubst '${API_HOST}' < "$TEMPLATE" > "$CONF"

echo "nginx: proxying /api/ to $API_HOST"
