# 编译阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# 如果你用的是 pnpm 或 yarn，请将 npm install 替换为对应的命令
RUN npm install
COPY . .
RUN npm run build

# Nginx 运行阶段
FROM nginx:alpine
# 将 React 打包产物拷贝到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html
# 覆盖默认的 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80