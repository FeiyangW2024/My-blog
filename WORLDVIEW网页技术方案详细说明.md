## 概要

本文档基于当前仓库（XBAERVIEW）的代码和目录结构，针对项目现状给出一份详细的技术方案说明（设计说明、实现细节、数据流、性能优化、测试与部署建议等）。目标读者为前端开发工程师、产品技术负责人与运维人员。

## 项目概览

- 技术栈：Vue 3 + Vite + Pinia，UI 使用 Element Plus；地图采用 Leaflet（并使用 side-by-side 对比插件）；时间轴采用自实现的 Canvas/DOM 混合渲染。
- 主要目录：
  - `src/components/Layer.vue`：地图主控件，负责地图初始化、图层管理、对比模式、与时间线交互。
  - `src/components/Timeline.vue`：时间轴组件，支持年/月/日视图、双指针对比、拖拽和平滑滚动等交互。
  - `src/utils/dateUtils.js`：检测 `public/tiles` 下可用日期的工具，提供检测、刷新和查询接口。
  - `public/tiles/`：按日期组织的瓦片目录（例如 `public/tiles/2024-11-06/{z}/{x}/{y}.png`）。

## 设计契约（Contract）

- 输入：用户的交互（添加图层、切换日期、切换对比模式、滚动/拖拽时间轴）以及浏览器对 `public/tiles` 的静态文件请求。
- 输出：在地图上渲染对应的瓦片图层，支持单图层、左右对比图层（layer side-by-side）和双日期 A/B 对比模式；时间轴展示可选日期并与地图联动。
- 成功标准：界面交互流畅、地图在可接受时间内加载瓦片、不出现严重卡顿或内存泄漏；对比切换和日期更新正确反映在地图上。
- 错误模式：瓦片缺失（显示“无数据”提示），网络超时、对比控件与图层实例不同步、时间轴滚动与指针位置错位。

## 关键模块说明

1) Layer.vue（地图层管理）
  - 初始化地图（Leaflet）：设置中心、缩放、关闭默认控件。
  - 图层管理：维护 `baseLayers` 和 `otherLayers` 列表；支持添加本地图层（从 `public/tiles`）与网络图层；添加时创建 `L.tileLayer`，并在 `tileload` / `tileerror` 上注册处理。
  - 对比模式：两类实现
    - 普通图层对比：当至少 2 个可见图层时，使用 `L.control.sideBySide(left, right)` 将两个已有 layer 实例加入对比控件。
    - 双日期对比（Date Compare Mode）：当可见图层数量不足或用户选择时，动态创建两组基于不同日期的 `L.tileLayer('./tiles/YYYY-MM-DD/{z}/{x}/{y}.png')`，并将其传入 side-by-side 控件。
  - 其他：图层透明度控制、图层可见性切换、动态调整地图 `maxZoom`（取可见图层的最小 maxZoom）。

2) Timeline.vue（时间轴）
  - 视图：年 / 月 / 日 三种步长，支持画布动画、DOM 刻度渲染及平滑滚动。
  - 交互：点击、拖拽（带长按判定）、鼠标悬停提示、双指针选择（对比模式下 A/B 指针）、跳转到最新日期。
  - 缓存策略：使用 `timelineTicksCache` 预生成较大范围的刻度（减少运行时重复计算），并根据视图调整 `ticksPerView`。
  - 与地图通信：通过注入（inject）或 `mapService`（Layer.vue 提供）同步当前选中日期；在对比模式下通过 `mapService.updateCompareDateA/B` 更新地图对比图层。

3) dateUtils.js（日期检测）
  - 实现：基于尝试加载 `./tiles/{date}/0/0/0.png` 的方式并发检测可用日期。实现中有并发分批（batchSize=10）和 1.5s 超时控制。
  - 提供接口：detectAvailableDates、isDateAvailable、getLatestDate、getAdjacentDates、refreshAvailableDates。

## 数据流（高级）

