#!/usr/bin/env bash
set -euo pipefail

echo "Validando configuracao do Nginx..."
sudo nginx -t

echo "Recarregando Nginx..."
sudo systemctl reload nginx

echo "Status do Nginx:"
sudo systemctl status nginx --no-pager
