# Prisma、TinyAuth 与 Dokploy 集成设计

## 目标

将当前仅使用浏览器 `localStorage` 的 Vite 路书编辑器改为可部署在个人 NAS Dokploy 环境的单容器全栈应用。旅行数据使用 Prisma 管理的 SQLite 持久化，入口认证由 TinyAuth 的 Google OAuth 提供。

## 非目标

- 不部署到 Vercel。
- 不支持多人协作、公开分享链接或实时同步。
- 不迁移 TinyAuth 的认证数据库到应用数据库。
- 不保留现有演示数据作为服务器端共享数据。

## 架构

### 服务

- `app`：Node.js 服务。提供受保护的 REST API，并托管 Vite 的生产构建产物。
- `tinyauth`：独立容器，处理 Google OAuth、会话和 ForwardAuth。
- Dokploy/Traefik：将外部 HTTPS 流量路由到 `app`，并在其前执行 TinyAuth ForwardAuth。

`app` 和 `tinyauth` 处于同一私有 Docker 网络。应用仅接受由该反向代理注入的身份头；直接暴露应用容器端口不是受支持的生产配置。

### 持久化

- 应用数据库：命名卷挂载为 `/data/travel.db`。
- TinyAuth 数据库：独立命名卷挂载为 TinyAuth 的 SQLite 路径。
- Compose 重新部署或镜像更新不得删除命名卷。

## 认证与授权

1. 用户访问应用域名时，Traefik 调用 TinyAuth ForwardAuth。
2. 未认证用户跳转到 TinyAuth；TinyAuth 使用 Google OAuth 认证。
3. 部署使用两个 Dokploy 环境变量：`APP_DOMAIN`（应用域名）与 `AUTH_DOMAIN`（TinyAuth 域名）。Google OAuth 回调地址固定为 `https://${AUTH_DOMAIN}/api/oauth/callback/google`。
4. TinyAuth 用 `TINYAUTH_OAUTH_WHITELIST` 限制允许访问的 Google 邮箱。
5. 已认证请求由代理加入身份头。应用在受信任代理环境中读取邮箱，并按邮箱查询或首次创建 `User`。
6. 每次旅行资源读取、修改和删除均按当前 `User.id` 限制；其他用户的资源返回 `404`。

Google Client ID、Client Secret、OAuth 白名单和 TinyAuth 应用 URL 均只在 Dokploy 环境变量/密钥中配置，不提交到仓库。

## 数据模型

Prisma 使用 SQLite，并包含：

- `User`：唯一邮箱、显示名、导入完成时间、创建与更新时间。
- `Travel`：所属用户、标题、目的地、状态、完整路书 JSON、可编辑计划 JSON、冻结计划 JSON、记录 JSON 与时间戳。

旅行与用户保持规范化关系；现有复杂路书对象以 JSON 文本保存，避免为接入持久化而重写成熟的编辑器领域模型。前端领域类型继续作为界面模型；API 负责在其与 Prisma 记录之间转换。删除用户时，关联旅行级联删除。

## API 与前端数据流

受保护 API 位于 `/api`：

- `GET /api/me`：返回当前用户。
- `GET /api/travels`：返回当前用户旅行摘要。
- `GET /api/travels/:id`：返回旅行及完整路书。
- `POST /api/travels`：创建旅行。
- `PUT /api/travels/:id`：整体保存当前旅行。
- `DELETE /api/travels/:id`：删除旅行。
- `POST /api/import/local-archive`：一次性导入浏览器历史路书。

前端以异步 API 存储层替代 `archive-storage`。首次登录时，如浏览器仍有 `go-travel-state-v1` 且尚未完成导入，前端调用导入接口。服务端用导入标记确保此操作幂等；导入成功后保留本地副本，直到用户下一次成功加载云端数据。

## 故障行为

- 认证身份缺失或不合法：`401`。
- 请求不属于当前用户的资源：`404`。
- 输入校验失败：`400`，返回可显示错误信息。
- SQLite 不可用：`503`；前端保留未保存编辑并提示稍后重试。
- 导入失败：不写入导入完成标记，允许用户重试。

## 部署配置

仓库提供多阶段 `Dockerfile` 和生产 `docker-compose.yml`：

- 构建阶段安装依赖、生成 Prisma Client、执行前端构建。
- 运行阶段执行数据库迁移后启动 Node 服务。
- `app` 和 `tinyauth` 均配置健康检查与 `unless-stopped` 重启策略。
- Dokploy 注入 `APP_DOMAIN`、`AUTH_DOMAIN`、Google OAuth 凭证、邮箱白名单及 TinyAuth 配置。

部署前需在 Google Cloud Console 创建 Web OAuth 客户端，并配置上述精确回调地址。

## 验证

- API 测试：未认证、用户隔离、旅行 CRUD、错误格式。
- 导入测试：首次导入和重复导入均不产生重复旅行。
- 数据转换测试：现有本地档案可无损映射至数据库模型。
- 构建验证：TypeScript 检查、Vitest、Docker 镜像构建。
- 手动部署验证：Google 登录、白名单拒绝、卷重启后数据仍存在。
