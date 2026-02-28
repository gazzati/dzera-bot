# Deploy with Docker Compose

## What Changed
- Deploy no longer updates code on VPS via `git pull`.
- GitHub Actions builds and pushes immutable Docker tags (`sha-<commit>`).
- Current deployed tag is stored in `.env.deploy` on the server.

## Deploy Flow
1. GitHub Actions builds Docker image.
2. Image is pushed with tags:
   - `gazzati/dzera-bot:sha-<commit>`
   - `gazzati/dzera-bot:latest`
3. Deploy job connects to VPS and writes `.env.deploy`:
   - `IMAGE_TAG=sha-<commit>`
4. Compose pulls and restarts `dzera-bot` and bundled `redis` service.

## Required VPS Layout
Use one directory per project, without cloning the app repository.

Example:
- `/home/tim/dzera-bot/docker-compose.yml`
- `/home/tim/dzera-bot/.env` (runtime env vars)
- `/home/tim/dzera-bot/.env.deploy` (current image tag)
- `/home/tim/dzera-bot/google-credentials.json` (Google Speech credentials)

Before first deploy, place required runtime files on VPS:
- `.env`
- `google-credentials.json`

The deploy workflow fails fast if either file is missing.

## Rollback
From the project directory on VPS:

```bash
echo "IMAGE_TAG=sha-<old-commit>" > .env.deploy
docker compose --env-file .env --env-file .env.deploy pull dzera-bot redis
docker compose --env-file .env --env-file .env.deploy up -d dzera-bot redis
```
