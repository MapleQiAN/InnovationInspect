FROM node:20-alpine
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有代码
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
