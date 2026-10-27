#!/bin/sh
set -eu
if [ -s "$PGDATA/PG_VERSION" ]; then /usr/local/bin/omnix-install-tls; fi
exec /usr/local/bin/docker-entrypoint.sh "$@"
