# 🎨 原型托管平台 Prototype Host

上传 HTML 原型 → 自动托管 → 在线预览 → 分享链接。适合 PM 向客户/内部展示 HTML 原型稿。

## ✨ 核心能力

- 📦 **拖拽上传 zip** —— 自动解压、自动识别入口 `index.html`、支持最大 200MB
- 🔒 **用户体系** —— 手机号+密码登录，超管可创建用户并控制每人可见的原型
- 🔗 **独立访问密码** —— 可选，给外部客户看时加密；管理员/上传者自动豁免
- 🖼️ **封面自动生成 + 手动替换** —— 默认渐变占位图，可上传自定义封面
- 📊 **访问统计** —— 每个原型 PV/UV + 近 7 天趋势
- 🚀 **零服务器成本** —— Vercel + Cloudflare R2，免费额度内即可跑

## 🏃 本地开发

```bash
npm install --legacy-peer-deps --cache /tmp/npm-cache-prototype
cp .env.example .env.local
# 编辑 .env.local 修改 SESSION_SECRET / SUPER_ADMIN_* 等
npm run dev
```

访问 http://localhost:3000/login

默认超管账号（开发环境）：
- 手机号：`18888888888`
- 密码：`admin123`
- 秘密免密 URL：`http://localhost:3000/admin-bypass?token=dev_bypass_token_replace_before_deploy`

## 🚢 部署到生产

### 1. 域名

**使用 Vercel 送的免费域名即可**：`你的项目名.vercel.app`。部署后系统自动分配，无需额外配置。

预览 URL 示例：
```
https://myproto.vercel.app/              → 列表页
https://myproto.vercel.app/p/labor-v1/   → 原型预览
```

> 未来若想升级到 `xxx.yourdomain.com` 子域名样式，买域名后加个 middleware 约 30 分钟即可切换。

### 2. Cloudflare R2 存储
1. Cloudflare Dashboard → R2 Object Storage
2. **Enable R2**（首次要求绑信用卡，免费额度内不扣费）
3. **Create bucket**：`prototype-host`
4. **Manage R2 API Tokens → Create API Token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `prototype-host`
5. 保存 4 个值：`Account ID` / `Access Key ID` / `Secret Access Key` / `Endpoint URL`

### 3. Vercel 部署
```bash
# 方式 1：GitHub 关联（推荐）
git init && git add -A && git commit -m "init"
gh repo create prototype-host --public --push
# 到 Vercel 点 Import 即可

# 方式 2：直接命令行
npx vercel
```

### 4. Vercel 环境变量

在 Vercel 项目 Settings → Environment Variables 添加：

```
SESSION_SECRET              <随机 32+ 字符>
SUPER_ADMIN_PHONE           18888888888
SUPER_ADMIN_PASSWORD        <你的生产密码>
SUPER_ADMIN_BYPASS_TOKEN    <随机 32+ 字符>

R2_ACCOUNT_ID               <从 Cloudflare 复制>
R2_ACCESS_KEY_ID            <从 Cloudflare 复制>
R2_SECRET_ACCESS_KEY        <从 Cloudflare 复制>
R2_BUCKET                   prototype-host
R2_ENDPOINT                 https://<account_id>.r2.cloudflarestorage.com

KV_REST_API_URL             <Vercel KV 启用后自动注入>
KV_REST_API_TOKEN           <Vercel KV 启用后自动注入>
```

### 5. Vercel KV（元数据存储）

在 Vercel 项目 → Storage → Create → KV → 连接到项目即可，环境变量自动注入。

## 🗂️ 代码结构

```
src/
├── app/
│   ├── login/                   登录页
│   ├── upload/                  上传页
│   ├── admin/                   管理员专区
│   │   ├── users/                  用户管理
│   │   ├── stats/                  访问统计
│   │   └── prototypes/[slug]/      原型编辑
│   ├── p/[slug]/[[...path]]/    原型预览（通配路径）
│   ├── api/                     REST API
│   ├── admin-bypass/            秘密免密登录
│   └── page.tsx                 首页（原型列表）
├── components/                  React 组件
└── lib/
    ├── auth.ts                  密码哈希 + 登录
    ├── db.ts                    元数据存储（本地 JSON / Vercel KV）
    ├── session.ts               iron-session 配置
    ├── storage.ts               文件存储（本地 / R2）
    ├── thumbnail.ts             封面生成
    ├── types.ts                 TS 类型
    └── zip.ts                   解压
```

## 🔑 路由说明

| 路由 | 用途 | 权限 |
|------|------|------|
| `/login` | 登录页 | 公开 |
| `/admin-bypass?token=xxx` | 秘密免密登录 | Token 校验 |
| `/` | 原型列表 | 登录用户 |
| `/upload` | 上传原型 | 登录用户 |
| `/admin/users` | 用户管理 | 仅超管 |
| `/admin/stats` | 访问统计 | 仅超管 |
| `/admin/prototypes/[slug]` | 原型编辑 | 仅超管 |
| `/p/[slug]/[[...path]]` | 预览（通配路径） | 按原型密码 |

## 🧪 已验证功能

- ✅ 手机号+密码登录（bcrypt 哈希）
- ✅ 30 天 Cookie 持久化（iron-session）
- ✅ 秘密 URL 免密登录
- ✅ zip 上传 + 自动解压 + 入口识别 + 剥离顶级目录
- ✅ 预览路由（含中文文件名、相对路径、静态资源）
- ✅ 独立访问密码 + 管理员/上传者豁免
- ✅ 封面自动生成 SVG（基于名字的渐变）
- ✅ 用户 CRUD + 可见原型配置
- ✅ 访问统计 PV/UV + 7 天趋势
- ✅ 原型删除（级联删文件 + 统计数据）

## 🛠️ 下一步（v2+）

- [ ] 真截图引擎（sparticuz/chromium，替换占位 SVG）
- [ ] 子域名路由（`{slug}.{domain}`）via middleware
- [ ] 上传进度断点续传
- [ ] 版本管理（一个原型可上传多个版本）
- [ ] 访问日志 CSV 导出
- [ ] 评论系统（甲方在原型上留言）

## 🐛 已知局限

- 本地开发用 JSON 文件存元数据，**多人并发写会冲突**（Vercel KV 解决）
- 本地开发用文件系统存原型文件，**超大文件占磁盘**（R2 解决）
- 封面目前是占位 SVG，待接入真截图（见下一步）

---

**超管默认账号**：`18888888888` / `admin123` — 部署前务必改掉！
