# Minework（工作日志系统）

> 🚀 **专为 Feedmob 团队量身打造的“Notion 蒸馏版”极简工作日志与团队时序聚合大盘。**  
> 以块编辑和团队日志为中心，支持本地 SQLite 存储。

线上地址：[minework.techmob.net](https://minework.techmob.net/)。采用 FeedMob 图标的像素风格品牌标识，支持 FeedMob Google 账号登录。

---

## ✨ 核心特性

- ⚡ **Block 沉浸式键盘流**：
  - `/` 斜杠指令面板（支持拼音/英文实时搜索过滤，按 Escape / Backspace / 点击外部自动关闭）。
  - **原子 Block 体系**：标题、正文、☑️ 待办事项 (Task List)、⚠️ 卡点阻塞高亮块 (Blocker Callout)、📊 Mermaid 架构流程图、🎨 交互草图白板 (Whiteboard)、🔗 Figma/视频/网页嵌入。
  - **就近出现的块操作手柄**：悬浮左侧 `+` 快速加块（支持 Alt 上插）与 `⠿` 6点拖拽手柄。
  - **🔲 双栏/多栏同行并排 (Multi-column)**：支持将两个或多个 Block 并排在同一行显示。竖线表示左右新增列，列内横线表示上下插入，整行上/下的全宽横线可将块拖回普通行。每列有独立手柄，落点配有高亮和说明。
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
cd Feedmob_Note

# 安装依赖
npm ci

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


## 2026-10-13：Notion 交互与 UI 蒸馏

保留 Tiptap / ProseMirror 内核和现有日志 JSON，统一了纸面正文、温和侧栏、菜单、排版和焦点样式。调研过程及实际 REA 证据见 [Notion REA 蒸馏报告](docs/research/05_Notion_REA蒸馏.md)。REA 运行观察覆盖公开前端；未登录编辑器的交互由官方文档核实。

- `/` 搜索文本、标题、待办、折叠等 17 种块命令；菜单按用途分组。
- `Esc` 选中整块；`Shift + ↑/↓` 扩展同级块选区；`Cmd/Ctrl + D` 批量复制；`Alt + ↑/↓` 整组移动；`Backspace/Delete` 批量删除。每次操作可以单独撤销。
- `/toggle` 添加折叠块，富文本标题与正文一起保存。收起时光标不会留在隐藏正文里；标题回车会展开。
- `Cmd/Ctrl + /` 打开当前块菜单。手机底部也有“块操作”入口。
- 选中文字后可格式化或设置链接；链接面板会验证地址并保留选区。
- 页面选项包含标准/全宽、模板与撤销；标题自动换行；日历链接可以打开对应日期。
- 草稿保存在此浏览器，点击“提交工作日志”或 `Cmd/Ctrl + Enter` 才提交到服务端。

多块鼠标框选/整组拖动、分栏宽度调整、图片上传、数据库块和多人同步仍未实现。当前多块选择通过键盘操作，拖动针对单块。

验证命令：`npm run typecheck`、`npm test`、`npm run build`。开发初始化 `npm run db:push` 会预创建 SQLite 文件（已有文件不会被截断）；`db:seed` 会清空数据库，仅用于首次初始化或明确重置。
