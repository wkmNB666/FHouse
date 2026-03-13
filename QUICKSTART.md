# 快找房 v2 — 从零启动步骤（Windows）

按下面任选一种方式，**按顺序**执行即可。

---

## 方式一：本地联调（MySQL 用 Docker，后端和前端本机跑）

### 1. 启动 MySQL（Docker）

若已有一个名为 `quickhouse-mysql` 的容器，先启动：

```powershell
docker start quickhouse-mysql
```

若还没有该容器，先创建并启动：

```powershell
docker run --name quickhouse-mysql -e MYSQL_ROOT_PASSWORD=Root123! -e MYSQL_DATABASE=quickhouse -p 3306:3306 -v quickhouse_mysql_data:/var/lib/mysql -d mysql:8.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

确认容器在跑：

```powershell
docker ps
```

应能看到 `quickhouse-mysql` 状态为 `Up`，端口 `0.0.0.0:3306->3306/tcp`。

### 2. 确认后端配置

打开 `backend/QuickHouse.Api/appsettings.json`，确认连接串为：

- `Server=localhost;Port=3306;Database=quickhouse;User=root;Password=Root123!;`

（若 MySQL 密码不同，改成你的密码即可。**无需手动建库**，应用启动时会自动建库并执行迁移。）

### 3. 启动后端

若之前已经跑过后端，可能进程还在，需要先关掉再启动：

```powershell
taskkill /F /IM QuickHouse.Api.exe
```

然后：

```powershell
cd C:\Users\11565\Desktop\gemini+Cursor\workspace\backend\QuickHouse.Api
dotnet run
```

看到类似 `Now listening on: http://localhost:5200` 即表示成功。  
首次启动会自动建库、迁移、初始化账号：**admin / wkm112233**。

- API 文档：<http://localhost:5200/swagger>

### 4. 启动前端（新开一个终端）

```powershell
cd C:\Users\11565\Desktop\gemini+Cursor\workspace\frontend\frontend-app
npm install
npm run dev
```

- 访问：<http://localhost:5173/>  
- 前端会把 `/api`、`/uploads` 代理到 `http://localhost:5200`，先启后端再开前端即可联调。

---

## 方式二：全 Docker 一键启动

在项目根目录执行：

```powershell
cd C:\Users\11565\Desktop\gemini+Cursor\workspace
docker-compose up -d --build
```

- 会启动：MySQL 容器 + 后端 API 容器 + 前端 Nginx 容器。
- 访问：<http://localhost:8080/>  
- 默认账号：**admin / wkm112233**。

若出现「容器名 quickhouse-mysql 已被占用」，先删掉旧容器再执行：

```powershell
docker stop quickhouse-mysql
docker rm quickhouse-mysql
```

然后再执行 `docker-compose up -d --build`。

---

## 常用命令速查

| 操作           | 命令 |
|----------------|------|
| 停掉本机后端   | `taskkill /F /IM QuickHouse.Api.exe` |
| 启动本机后端   | `cd backend\QuickHouse.Api` 后执行 `dotnet run` |
| 启动 Docker MySQL | `docker start quickhouse-mysql` |
| 查看 MySQL 是否在跑 | `docker ps` |
| 全 Docker 启动 | 项目根目录执行 `docker-compose up -d --build` |

---

## 配置说明（可选）

- **后端** `appsettings.json`：可改 `Jwt:Key`、`Amap:Key`（高德天气）等。
- **前端** 已写死 `baseURL: '/api'`，开发时由 Vite 代理到 5200，无需改。

以上为完整从零启动步骤，按方式一或方式二执行即可。
