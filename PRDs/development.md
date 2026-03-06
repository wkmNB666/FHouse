技术设计文档 (TDD)：快找房 (纯本地化架构)
1. 系统架构与技术选型
本系统采用前后端分离架构，所有服务、数据库及静态资源均在本地机器运行，无需依赖任何外部云服务。

前端选型 (Frontend)
核心框架：React 18 + TypeScript + Vite (Vite 提供极速的本地冷启动和热更新)。

UI 组件库：Ant Design (AntD)。这是重中之重。系统中的表格、弹窗、表单、按钮必须全部使用 AntD 提供的现成组件（如 <Table>, <Modal>, <Form>），严禁 Cursor 手写 CSS 拼凑 UI。

网络请求：axios（用于与本地 C# 后端进行数据交互）。

路由管理：react-router-dom v6。

后端选型 (Backend)
核心框架：C# .NET 8.0 Web API。提供标准的 RESTful 接口。

ORM 框架：Entity Framework Core (EF Core)。完全通过代码优先 (Code-First) 自动生成和管理数据库，不手写底层 SQL 语句。

本地数据库：SQLite。最适合纯本地化项目的轻量级关系型数据库。它是一个本地文件（如 quickhouse.db），不需要额外部署数据库服务器环境（如 MySQL/SQL Server），极其适合 Cursor 快速本地跑通项目。

接口文档：Swagger (Swashbuckle)。内置于 .NET 8，本地启动后直接提供可视化的 API 调试界面。

2. 数据库表结构设计 (Database Schema)
基于 EF Core Code-First 模式，我们需要定义以下实体模型 (Models)：
表名 (Table),字段 (Field),类型 (Type),约束 / 说明
Houses (房源表),Id,GUID / Int,主键 (Primary Key)
,CommunityName,String,必填，小区名称
,HouseAge,Int,必填，房龄
,Price,Decimal,必填，价格
,ListedTime,DateTime,必填，上架时间
Users (用户表),Id,GUID / Int,主键 (Primary Key)
,UserName,String,必填，用户名称
,Gender,String,必填，用户性别 (男/女)
,Contact,String,必填，联系方式
,AddedTime,DateTime,必填，添加时间
3. 核心开发规范 (给 Cursor 的约束)
为确保 Cursor 按照成熟的工程化标准生成代码，必须向其下达以下严格指令：

禁止手搓 UI 组件：前端所有的布局（Layout）、表格展示、分页逻辑、动态表单渲染，必须强制调用 antd 的官方 API。

统一的数据返回格式：C# 后端所有的 API 接口必须返回统一的 JSON 包装格式，例如：{ "code": 200, "message": "success", "data": [...] }。

时间处理统一化：前端时间统一使用 dayjs 库进行格式化，后端 C# 统一使用 DateTime 处理本地时间，避免时区错乱。