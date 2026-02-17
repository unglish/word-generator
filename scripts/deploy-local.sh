#!/bin/bash
set -e
# Rebuild demo and deploy to local nginx
cd "$(git rev-parse --show-toplevel)"
npm run build
sudo cp -r dist-demo/* /var/www/html/
sudo mkdir -p /var/www/html/demo
sudo cp -r dist-demo/* /var/www/html/demo/
echo "Demo deployed to localhost ($(git rev-parse --short HEAD))"