1. 启动流程：应用启动 -> `Layer.vue#onMounted` 调用 `detectAvailableDates()` -> 将检测到的日期保存于 `availableDates` -> `Timeline.vue` 读取并初始化时间轴显示。
2. 用户选择日期（非对比模式）：`Timeline` 调用 `mapService.updateLayerDate(date)` -> `Layer` 检测日期可用性 -> 如果可用则构建 `./tiles/{date}/{z}/{x}/{y}.png` 并通过 `baseLayer.instance.setUrl(newUrl)` 更新瓦片图层。
3. 对比模式日期变更（双日期对比）：`Timeline` 更新指针 -> 通过 `mapService.updateCompareDateA/B` 调用 -> `Layer` 的 `compareModeLayerA/B.setUrl(...)` 更新。

## 性能与稳定性要点（痛点与建议）

已观察到的潜在问题与针对性优化建议：

1) detectAvailableDates 并发与超时策略
  - 问题：当前在浏览器中通过加载图片逐日检测可用性，尽管有批次控制，但对大量日期可能仍导致大量请求并增加网络压力或浏览器资源占用。
  - 建议：
    - 在服务端预生成并提供一个日期索引（例如 `tiles/index.json` 或 `tiles/available.json`），前端只需拉取一次，极大降低检测成本；如果无法在部署端改变，则：
    - 将并发控制进一步降低（例如 4-6）并使用指数回退/队列；将检测放到 Web Worker 中以避免阻塞 UI。

2) 时间轴滚动与指针定位
  - 问题：Timeline 使用大量 DOM 查询（querySelectorAll）和定时检查（如 setInterval 每 100ms 检查对比模式），可能导致 CPU 占用偏高，并且当 DOM 大时定位不准确。
  - 建议：
    - 将定时器改为事件驱动（例如在图层与时间轴之间使用事件/回调，而不是轮询）。
    - 减少对全量 `querySelectorAll` 的频繁调用，改为在刻度生成时保存元素引用或使用虚拟化渲染（仅渲染可视范围内刻度）。
    - 使用 requestAnimationFrame 做平滑滚动后的指针位置更新，避免 layout thrashing。

3) 瓦片加载失败处理
  - 问题：当前在 tileerror 中仅提示一次（hasError 标志），但没有更高阶的容错或降级策略。
  - 建议：
    - 对短时间内多次失败的瓦片采用重试策略（带延迟和最大重试次数），或在失败时替换为占位图（灰色瓦片）并记录失败日期以便排查。
    - 对本地图层路径使用更严格的校验（例如检查 `/tiles/{date}/0/0/0.png` 是否存在）再允许用户添加，以减少用户因路径错误反复操作。

4) 地图最大缩放（maxZoom）与多图层协调
  - 问题：map.setMaxZoom 使用可见图层的最小 maxZoom，这会导致当多个图层混合时缩放体验受限。
  - 建议：
    - 在 UI 上向用户明确显示当前可用最大缩放，并提供提示或在图层面板中展示图层各自的 maxZoom。
    - 考虑在用户切换图层时提供短暂提示（非阻塞）说明为何被强制缩小。

5) 内存与实例清理
  - 问题：Layer 中动态创建的 tileLayer 在切换/移除时需确保调用 `.remove()` 并清理引用，避免内存泄漏。
  - 建议：
    - 为 Layer 对象统一封装生命周期函数（init/attach/detach/destroy），确保移除时清理事件监听与 DOM 引用。

## 测试策略

- 单元测试：使用 Vitest 或 Jest 对 `dateUtils.js` 编写测试（detectAvailableDates 可通过 mock Image 加载来模拟），验证 isDateAvailable、getLatestDate、getAdjacentDates 等函数。重点测试边界日期、空数组和异常路径。
- 组件测试：使用 Vue Test Utils 测试 `Timeline.vue` 的日期选择逻辑（模拟 click/drag），以及 `Layer.vue` 的图层添加/移除和 compare 模式切换的高层行为（可 mock Leaflet 的 L.tileLayer / map API）。
- E2E：使用 Playwright / Cypress 对整体交互进行关键路径测试：加载页面 -> 等待日期检测完成 -> 切换日期 -> 验证地图瓦片 URL 请求（或 DOM 中图层实例换到正确 URL）。

