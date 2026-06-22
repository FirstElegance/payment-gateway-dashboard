# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# รับค่า ARG เพื่อนำไปใช้ตอน Build
ARG VITE_PAYMENT_URL
ARG VITE_PAYMENT_TOKEN

# # ตั้งค่า ENV ให้ Node process มองเห็น
# ENV VITE_PAYMENT_URL=$VITE_PAYMENT_URL
# ENV VITE_PAYMENT_TOKEN=$VITE_PAYMENT_TOKEN

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production (ใช้ Nginx ของจริง)
FROM nginx:stable-alpine

# Copy ไฟล์ที่ build เสร็จจาก Stage 1 ไปไว้ที่ Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# (Optional) ถ้ามี nginx.conf ให้ copy ไปด้วย
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]