#!/bin/bash
set -euo pipefail
git pull origin main
npm install
npm run dev
