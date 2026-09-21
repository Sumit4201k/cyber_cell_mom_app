FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

ENV VITE_API_BASE_URL=http://localhost:5000/api

CMD ["npm", "run", "dev"]
