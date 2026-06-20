# 云哨 CloudSentinel

CloudSentinel 是一套轻量的服务器监控面板，包含面板前端、面板后端和被控 Agent。适合自建服务器状态面板、资源监控、公开状态页和基础告警场景。

## 功能

- 服务器 CPU、内存、磁盘、网络等指标展示
- WebSocket 实时数据上报
- 服务可用性监控与告警规则
- 公开展示页、访客访问与基础权限控制
- Agent 一键安装、后台运行与远程配置更新

## 快速安装

在面板服务器执行：

```bash
curl -L https://raw.githubusercontent.com/YunTower/CloudSentinel-Backend/refs/heads/master/install.sh -o cloudsentinel.sh && chmod +x cloudsentinel.sh && sudo ./cloudsentinel.sh
```

安装完成后脚本会输出访问地址、管理员账号和密码。请在服务器防火墙或云厂商安全组中放行脚本输出的面板端口。

## 添加 Agent

先在面板中添加服务器，面板会生成对应的 Agent 安装命令。也可以手动执行：

```bash
curl -L https://raw.githubusercontent.com/YunTower/CloudSentinel-Agent/refs/heads/master/install.sh -o cloudsentinel_agent.sh && chmod +x cloudsentinel_agent.sh && sudo ./cloudsentinel_agent.sh --server=服务端WebSocket地址 --key=通信密钥 --daemon
```

`--server` 和 `--key` 必须替换为面板提供的值。无需后台守护时，可以去掉 `--daemon`。

## 本地开发

前端开发：

```bash
cp .env.example .env
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm build
pnpm type-check
pnpm lint
```

默认接口配置在 `.env.example` 中：

```env
VITE_API_SERVER=http://127.0.0.1:3000
VITE_API_URL_PREFIX=/api
```

## 仓库

- 面板前端：[YunTower/CloudSentinel](https://github.com/YunTower/CloudSentinel)
- 面板后端：[YunTower/CloudSentinel-Backend](https://github.com/YunTower/CloudSentinel-Backend)
- 被控 Agent：[YunTower/CloudSentinel-Agent](https://github.com/YunTower/CloudSentinel-Agent)

完整安装说明以本仓库为入口，后端和 Agent 仓库仅保留组件说明与维护命令。

## 许可证

MIT
