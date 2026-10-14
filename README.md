# EncChat - 极简高防窥端到端加密双端聊天网页

一款专为隐私与防窥设计的现代端到端加密（E2EE）网页聊天应用。适配手机触屏与 Windows 桌面双端，可一键部署至 Cloudflare。

---

## 🌟 核心特性

1. **防输入窥视（打字 1 秒后自动变星号）**：
   - 用户在输入框打字时，正在键入的字实时可见。
   - 击键停顿 **1 秒后**，前面所有输入的字自动转为 `*`（星号遮罩）。
   - **全面兼容中文输入法（IME）**：微软拼音、搜狗输入法等拼音选词合成期间不截断输入，选词确认后才触发倒计时。
   - 支持按住输入框右侧“小眼睛”按钮临时查看自己输入的实际明文。
   - 内部内存完整维护真实文本，按 `Enter` 键或点击发送时安全发出。

2. **消息端到端加密与防旁观者窥视**：
   - **端到端加密 (E2EE)**：基于浏览器原生 Web Crypto API `AES-256-GCM`，在本地使用由房间密码和房间号通过 `PBKDF2`（100,000次迭代）派生的 256 位密钥加密。
   - **防窥默认展示**：聊天流中所有消息默认以 `●●●●●●●●` 星号密文呈现，即使有人站在屏幕旁边也无法窥视任何文字。
   - **特殊解密查看方式**：
     - **Windows 桌面端**：**按住键盘 `Alt` 键 + 鼠标悬停在特定消息气泡上**，该消息即刻解密为清晰明文；松开 `Alt` 或鼠标移开，瞬间恢复遮罩。
     - **手机移动端**：**长按（按住）特定消息气泡**，即刻解密显示明文并触发轻微震动反馈；手指离开瞬间恢复遮罩。

3. **长期驻留与自定义代号**：
   - **开好房间常驻开启**：房间凭据与会话保存在本地缓存，网页刷新或重开依然保持连接，直至用户点击顶部“退出房间”主动关闭。
   - **自定义房间内昵称**：进入房间时可自由设定代号，也可随时点击顶部昵称实时修改，房间内成员实时同步。
   - **极简深色高级美学**：黑曜石暗黑风格、微光安全指示灯、高科技感密文呈现。

---

## 🚀 本地开发与联调

项目已内置本地 WebSocket 消息中继服务器，无需任何第三方云端账号即可在本地启动测试：

```bash
# 1. 安装依赖
npm install

# 2. 启动本地中继服务 (运行在 8787 端口)
npm run server

# 3. 另开终端，启动前端开发服务器 (运行在 5173 端口)
npm run dev
```

启动后：
- 在电脑上打开多个浏览器窗口（或局域网手机访问 `http://<局域网IP>:5173`）。
- 输入相同的**房间号**与**加密密钥**，即可开始端到端加密实时聊天。
- 体验 Windows 下按住 `Alt` + 鼠标悬停解密，以及手机端长按气泡解密。

---

## ☁️ Cloudflare 部署指南

本方案分为**前端静态页面 (Cloudflare Pages)** 与 **消息中继 (Cloudflare Worker)** 两个模块。

### 方案 A：前端部署到 Cloudflare Pages

1. **构建静态生产产物**：
   ```bash
   npm run build
   ```
   构建产物输出在 `dist/` 目录中。

2. **部署方式一（通过 Wrangler CLI 一键发布）**：
   ```bash
   npx wrangler pages deploy dist --project-name=encchat
   ```

3. **部署方式二（通过 Cloudflare 控制台 Git 关联）**：
   - 将本项目代码推送到 GitHub / GitLab。
   - 进入 Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
   - 构建配置：
     - **Framework preset**: `Vite`
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - 点击 **Save and Deploy** 即可获得专属 `https://encchat-xxx.pages.dev` 域名。

---

### 方案 B：中继部署到 Cloudflare Worker (Durable Objects)

中继服务代码位于 `cloudflare/worker.ts`，配置位于 `cloudflare/wrangler.toml`。

```bash
cd cloudflare
npx wrangler deploy
```

部署完成后，将获得 Worker 提供的 WebSocket 地址（如 `wss://encchat-relay.xxx.workers.dev/ws`）。在前端 `src/services/websocket.ts` 中指定该地址即可全球无缝多节点连接。

---

## 🛡️ 安全规格

- **算法**：AES-GCM (256-bit key length, 96-bit random IV per message).
- **密钥派生**：PBKDF2 with SHA-256 and 100,000 iterations.
- **零知识**：中继服务器仅做 WebSocket 广播，不存储、不解密、不保留消息记录。
