# Go Travel

Go Travel 是一个受 Google 登录保护的中文自由行路书编辑器。它可保存不限数量的旅行；页面中的时间、地点、路线、预算和记录均为合成演示数据，不能用于实际出行或导航。

## 本地启动

在项目目录运行：

```bash
bun install
bun run dev
```

然后访问终端显示的本地地址。项目使用 Leaflet 与 OpenStreetMap 瓦片显示带坐标的行程地点；不需要地图 API Key，但运行时需要网络加载地图瓦片。

`bun run dev` 会同时启动 Vite 和本地 Fastify API，数据写入 `data/app/travel.db`。它仅在开发环境使用 `.env.local` 中的 `DEV_AUTH_EMAIL` 作为身份；生产环境不会读取该变量，仍必须通过 TinyAuth 登录。

## 本地服务与账号

先复制本地环境模板：

```bash
cp .env.local.example .env.local
```

然后一键启动应用、TinyAuth 和本地 Traefik：

```bash
bun run local:up
```

访问 `http://travel.localhost`。开发数据库位于 `data/app/travel.db`，TinyAuth 数据与本地账号文件位于 `data/tinyauth/`；整个 `data/` 目录和 `.env.local` 均不会提交到 Git。

创建本地登录账号：

```bash
bun run auth:user
```

选择 Docker 格式后，命令会输出 `用户名:bcrypt密码哈希`。将其追加到 `data/tinyauth/users`，多个账号使用英文逗号分隔，然后执行 `bun run local:down` 和 `bun run local:up` 使其生效。Google OAuth 仍可在 `.env.local` 中配置。

## 使用方式

- **我的旅行**：以不同封面卡片保存每一趟旅行；示例包含奥匈、日本和珀斯三种攻略主题。
- **旅行记录**：仅聚合已有实录的旅行，并可用卡片链接直接打开对应记录模式。
- **攻略模式**：以自由内容卡片组织每天的路书。卡片可移动到其他日期，主题可在开始记录前选择。
- **记录模式**：点击“开始记录”后，当前攻略会被冻结为只读快照；真实经历在右侧记录列中独立编辑和跨日移动。
- **复制攻略**：程序提供攻略副本机制；副本可更换主题而不会改动已开始记录的冻结攻略。

## 数据与可见范围

生产环境的旅行数据保存在 NAS Docker 卷中的 SQLite 数据库，并按已登录用户隔离。首次登录时，旧浏览器 `localStorage`（键名 `go-travel-state-v1`）中的旅行会一次性导入；原始本地数据会保留作备份。可见范围目前仍是编辑器内的展示选项，不能提供额外的真实权限控制。

## Dokploy 部署

此项目面向自有 NAS 上的 Dokploy Docker Compose 部署，不支持 Vercel。应用容器不公开宿主机端口，所有访问均通过 Dokploy 的 Traefik 与 TinyAuth。

1. 在 Dokploy 创建 Compose 项目，并为 `APP_DOMAIN`（应用）和 `AUTH_DOMAIN`（认证）分别创建 HTTPS 域名路由；两者必须是同一可注册域名下的子域名，例如 `travel.example.com` 与 `auth.example.com`。
2. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建 **Web application** OAuth 客户端，并将授权重定向 URI 精确设置为 `https://${AUTH_DOMAIN}/api/oauth/callback/google`（请替换为实际认证域名）。
3. 将 `.env.example` 的变量添加到 Dokploy 的 Compose 环境变量中；使用真实域名填写 `APP_DOMAIN`、`AUTH_DOMAIN`。
4. 将 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 和逗号分隔的 `TINYAUTH_OAUTH_WHITELIST` 作为 Dokploy secrets 设置。白名单仅填写允许登录的 Google 邮箱，绝不提交 `.env` 文件。
5. 部署 `docker-compose.yml`。验证 `https://${APP_DOMAIN}/health` 返回 `{"status":"ok"}`，Google 登录可用，未在白名单的邮箱被拒绝，并在重新部署后确认旅行数据仍然保留。

`travel-data` 与 `tinyauth-data` 是独立的 Docker 命名卷；不要在升级或清理 Dokploy 项目时删除它们，除非已完成数据库备份。
