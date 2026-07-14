# ChatGPT 远程连接与自托管

本仓库原本只支持 stdio。本分支保留原来的本地启动方式，并通过 Supergateway 增加 Streamable HTTP：

- 本地 stdio：`npm start`
- 远程 Streamable HTTP：`npm run start:http`
- 默认端点：`http://127.0.0.1:8000/mcp`

## 1. 准备 Habitica 凭证

在 Habitica 的 API 设置中取得：

- `HABITICA_USER_ID`
- `HABITICA_API_TOKEN`

不要提交真实 Token，也不要写入 Docker 镜像。

## 2. Docker Compose 部署

```bash
cp .env.example .env
```

编辑 `.env`，填入 Habitica 凭证，并把 `MCP_PATH` 改为较长的随机路径。例如：

```dotenv
MCP_PATH=/mcp-4f76b8d7f1a64b7bb5134e5f027f8c760c8be2b9158b7ad4
```

启动：

```bash
docker compose up -d --build
```

Compose 默认只把服务映射到宿主机的 `127.0.0.1:8000`。这适合在前面使用 Caddy、Nginx 或 Cloudflare Tunnel 提供公网 HTTPS。

## 3. 配置 HTTPS

ChatGPT 需要可从互联网访问的 HTTPS 地址。以 Caddy 为例：

```caddyfile
habitica-mcp.example.com {
    reverse_proxy 127.0.0.1:8000
}
```

最终 MCP URL 为：

```text
https://habitica-mcp.example.com/<你的 MCP_PATH>
```

例如：

```text
https://habitica-mcp.example.com/mcp-4f76b8d7f1a64b7bb5134e5f027f8c760c8be2b9158b7ad4
```

## 4. 在 ChatGPT 中连接

1. 打开 ChatGPT 设置，在“安全与登录”中启用开发者模式。
2. 打开 Plugins / Apps，创建开发者 App。
3. 填写上面的 HTTPS MCP URL。
4. 当前实现没有 OAuth，连接时选择无认证。
5. 连接后先测试读取操作，例如“查看我的 Habitica 今日任务”。

## 安全边界

随机 `MCP_PATH` 只是 capability URL，不等同于 OAuth。知道完整 URL 的人可以调用这个 MCP，并以你的 Habitica 身份执行写操作。

因此当前方式只适合：

- 个人使用；
- 完整 URL 不公开；
- 服务器日志和截图不泄露 URL；
- 反向代理启用 HTTPS；
- 定期更换 `MCP_PATH` 和 Habitica API Token。

多人使用或需要正式公开时，应增加符合 MCP 规范的 OAuth 2.1，而不是继续依赖随机路径。

## 不使用 Docker

```bash
npm install
HABITICA_USER_ID=... \
HABITICA_API_TOKEN=... \
MCP_PATH=/mcp-your-random-path \
npm run start:http
```

Windows PowerShell：

```powershell
$env:HABITICA_USER_ID = "..."
$env:HABITICA_API_TOKEN = "..."
$env:MCP_PATH = "/mcp-your-random-path"
npm run start:http
```

## 可选配置

| 环境变量 | 默认值 | 说明 |
|---|---:|---|
| `PORT` / `MCP_PORT` | `8000` | HTTP 监听端口 |
| `MCP_PATH` | `/mcp` | Streamable HTTP 路径；公网使用时必须修改 |
| `MCP_LOG_LEVEL` | `info` | `debug`、`info` 或 `none` |
| `MCP_STATEFUL` | `false` | 是否启用有状态会话 |
| `MCP_SESSION_TIMEOUT` | `600000` | 有状态会话超时，单位毫秒 |
| `MCP_LANG` | `en` | MCP 工具描述语言 |
