# Docker Compose Quick Reference

## 🚀 Quick Start

### Start the application:
```bash
docker compose up
```

### Start in background (detached mode):
```bash
docker compose up -d
```

### Stop the application:
```bash
docker compose down
```

### Rebuild and start:
```bash
docker compose up --build
```

### View logs:
```bash
docker compose logs
```

### Follow logs (live):
```bash
docker compose logs -f
```

### View logs for specific service:
```bash
docker compose logs flare-ai-defai
```

### Restart the service:
```bash
docker compose restart
```

### Check service status:
```bash
docker compose ps
```

## 📝 Common Commands

| Command | Description |
|---------|-------------|
| `docker compose up` | Start services |
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop and remove containers + volumes |
| `docker compose ps` | List running containers |
| `docker compose logs` | View logs |
| `docker compose logs -f` | Follow logs |
| `docker compose restart` | Restart services |
| `docker compose stop` | Stop services (keep containers) |
| `docker compose start` | Start stopped services |
| `docker compose build` | Build images |
| `docker compose up --build` | Rebuild and start |

## 🔧 Configuration

- **Port**: Application runs on `http://localhost:80`
- **Environment**: Uses `.env` file automatically
- **Health Check**: Automatically checks service health
- **Logging**: Logs are limited to 10MB per file, 3 files max
- **Restart**: Service auto-restarts unless stopped manually

## 🐛 Troubleshooting

### View detailed logs:
```bash
docker compose logs --tail=100 -f
```

### Rebuild from scratch:
```bash
docker compose down
docker compose build --no-cache
docker compose up
```

### Check if service is healthy:
```bash
docker compose ps
```

### Access container shell:
```bash
docker compose exec flare-ai-defai /bin/bash
```
