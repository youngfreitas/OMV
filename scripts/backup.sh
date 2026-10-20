#!/usr/bin/env bash
# Backup cifrado do banco OMV (pg_dump + AES-256 via openssl).
# Uso: OMV_BACKUP_SENHA=... DATABASE_URL=postgres://... ./scripts/backup.sh [diretorio]
# Restauração: openssl enc -d -aes-256-cbc -pbkdf2 -in ARQ.enc -pass env:OMV_BACKUP_SENHA | pg_restore -d "$DATABASE_URL" --clean --if-exists
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL não definida}"
: "${OMV_BACKUP_SENHA:?OMV_BACKUP_SENHA não definida}"
destino="${1:-backups}"
mkdir -p "$destino"
arq="$destino/omv-$(date +%Y%m%d-%H%M%S).dump.enc"
pg_dump --format=custom "$DATABASE_URL" | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:OMV_BACKUP_SENHA -out "$arq"
chmod 600 "$arq"
sha256sum "$arq" > "$arq.sha256"
echo "Backup gerado: $arq"
# Retenção local: mantém os 14 mais recentes.
ls -1t "$destino"/omv-*.dump.enc 2>/dev/null | tail -n +15 | while read -r f; do rm -f "$f" "$f.sha256"; done
