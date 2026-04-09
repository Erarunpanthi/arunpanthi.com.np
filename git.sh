#!/bin/bash

echo "Starting auto-upload to GitHub..."

git add .
git commit -m "Auto upload all files and folders"
git push origin main

echo ""
echo "Upload complete!"
echo "Created By Er.Arun panthi"
read -p "Press [Enter] key to close..."