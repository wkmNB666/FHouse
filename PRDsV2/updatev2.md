一、 首页模块与 UI 交互优化

Header 布局与搜索框：右上角用户信息改为显示 欢迎你, {用户名}。将“按时间查询”的 DatePicker 组件移动到“收益金额”卡片的紧右侧，并设置尺寸为 size="small"。

天气看板增强：修复当前天气 API 报错（加上 try-catch 并在失败时使用 Mock 数据兜底）。丰富天气展示信息（增加湿度、风力等），并为天气卡片加入基于 CSS (如 framer-motion 或 Antd 内置 transition) 的高级动态进入动画和 Hover 效果。

Header 时间格式化：使用 dayjs 并设置定时器每秒刷新。头部时间区域采用 Flex 布局（靠左/居中/靠右排列），对应显示为：左: HH:mm:ss，中: dddd (如星期一)，右: YYYY年。

首页数据空值降级策略：针对上架房源、审核房源等 4 个统计指标，以及下方的折线图、柱状图数据源，增加逻辑兜底：如果 昨日数据为空 或 length === 0，则 fallback 展示 今日实时数据。

二、 表单校验与业务逻辑增强 (AntD Form & RBAC)
5. 登录体验优化：模仿业界优秀方案，当密码校验失败时，使用 message.error 给出精确提示（区分“用户不存在”和“密码错误”），并配合输入框的标红或微震动动画。
6. 个人设置校验：在“用户设置”修改密码的弹窗中，增加表单自定义校验（Validator）：如果输入的 newPassword === oldPassword，则提示“新密码不能与旧密码相同”，并禁用提交按钮。
7. 用户模块 - 新增与校验：“添加用户”弹窗打开时，必须调用 form.resetFields() 清空默认的用户名和密码。用户名输入框增加异步校验（Async Validator），失去焦点时请求后端查重，若存在则在输入框右侧内联提示“该用户名已存在，不可添加”。
8. 用户模块 - 密码权限隔离：表格中密码列默认脱敏（显示 ***）。仅当 currentUser.id === row.id 或 currentUser.role === 'SuperAdmin' 时才显示明文。编辑用户时，后端和前端双重校验：若修改的密码与旧密码一致，报错阻止提交。
9. 角色模块优化：列表顶部新增搜索区（按创建时间范围 + 角色名称查询）。修复编辑角色弹窗的 Bug：角色成员 Select 下拉框回显必须是 Label（角色名称）而不是 Value（数字 ID）。新建角色增加名称防重校验。

三、 房源与签约模块深度联动
10. 图片缩略图 Bug 修复：排查房源/签约模块的 Image 组件渲染问题。检查上传组件返回的 URL 是否带有正确的后端静态目录前缀，确保使用 Antd <Image src={完整路径} /> 能够正常加载缩略图并支持预览。
11. 签约模块 - 新增联动：选择房源时，联动回显关联房源的“联系方式”。房源 Table 新增列展示：栋、单元、楼层。如果某房源已被签约 (IsContracted === true)，在下拉选择时将其 disabled 并给出 Tooltip 提示“此房源已签约”。
12. 签约模块 - 编辑限制：在编辑签约记录时，强制将 关联房源、小区名称、位置 设置为 disabled={true}。同时后端查询签约列表时，必须 .Include(c => c.House) 联表查询最新的房源信息，确保房源模块更改后，签约模块展示的总是同步的最新数据。

四、 Docker 与数据库自动化部署 (DevOps)
13. 自动化 EF Core 迁移：服务器上有 MySQL 环境但没有建库。请修改 .NET 8 项目的 Program.cs，在应用启动阶段（app.Run() 之前）注入服务作用域，自动执行 context.Database.Migrate();，确保只要容器一启动，就自动创建数据库并同步最新表结构。
14. Docker Compose 配置：检查并提供或更新 docker-compose.yml 及 Dockerfile。确保执行 docker-compose up -d --build 时，前端（Nginx打包）、后端（.NET API）能够无缝连接宿主机的 MySQL，无需人工手动跑 SQL 脚本。

五、 首页高逼格 UI 与按小时统计（后续优化）

15. 首页图标与整体高逼格 UI：天气区块标题及每项数据前增加 Ant Design 图标（CloudOutlined、ThunderboltOutlined、EnvironmentOutlined、CompassOutlined、DashboardOutlined），未来几天小卡片用天气相关图标区分；四个指标卡片分别配语义化图标（HomeOutlined 上架房源、UserAddOutlined 新增用户、FileTextOutlined 签订、DollarOutlined 收益），图表卡片标题前加 LineChartOutlined/BarChartOutlined；统一卡片样式（圆角、阴影、hover 效果），不引入新 UI 库，仅用 Antd + @ant-design/icons + CSS。

16. 折线图与柱状图按小时统计：后端新增 GET /api/stats/series-by-hour?date=yyyy-MM-dd，按 Houses(ListedTime)、Users(AddedTime)、Contracts(SignedAt) 在该日 0–23 点按小时聚合，返回 hours、houseCount、newUserCount（及可选 signedCount、revenue）；前端 dashboardService 新增 fetchStatsSeriesByHour(date)，首页图表数据源改为该接口，默认查询今日，xAxis 为 24 小时，图表标题改为「用户活跃度（按小时）」「房屋数量（按小时）」。

17. 首页最上端时间展示：在首页内容区最顶部（天气卡片之上）增加时间展示区，大号 HH:mm:ss、星期几、完整日期 YYYY年MM月DD日，使用 dayjs 每秒刷新，样式大字体、高对比、轻量背景或分割线，与下方区块层次分明。

18. 查询框移到上架房源上方：查询区（DatePicker.RangePicker + 「按时间查询统计」按钮）单独一行放在四个指标卡片之上，可带简短标题或图标（如「统计查询」）。

19. 首页总体 UI 原则：所有区块标题与关键数据配图标；层次为 顶部时间 → 查询区 → 天气 → 指标卡 → 图表；卡片阴影/边框、hover 反馈、标题字重与字号层级统一；图表 ECharts 配色与网格简洁专业。

20. 左侧「快找房」加图标：MainLayout 侧栏 Sider 顶部在「快找房」文字前增加图标（HomeOutlined 或 ApartmentOutlined），与菜单项图标风格一致，深色背景下保持可见。