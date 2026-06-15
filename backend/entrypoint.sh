#!/bin/sh
set -e

attempt=1
max_attempts=30

while [ "$attempt" -le "$max_attempts" ]; do
  if python manage.py migrate --noinput; then
    break
  fi

  echo "Database not ready yet (attempt $attempt/$max_attempts). Retrying in 2 seconds..."
  attempt=$((attempt + 1))
  sleep 2
done

if [ "$attempt" -gt "$max_attempts" ]; then
  echo "Database migration failed after $max_attempts attempts." >&2
  exit 1
fi

exec "$@"
