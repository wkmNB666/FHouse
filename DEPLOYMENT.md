## 部署与运行（v2）

本文档对应 v2 文档中的部署要求；**推荐按 v1 的部署方式使用 Docker 一键启动**，也可使用 Nginx + 进程守护在裸机部署。

---

### 1) Docker 部署（与 v1 一致，推荐）

在项目根目录执行：

```bash
docker-compose up -d --build
```

- **MySQL**：自动创建并初始化数据库 `quickhouse`，数据卷 `quickhouse_mysql_data` 持久化。
- **后端**：自动执行 EF 迁移与种子数据，默认账号 `admin / wkm112233`。上传图片保存在卷 `quickhouse_uploads`。
- **前端**：Nginx 托管静态资源，并将 `/api/`、`/uploads/` 反代到后端。

访问：**http://localhost:8080**（前端），API 通过同一域名 `/api` 访问。

环境变量（可选，在 `docker-compose.yml` 的 `backend.environment` 中覆盖）：
- `ConnectionStrings__DefaultConnection`：默认已指向容器内 MySQL（`Server=mysql;...`）。
- 生产建议设置 `Jwt__Key`、`Amap__Key` 等（可通过 env 或挂载 `appsettings.Production.json`）。

**使用宿主机 MySQL（无需容器内 MySQL）**：若本机已安装 MySQL，希望后端连接宿主机数据库时，可创建 `docker-compose.override.yml`（与 `docker-compose.yml` 同目录），内容示例：

```yaml
version: '3.8'
services:
  backend:
    environment:
      ConnectionStrings__DefaultConnection: "Server=host.docker.internal;Port=3306;Database=quickhouse;User=root;Password=YOUR_PASSWORD;"
  # 不启动 mysql 服务时可注释掉 docker-compose.yml 中的 mysql 及 backend 的 depends_on
```

同时从 `docker-compose.yml` 中移除或注释 `mysql` 服务，并去掉 `backend` 的 `depends_on: mysql`。应用启动时会自动执行「建库（若不存在）+ 迁移」，无需手动执行 SQL。

---

### 2) 配置项清单（非 Docker 时）

后端配置（`backend/QuickHouse.Api/appsettings.json` 或环境变量覆盖）：
- **MySQL**：`ConnectionStrings:DefaultConnection`
  - 示例：`Server=localhost;Database=quickhouse;User=root;Password=YOUR_PASSWORD;`
- **JWT**：`Jwt:Key`、`Jwt:Issuer`、`Jwt:Audience`、`Jwt:ExpireMinutes`
  - 生产务必更换 `Jwt:Key`
- **高德天气**：`Amap:Key`、`Amap:CityAdcode`
  - 生产务必配置真实 Key

前端配置：
- `frontend/frontend-app/src/services/http.ts` 已固定 `baseURL: '/api'`

### 3) Nginx 示例配置

参考文件：`frontend/frontend-app/nginx.conf`（也可使用本仓库根目录 `nginx/quickhouse.conf`）。

核心要点：
- 静态站点：`root` 指向前端构建产物（`dist`）
- API：将 `/api/` 反代到后端端口（示例 5000）
- 图片：将 `/uploads/` 指向后端 `wwwroot/uploads/`（或与后端一致的静态目录）

### 4) 后端进程守护（Linux 裸机）

- **Systemd** 示例：`deploy/systemd/quickhouse-api.service`
- 关键点：WorkingDirectory 指向发布目录；重启策略 `Restart=always`

### 5) 本地开发（Windows）

1. 启动 MySQL（或使用 Docker 中的 MySQL 容器），**无需手动建库**：应用启动时会自动执行「建库（若不存在）+ 迁移」。
2. 后端：
   - `cd backend/QuickHouse.Api`
   - `dotnet run`
   - 首次启动会迁移建表并初始化账号：`admin / wkm112233`
3. 前端：
   - `cd frontend/frontend-app`
   - `npm run dev`

---

### 6) 上线前检查清单

部署到线上前请确认以下项，避免启动失败或安全风险。

- **MySQL**
  - 线上 MySQL 账号密码与项目一致（或已在连接串中正确配置）。
  - **无需预先建库**：应用启动时会自动执行「建库（若不存在）+ 迁移 + 种子数据」。若数据库暂不可达，后端会重试 5 次（每次间隔 4 秒），失败后退出并写入日志，便于排查。
- **必须覆盖的配置**
  - `ConnectionStrings__DefaultConnection`：指向线上 MySQL 的地址与端口（如 `Server=线上IP或域名;Port=3306;Database=quickhouse;User=root;Password=与项目一致;`）。若账户密码与项目一致，仅需把 Server/Port 改为线上 MySQL 地址。
  - `Jwt__Key`：生产环境必须使用强随机密钥（可通过环境变量或 `appsettings.Production.json` 覆盖），切勿使用默认占位值。
- **可选**
  - `Amap__Key`：高德天气 Key；不配置则前端使用 Mock 数据。
- **Docker 且使用宿主机 MySQL**：按上文「使用宿主机 MySQL」使用 `docker-compose.override.yml` 或环境变量覆盖连接串，并去掉对 `mysql` 服务的依赖。
- **CORS**：当前为同域部署（前端与 API 经同一 Nginx 反代，如 `/` 与 `/api`），不会触发跨域，无需配置 CORS。若未来前后端部署在不同域名，需在后端为生产环境配置 `WithOrigins("https://前端域名")` 等。
- **健康检查**：后端提供 `GET /api/health`，数据库可用时返回 200 + `{"status":"ok"}`，不可用时返回 503，可用于容器就绪探测或运维自检。


