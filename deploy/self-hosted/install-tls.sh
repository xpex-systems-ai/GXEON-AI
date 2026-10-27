#!/bin/sh
set -eu
umask 077
mkdir -p "$PGDATA/omnix-tls"
install -m 600 /run/secrets/postgres_key "$PGDATA/omnix-tls/server.key"
install -m 644 /run/secrets/postgres_cert "$PGDATA/omnix-tls/server.crt"
install -m 644 /run/secrets/ca "$PGDATA/omnix-tls/ca.crt"
if ! grep -q '^# OMNIX TLS' "$PGDATA/postgresql.conf"; then
  cat >> "$PGDATA/postgresql.conf" <<EOF
# OMNIX TLS
ssl = on
ssl_min_protocol_version = 'TLSv1.2'
ssl_cert_file = '$PGDATA/omnix-tls/server.crt'
ssl_key_file = '$PGDATA/omnix-tls/server.key'
ssl_ca_file = '$PGDATA/omnix-tls/ca.crt'
EOF
  # Refuse cleartext network connections. Local Unix socket is owner administration only.
  { printf 'hostnossl all all all reject\n'; cat "$PGDATA/pg_hba.conf"; } > "$PGDATA/pg_hba.conf.new"
  mv "$PGDATA/pg_hba.conf.new" "$PGDATA/pg_hba.conf"
fi
