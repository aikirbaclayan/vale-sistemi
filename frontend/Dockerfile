# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Package.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Uygulama kodunu kopyala
COPY . .

# Port açık
EXPOSE 3000

# Development server başlat
CMD ["npm", "start"]
