# Руководство по развертыванию BPMN Modeler

## Локальное развертывание

### Быстрый старт

1. **Клонирование и установка**
```bash
git clone <repository-url>
cd bpmn-mvp

# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

2. **Запуск в режиме разработки**
```bash
# Терминал 1 - Backend
cd backend
npm start

# Терминал 2 - Frontend
cd frontend
npm start
```

3. **Доступ к приложению**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Демо-аккаунт: admin@example.com / admin123

## Production развертывание

### Вариант 1: Vercel + Render.com (Рекомендуемый)

#### Frontend на Vercel

1. **Подготовка проекта**
```bash
cd frontend
npm run build
```

2. **Развертывание на Vercel**
- Подключите GitHub репозиторий к Vercel
- Установите Build Command: `npm run build`
- Установите Output Directory: `build`
- Добавьте переменную окружения: `REACT_APP_API_URL=https://your-backend.render.com`

#### Backend на Render.com

1. **Создание веб-сервиса на Render**
- Подключите GitHub репозиторий
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

2. **Переменные окружения**
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
PORT=4000
```

3. **База данных**
- Render автоматически создаст SQLite файл
- Для production рекомендуется PostgreSQL

### Вариант 2: Docker развертывание

#### Dockerfile для Backend
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 4000

CMD ["npm", "start"]
```

#### Dockerfile для Frontend
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
    volumes:
      - ./data:/app/data

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:4000
```

**Запуск:**
```bash
docker-compose up -d
```

### Вариант 3: VPS/Dedicated Server

#### Подготовка сервера (Ubuntu/Debian)

1. **Установка Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Установка PM2**
```bash
sudo npm install -g pm2
```

3. **Установка Nginx**
```bash
sudo apt update
sudo apt install nginx
```

#### Развертывание Backend

1. **Клонирование и установка**
```bash
cd /var/www
sudo git clone <repository-url> bpmn-modeler
cd bpmn-modeler/backend
sudo npm install --production
```

2. **Конфигурация PM2**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bpmn-backend',
    script: 'index.js',
    cwd: '/var/www/bpmn-modeler/backend',
    env: {
      NODE_ENV: 'production',
      JWT_SECRET: 'your-super-secret-key',
      PORT: 4000
    }
  }]
}
```

3. **Запуск с PM2**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Развертывание Frontend

1. **Сборка проекта**
```bash
cd /var/www/bpmn-modeler/frontend
sudo npm install
sudo npm run build
```

2. **Конфигурация Nginx**
```nginx
# /etc/nginx/sites-available/bpmn-modeler
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/bpmn-modeler/frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Активация конфигурации**
```bash
sudo ln -s /etc/nginx/sites-available/bpmn-modeler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL сертификат (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Переменные окружения

### Backend (.env)
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
PORT=4000
DB_PATH=./data/db.sqlite
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend (.env)
```
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_VERSION=1.0.0
```

## Мониторинг и логирование

### PM2 мониторинг
```bash
pm2 monit
pm2 logs bpmn-backend
pm2 restart bpmn-backend
```

### Nginx логи
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Резервное копирование

### База данных SQLite
```bash
# Создание бэкапа
cp /var/www/bpmn-modeler/backend/db.sqlite /backups/db-$(date +%Y%m%d).sqlite

# Автоматический бэкап (crontab)
0 2 * * * cp /var/www/bpmn-modeler/backend/db.sqlite /backups/db-$(date +\%Y\%m\%d).sqlite
```

### Полный бэкап проекта
```bash
tar -czf /backups/bpmn-modeler-$(date +%Y%m%d).tar.gz /var/www/bpmn-modeler
```

## Обновление приложения

### Автоматическое обновление
```bash
#!/bin/bash
# update.sh

cd /var/www/bpmn-modeler

# Backup database
cp backend/db.sqlite backups/db-$(date +%Y%m%d).sqlite

# Pull latest changes
git pull origin main

# Update backend
cd backend
npm install --production
pm2 restart bpmn-backend

# Update frontend
cd ../frontend
npm install
npm run build

# Reload nginx
sudo systemctl reload nginx

echo "Update completed!"
```

## Безопасность

### Рекомендации
1. **Используйте HTTPS** для production
2. **Настройте firewall** (ufw/iptables)
3. **Регулярно обновляйте** зависимости
4. **Используйте сильные пароли** для JWT_SECRET
5. **Ограничьте доступ** к серверу по SSH ключам
6. **Настройте мониторинг** и алерты

### Firewall (UFW)
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Производительность

### Оптимизация Nginx
```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Browser caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### PM2 кластер
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bpmn-backend',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

## Troubleshooting

### Частые проблемы

1. **CORS ошибки**
   - Проверьте CORS_ORIGIN в backend
   - Убедитесь что frontend обращается к правильному API URL

2. **База данных не создается**
   - Проверьте права доступа к папке
   - Убедитесь что SQLite установлен

3. **JWT токены не работают**
   - Проверьте JWT_SECRET
   - Убедитесь что время на сервере корректное

4. **Nginx 502 ошибка**
   - Проверьте что backend запущен
   - Проверьте proxy_pass URL в конфигурации

### Логи для диагностики
```bash
# PM2 логи
pm2 logs bpmn-backend --lines 100

# Nginx логи
sudo tail -f /var/log/nginx/error.log

# Системные логи
journalctl -u nginx -f
```