#!/bin/bash
# Rebuild demo and deploy to local nginx
cd "$(git rev-parse --show-toplevel)/demo"
npm run build
sudo cp -r ../dist-demo/* /var/www/html/
echo "Demo deployed to localhost ($(git rev-parse --short HEAD))"
