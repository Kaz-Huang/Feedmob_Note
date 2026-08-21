# Feedmob WorkLog (极简工作日志系统)

> 🚀 **专为 Feedmob 团队量身打造的“Notion 蒸馏版”极简工作日志与团队时序聚合大盘。**  
> 拥有 Notion 丝滑的 Block 键盘流与多维投影，彻底剔除繁重冗杂，具备 100% 数据私有化主权。

---

## ✨ 核心特性

- ⚡ **Block 沉浸式键盘流**：
  - `/` 斜杠指令面板（支持拼音/英文实时搜索过滤，按 Escape / Backspace / 点击外部自动关闭）。
  - **原子 Block 体系**：标题、正文、☑️ 待办事项 (Task List)、⚠️ 卡点阻塞高亮块 (Blocker Callout)、📊 Mermaid 架构流程图、🎨 交互草图白板 (Whiteboard)、🔗 Figma/视频/网页嵌入。
  - **1:1 Notion 悬浮手柄**：悬浮左侧 `+` 快速加块（支持 Alt 上插）与 `⠿` 6点拖拽手柄。
  - **🔲 双栏/多栏同行并排 (Multi-column)**：支持将两个或多个 Block 并排在同一行显示。
  - **键盘极速移动**：光标停留在任意块内，按下 `Alt + ↑` / `Alt + ↓` 即可上下移动 Block，`Ctrl + Enter` 一键提交。
- 🌊 **团队时序大盘 (Team Stream Feed)**：
  - 一屏聚合各业务研发小组每日日志卡片，高亮 Blocker 阻碍点。
  - 支持表情签阅（👍 👀 🚀 🎯 ❤️）与单层即时协作评论。
- 📅 **时间线与日历 (Timeline & Calendar)**：
  - 月度打卡网格与人员头像聚合，点击任意日期快速定位、补填与回溯。
- 🏷️ **项目与标签透视 (Tag Matrix)**：
  - 跨人员、跨周期一键透视特定项目（如 `#TikTok-Campaign`、`#Auth-Refactor`）的历史推进脉络。
- 📋 **一键聚合周报 (Weekly Summary Generator)**：
  - 按时间跨度与部门一键抽取全员日志生成标准 Markdown 周报，支持一键复制与 `.md` 文件下载。

---

## 🛠️ 技术栈

- **前端框架**：Next.js 15 (React 19 + App Router) + TypeScript + Tailwind CSS
- **编辑器内核**：Tiptap (ProseMirror 工业级基座)
- **图表与白板**：Mermaid.js + HTML5 Canvas
- **数据与存储**：Prisma ORM + SQLite (开发/单机零配置，支持一键切 PostgreSQL)

---

## 🚀 快速启动

### 1. 安装依赖与初始化数据库
```bash
# 进入项目目录
cd feedmob_note

# 安装依赖
npm install

# 初始化 SQLite 数据库并写入种子数据
npm run db:push
npm run db:seed
```

### 2. 启动开发服务器
```bash
npm run dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可开始使用。

### 3. 生产打包与构建
```bash
npm run build
npm run start
```

---

## 📁 目录结构

```text
feedmob_note/
├── prisma/
│   ├── schema.prisma              # 数据库模型 (User / Team / WorkLog / Tag / Comment / Reaction)
│   └── seed.js                    # 示例数据脚本
├── src/
│   ├── app/                       # Next.js App Router 路由与页面
│   ├── components/
│   │   ├── editor/                # Tiptap Block 编辑器与扩展
│   │   ├── views/                 # 多维投影组件 (StreamFeed, CalendarView, TagMatrixView)
│   │   └── layout/                # Navbar 与 Sidebar
│   ├── lib/                       # Prisma 单例与用户上下文
│   └── types/                     # TypeScript 类型定义
└── docs/research/                 # Notion 深度评测与蒸馏架构报告
```
