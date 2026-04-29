#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-vexor-delivery-hub}"
APP_ROOT="${APP_ROOT:-/var/www/${APP_NAME}}"
REPO_DIR="${REPO_DIR:-${APP_ROOT}/repo}"
RELEASES_DIR="${RELEASES_DIR:-${APP_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${APP_ROOT}/current}"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}"

if [[ ! -d "${REPO_DIR}" ]]; then
  echo "Diretorio do repositorio nao encontrado: ${REPO_DIR}"
  exit 1
fi

echo "Entrando no repositorio..."
cd "${REPO_DIR}"

if [[ ! -f ".env" ]]; then
  echo "Arquivo .env nao encontrado em ${REPO_DIR}. Crie-o antes do deploy."
  exit 1
fi

echo "Atualizando codigo..."
git fetch --all --prune
git pull --ff-only

echo "Instalando dependencias..."
npm ci

echo "Validando projeto..."
npm run lint
npm run typecheck
npm run test

echo "Gerando build..."
npm run build

echo "Publicando release em ${RELEASE_DIR}..."
mkdir -p "${RELEASE_DIR}"
rsync -av --delete dist/ "${RELEASE_DIR}/"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

echo "Deploy concluido. Release atual:"
readlink -f "${CURRENT_LINK}"