## 部署与构建建议

- 推荐构建脚本：使用 package.json 中的 `build`（vite build）生成静态资源。
- 若 `public/tiles` 的瓦片较多，建议把 tiles 上传到 CDN 或对象存储（例如 OSS/S3），并在页面中以跨域方式读取（配置 CORS）。为提高性能，建议开启 CDN 的缓存和较长的 Cache-Control。

## 安全与浏览器兼容

- 本地添加图层方案说明已写在 UI（Layer.vue dialog）：需要把瓦片放到 `public/tiles/<date>` 下。注意浏览器本地文件读取受限，建议通过「将文件放到 public 文件夹或部署到本地服务器」的方式提供瓦片文件。
- 提醒：当瓦片从外部域加载时需确保 CORS 允许请求（尤其是 Web Worker 或 Canvas 操作可能受影响）。

## 迁移与后续优化路线（优先级）

1. 高优先级（立即实施）
  - 在服务端生成并提供 `tiles/available.json`（或在构建时预生成），并修改 `dateUtils.detectAvailableDates` 优先拉取该索引。
  - 将 Timeline 的对比轮询（100ms）改为事件驱动（mapService 在状态变化时触发事件）；移除密集轮询。
  - 把 detectAvailableDates 的并发控制降低并迁移到 Web Worker（避免阻塞主线程）。

2. 中优先级（短期内完成）
  - 增加瓦片加载失败的重试与占位图方案；在 UI 中显示更明确的错误信息。
  - 优化时间轴渲染，采用虚拟化或只渲染可视范围的刻度，减少 DOM 节点。
  - 为 Layer 中的 tileLayer 操作建立统一的生命周期管理接口。

3. 低优先级（可选/长期）
  - 将 `public/tiles` 上传到 CDN + 生成 manifest，并支持多源回退。
  - 增加按需瓦片预取策略（根据用户视野与缩放级别预取附近瓦片）。

## 便于开发的改进建议（细节）

- 减少 window 全局变量使用（当前 Layer.vue 使用了 window.$hideLayerPanel 等），改为通过 Pinia 或 provide/inject 进行组件间通信。
- 将 `compareStatusInterval` 的轮询改为事件或使用 `MutationObserver`/自定义事件，消除 100ms 轮询。
- 对 `dateUtils.checkDateExists` 增加后端友好的快速探测 API（如 HEAD 请求到 CDN 或通过 manifest 校验），提高稳定性。

## 运行与调试（本地快速验证）

1. 安装依赖：

```powershell
npm install
```

2. 本地调试：

```powershell
npm run dev
```

3. 打包：

```powershell
npm run build
```

在调试时可直接打开 `public/tiles` 下的某个日期目录，确认 `0/0/0.png` 存在以便 `dateUtils` 能检测到该日期。

## 下一步交付清单

- （短期）实现 `tiles/available.json` 索引并修改 `dateUtils` 优先使用该索引。
- （短期）把 `Timeline.vue` 中的 compare 轮询替换为 mapService 事件回调。
- （中期）为 `dateUtils` 写 Vitest 单元测试，并模拟图片加载成功/失败场景。
- （中期）在 `Layer.vue` 中封装 tileLayer 生命周期管理，添加重试策略。

## 附录：关键代码位置（快速导航）

- 地图入口：`src/components/Layer.vue`
- 时间轴：`src/components/Timeline.vue`
- 日期检测：`src/utils/dateUtils.js`
- 资源目录：`public/tiles/`（按日期子目录组织）

---

文档由代码仓库自动分析生成；如需我把其中某些建议（例如 `detectAvailableDates` 的改造或 `Timeline` 的轮询替换）直接实现为代码补丁，我可以继续在仓库中创建相应的 PR。请告诉我你希望优先实现的变更项。
