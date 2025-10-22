# 开发与构建说明

本文档概述了当前 Astro 个人作品集网站的开发、运行与组件说明，方便协作、维护与快速上手。

> 目录
> - 项目概述
> - 依赖与环境
> - 本地开发（Windows / PowerShell）
> - 生产构建与部署
> - 目录结构与组件说明（`src/components`）
> - 资源与静态文件位置
> - 常见问题与调试步骤
> - 贡献与联系方式

---

## 项目概述

该仓库是使用 Astro 构建的静态前端作品集，样式基于自定义 CSS（CSS 变量、渐变与少量动画）。页面由多个可复用组件组成（放在 `src/components`），并使用纯前端脚本实现交互效果（例如轮播）。

主要目标：展示个人简介、技能、项目作品、画廊、成就与联系方式，视觉风格为简洁的蓝绿色调。

## 依赖与环境

推荐 Node.js LTS（例如 18.x 或 20.x）。

在仓库根目录下可以找到 `package.json`（包含 dev/ build 脚本）。如果缺少全局依赖，请先安装 Node.js。

常用命令（PowerShell）：

```powershell
# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev

# 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

> 注：如果使用 pnpm / yarn，替换为相应命令。

## 本地开发注意事项（Windows / PowerShell）

- 请使用 PowerShell 或者 Windows Terminal 以获得较佳体验。
- 如果遇到端口被占用，修改 `package.json` 脚本或使用环境变量指定端口。
- 编辑 `.astro` 或 CSS 后，开发服务器会自动热重载。

## 生产构建与部署

- 构建：`npm run build`，构建产物将生成到 `dist/`（默认）。
- 部署：将 `dist/` 内容托管到静态站点（例如 GitHub Pages、Netlify、Vercel）。

## 目录结构（与重要文件）

- `astro.config.mjs` - Astro 配置
- `package.json` - 项目依赖与脚本
- `src/` - 源代码
  - `assets/` - 图片、二维码等静态资源（建议放在 `public/assets`）
  - `components/` - 复用组件（下文详细说明）
  - `layouts/` - 页面布局
  - `pages/` - 页面入口（例如 `index.astro`）
- `public/` - 公共静态文件（会直接拷贝到构建产物根目录）

## `src/components` 组件说明

下面列出当前项目中常见的 `.astro` 组件及其用途（基于当前代码库）：

- `Layout.astro`：
  - 全局页面布局（头部/底部/主题变量），包含全局样式与脚本挂载点。

- `Header.astro`：
  - 顶部导航栏，包含页面内锚点链接（Hero/About/Skills/Projects/Gallery/Contact）和响应式菜单。

- `Hero.astro`：
  - 首页首屏展示，包含姓名、职业标签、浮动背景装饰与引导按钮。内部带有少量动画（例如文字打字、图形漂浮）。

- `About.astro`：
  - 关于我区域，采用时间轴（timeline）展示教育/商业实践/技术探索。包含图标标记、标签与悬停样式。
  - 注意：`timeline-tags` 的样式为深色背景，悬停变浅色（参见最新修改）。

- `Skills.astro`：
  - 技能分组与进度条展示（Python/前端/AI 等），包含进度条动画与描述文本。

- `Projects.astro`：
  - 项目卡片网格，顶部为渐变图片区（或占位 SVG），下方为项目描述与技术栈标签。

- `Gallery.astro`：
  - 作品画廊，采用中心聚焦的 3 项可见轮播（carousel），支持自动播放、暂停、左右箭头控制和点指示器。
  - 注意：已修复 TypeScript 检查相关的警告（对 DOM 节点做了 null 检查并添加了类型注解）。

- `Achievements.astro`：
  - 成就/徽章墙展示，包含统计面板与徽章格子（不同等级色彩：金/银/铜/特殊）。

- `Contact.astro`：
  - 联系方式与表单区域。当前已简化为邮箱主要联系方式，并在表单下方添加了闲鱼与微信二维码展示。

- `Footer.astro`：
  - 页脚信息（关于、快速链接、联系方式），包含 GitHub 与闲鱼链接（已更新）。

> 如果你增加/删除了组件，请相应更新本节。

## 资源与静态文件放置

- 请将静态图片（如二维码）放到 `public/assets/`，并在模板中使用绝对路径 `/assets/xxx.jpg`。
- CSS 变量与主题色定义一般放在 `Layout.astro` 或全局样式文件中。

## 常见问题与调试步骤

下面列出一些在开发中会遇到的问题与对应解决方法：

1. **页面运行正常但代码审查/类型检查报错（例如 Gallery.astro）**
   - 原因：TypeScript 静态检查更严格，会报告 `querySelector` 返回可能为 `null`、计时器变量隐式 `any` 等问题。
   - 解决：给变量添加类型注解并在使用前做 null 检查。例如：
     ```ts
     const track = document.querySelector('.carousel-track') as HTMLElement | null;
     if (!track) return; // 退出或降级处理

     let autoplayInterval: number | undefined;
     autoplayInterval = window.setInterval(nextSlide, 4000);
     clearInterval(autoplayInterval);
     ```

2. **热重载或样式不生效**
   - 检查路径是否在 `public/` 下，且使用 `/assets/` 绝对路径。
   - 确认变量名（例如 `--primary`）在全局样式中已定义。

3. **构建失败（与开发服务器不同）**
   - 在 `npm run build` 时，注意 TypeScript/ESLint 报错会导致构建失败。逐一修复类型/语法警告。

4. **图片/资源 404**
   - 确保文件存在于 `public/`，路径大小写匹配（Windows 忽略大小写但生产服务器可能区分）。

5. **部署后样式断裂**
   - 检查构建时是否对 CSS 做了后处理（PostCSS/Autoprefixer），以及是否使用了基于路径的资源引用。

## 本次变更亮点（历史记录）

- Gallery 轮播脚本：修复了 TypeScript 检查警告（明确类型、空值判断、使用 `window.setInterval` 返回值）。
- About 区域：调整为更统一的风格，标签（`timeline-tags`）使用深色背景并在悬停时切换为浅色。
- Contact：邮箱已更新为 `wangfeiyang24@mails.ucas.ac.cn`，并添加了闲鱼/微信二维码位置（`/assets/xianyu.jpg`、`/assets/weixin.jpg`）。
- Footer：已移除电话并添加 GitHub / 闲鱼 链接。

## 贡献与联系方式

如果你想提交更改：

```powershell
git checkout -b feat/your-change
# 修改代码
git add .
git commit -m "feat: 描述你的更改"
git push origin feat/your-change
```

如果需要我继续：
- 我可以帮助把当前更改打包为一个提交并模拟构建检查（需要你授权运行构建命令）
- 或者我可以把文档翻译为英文并补充使用示例

---

如需补充组件细节或把文档写入 README，我可以把这份文档合并或创建一份更精简的 README。