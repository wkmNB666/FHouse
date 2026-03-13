技术设计文档 (TDD)：快找房 v2.0 (生产级商业化版)
一、 核心技术选型 (坚决不造轮子)
1. 前端生态 (Frontend)
核心框架：React 18 + TypeScript + Vite (保障极速本地编译)。

UI 组件库：Ant Design (AntD)。系统内所有的表格、弹窗、按钮、表单校验必须直接调用 AntD 的官方 API，严禁手搓 CSS 拼凑。

数据可视化：ECharts (通过 echarts-for-react 接入)。用于实现首页的高级折线图与柱状图。

网络与状态：axios 用于接口通信，利用其拦截器机制统一处理 Token 携带与全局防抖。

2. 后端生态 (Backend)
核心框架：C# .NET 8 Web API。

ORM 框架：Entity Framework Core (EF Core) 搭配 Code-First 模式。

数据库：MySQL。正式替换 v1.0 的 SQLite，系统启动时默认初始化超级管理员账号 admin，密码 wkm112233。

认证与鉴权：微软原生 JWT Bearer 认证中间件，配合基于策略的授权 (Policy-based Authorization) 实现 RBAC 角色控制。

二、 核心架构设计与工程规范
1. 安全与健壮性架构
JWT & RBAC 鉴权：废弃模拟登录，前后端对接真实的登录接口获取 JWT 令牌。前端在拦截器中全局注入 Authorization: Bearer <token>。后端根据解析出的角色 claims 拦截越权请求。

全局异常防雪崩：在 .NET 中配置 Global Exception Handler 中间件。阻断所有底层报错抛出到前端，统一返回 { "code": 500, "message": "服务器异常" } 等标准化 JSON。

结构化日志：接入 Serilog 或 NLog，配置基于文件系统（File Sink）的按天滚动日志（Rolling File），记录所有请求与异常轨迹。

严格参数校验：利用 C# 的 DataAnnotations 标签或 FluentValidation 库在 DTO (Data Transfer Object) 层进行严格校验（如：价格非负），拒绝脏数据入库。

2. 性能与交互架构
真·服务端分页：严禁前端一次性拉取全量数据。EF Core 必须配合 .Skip() 和 .Take() 组合，实现底层 SQL 级的分页查询。

请求防抖与 Loading：前端 axios 拦截器全局接管加载状态（Spinners），并在各类“确定/提交”按钮上绑定防抖（Debounce）逻辑，杜绝网络卡顿时的重复脏写。

图片流管理：房源的图片上传后保存在服务器本地指定的静态目录。数据库仅存储图片的相对路径（如 /uploads/houses/xxx.jpg）。

3. 部署与网络架构 (DevOps)
反向代理 (Nginx)：前端 axios baseURL 统一配置为相对路径 /api。打包后通过 Nginx 托管静态资源，并将 /api 前缀的请求反向代理转发至后端的 .NET 运行端口。Nginx 同时负责对外暴露图片静态目录。

进程守护：.NET 8 程序部署至 Linux 服务器后，必须由 Systemd 或 Supervisor 进行托管守护，确保意外宕机后实现秒级自动重启。

三、 数据库核心变更指南 (Database Schema v2.0)
为支持新的图片、审核流以及角色权限（RBAC），我们的 EF Core 实体类需要重点做以下改造：

【1】 Houses (房源表) —— 核心扩展字段

Images (房屋图片)：String 类型。用于存放多图上传后的 URL 路径，建议在模型中存为 JSON 序列化字符串或逗号分隔。

Location (房屋位置)：String 类型。

LandlordName (出租用户名称)：String 类型。

AuditStatus (审核状态)：Int 或 Enum (枚举) 类型。系统底层的状态机：0 为未审核，1 为已通过，2 为未通过。前端据此决定是否高亮显示“审核”按钮。

【2】 Users (用户表) —— 核心扩展字段

RoleId (角色关联 ID)：Int 或 Guid 类型。作为外键（Foreign Key），将用户与全新的 Roles 表进行强关联。新建用户时，如无特殊指定，底层默认赋予“普通业务员”对应的 ID。

【3】 Roles (角色表) —— 全新实体表

Id (主键)：Int 或 Guid 类型。

RoleName (角色名称)：String 类型。例如“最高管理员”、“管理员”、“普通业务员”。

Description (角色描述)：String 类型。用于在列表页展示。

Permissions (权限范围)：String 类型。存储该角色拥有的菜单权限，建议使用逗号分隔的字符串（如 "HouseModule,UserModule"），供 C# 鉴权中间件读取校验。

CreateTime (创建时间)：DateTime 类型。

四、 给 Cursor 的“紧箍咒” (核心开发指令)
为确保 Cursor 严格执行架构规范，投喂提示词时需带上以下硬性约束：

UI 零手写：必须使用 Ant Design 构建所有界面（包含 Layout、Table、Modal、Form 和 Upload 组件）。绝对不准手写原生 CSS 布局。

图表强依赖：首页看板必须使用 echarts-for-react，严禁使用其他小众图表库或尝试用 Canvas 徒手绘制。

网络层统一：所有的 API 请求必须通过实例化的 axios，并且必须在其拦截器中统一处理 JWT Token 和请求防抖逻辑。

后端规范分层：C# 控制器（Controller）仅负责接收请求和返回格式化 JSON，业务逻辑与 EF Core 数据操作需剥离，列表查询必须基于 Skip/Take 实现分页。