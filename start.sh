#!/bin/sh -ex

npx prisma migrate deploy
node --max-old-space-size=2048 node_modules/.bin/react-router-serve ./build/server/index.js