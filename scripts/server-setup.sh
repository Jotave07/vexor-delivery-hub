#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  echo "Execute este script com um usuario com sudo, nao diretamente como root."
  exit 1
fi

echo "Atualizando pacotes do sistema..."
sudo apt update
sudo apt upgrade -y

echo "Instalando dependencias basicas..."
sudo apt install -y curl git unzip ca-certificates gnupg lsb-release ufw nginx certbot python3-certbot-nginx

echo "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "Instalando PM2 opcionalmente..."
sudo npm install -g pm2

echo "Configurando firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "Habilitando Nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

echo "Ambiente base configurado."
node -v
npm -v
pm2 -v
sudo systemctl status nginx --no-pager
