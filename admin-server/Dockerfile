# Build from the repository root:
#   docker build -f admin-server/Dockerfile -t arunpanthi-admin .
#   docker run --env-file admin-server/.env -p 8787:8787 arunpanthi-admin
FROM node:22-alpine

WORKDIR /app
COPY . /site
COPY admin-server /app

ENV NODE_ENV=production
ENV SITE_ROOT=/site
ENV SERVE_SITE=1
ENV HOST=0.0.0.0
ENV PORT=8787

EXPOSE 8787
CMD ["node", "server.js"]
