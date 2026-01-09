# 云哨 CloudSentinel

## 📖 简介

CloudSentinel 是一款轻量的服务器运维探针前端应用。基于 Vue 3 + TypeScript + Vite 等现代化技术栈构建，提供直观的管理控制台与公开页面，支持访客访问、实时负载展示与告警相关配置视图。

## ✨ 功能特性

- 🔐 **访客访问**：支持密码保护的访客访问模式
- 📊 **实时监控**：实时展示服务器 CPU、内存、磁盘、网络等关键指标
- ⚠️ **阈值告警**：灵活的告警规则配置，支持邮件、WebHook告警方式
- ⚙️ **监控配置**：丰富的监控配置选项

## 🚀 快速开始


### 安装面板端
1. 在服务器执行以下命令安装面板
```shell
curl -L https://raw.githubusercontent.com/YunTower/CloudSentinel-Backend/refs/heads/master/install.sh -o cloudsentinel.sh && chmod +x cloudsentinel.sh && sudo ./cloudsentinel.sh
```
2. 待面板安装完成后会输出面板地址、管理员账号、密码，需要在云服务器服务商防火墙/安全组放行面板端口，然后就可以登录面板了。

### 安装被控探针
1. 在需要被监控的服务器上执行以下命令。   
这个命令会在面板端添加好服务器后自动生成，你也可以选择自己手动填入。   
注意：需要修改命令中的`--server`和`--key`参数，不要直接复制执行    
```shell
curl -L https://raw.githubusercontent.com/YunTower/CloudSentinel-Agent/refs/heads/master/install.sh -o cloudsentinel_agent.sh && chmod +x cloudsentinel_agent.sh && sudo ./cloudsentinel_agent.sh --server=服务端websocket地址 --key=通信密钥 --daemon
```
若不需要以进程守护模式启动，则去掉末尾的`--daemon`参数即可
```shell
curl -L https://raw.githubusercontent.com/YunTower/CloudSentinel-Agent/refs/heads/master/install.sh -o cloudsentinel_agent.sh && chmod +x cloudsentinel_agent.sh && sudo ./cloudsentinel_agent.sh --server=服务端websocket地址 --key=通信密钥
```


## 🔗 相关仓库

- **面板前端**: [CloudSentinel](https://github.com/YunTower/CloudSentinel)
- **面板后端**: [CloudSentinel-Backend](https://github.com/YunTower/CloudSentinel-Backend)
- **被控探针**: [CloudSentinel-Agent](https://github.com/YunTower/CloudSentinel-Agent)

## 📄 许可证

CloudSentinel 以 MIT 协议开源发布。
