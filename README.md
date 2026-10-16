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

多块鼠标框选/整组拖动、图片上传、数据库块和多人同步仍未实现。当前多块选择通过键盘操作，拖动针对单块。

验证命令：`npm run typecheck`、`npm test`、`npm run build`。开发初始化 `npm run db:push` 会预创建 SQLite 文件（已有文件不会被截断）；`db:seed` 会清空数据库，仅用于首次初始化或明确重置。


## 2026-10-16：独立分栏与区块尺寸

- 每列按自己的内容向下堆叠，列末尾的“＋ 添加区块”会在当前列继续编辑。短列下方的空白也可以点击或接收拖入的区块。整行之后的正文仍排在最高列下方。
- 悬停列间空隙，拖动竖线调整相邻列宽；双击均分。聚焦竖线后，可用左右方向键微调、Home 均分。手机按列顺序纵向显示。
- 嵌入内容、Mermaid 图表和白板支持两侧调宽、右下角调宽高；书签只调宽。聚焦尺寸手柄后，方向键微调，Home 或双击右下角恢复默认。
- 尺寸保存在日志 JSON 和本地草稿中；一次拖动只产生一次可撤销的修改，Escape 取消当前拖动。文字块的高度由内容和列宽自然决定。

设计依据：Notion 的 [分栏说明](https://www.notion.com/help/columns-headings-and-dividers) 与 [媒体尺寸说明](https://www.notion.com/help/images-files-and-media)。


## 发布产物保留策略

代码先 commit 并 push，发布成功后，服务器仅保留当前运行的 Minework 镜像与对应源码目录。旧回退容器、旧镜像、旧源码、上传包和构建备份均清理；恢复历史版本时从 Git 中重建。日志数据库、当前运行配置和独立的数据库快照保留，凭据与业务数据不进入 Git。

将 [清理脚本](scripts/cleanup-releases.py) 放到服务器 `/home/ubuntu/workweave/cleanup-releases.py`：

```bash
# 先查看计划
python3 /home/ubuntu/workweave/cleanup-releases.py

# 发布完成、确认当前服务正常后执行
sudo python3 /home/ubuntu/workweave/cleanup-releases.py --apply
```

附加 `--prune-build-cache` 可清理 Docker 共享构建器中未使用的构建缓存，不删除其他应用的镜像、容器或数据卷。下一次构建可能需要重新下载依赖。

## 网站版本更新提示

页面每分钟及切回标签页时检查新版本。有更新时显示“Minework 有新版本”，点击“刷新更新”会先保存本地草稿再刷新；正在提交、使用输入法或草稿无法写入时会提示稍后处理。首次启用此功能时，已有标签页需先手动刷新一次。

## 登录身份与管理员

Google 登录后固定本人身份，只能修改自己的日志、个人资料，并以本人身份评论或签阅。其他成员的日志通过团队动态、日历等入口查看。

管理员可从侧栏或右上角账号菜单进入 `/admin` 管理面板，管理成员资料、角色、所属团队以及团队信息。管理权限由后端校验，管理员也不能冒用他人提交日志。角色变更在后续请求中即时生效；不能移除自己的管理员权限或最后一位公司管理员。
