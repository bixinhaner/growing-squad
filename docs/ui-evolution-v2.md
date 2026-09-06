> 后续变更：今晚任务已按用户选择的方案 3 精简为平级总清单，移除“专注一件”。以下是 V2 当时的设计记录，最新睡前布局见 [右侧清单改版](tonight-board-v3.md)。

# Growing Squad V2：视觉与交互进化

## 范围与保持不变的约束

在 `feat/trustworthy-growth-comfort` 的可信成长基线 `f000c88` 上演进。UI 继续使用相同的业务动作与本地/云端数据结构；不新增积分体系、排名、连续打卡压力或 AI 评分。不合并主分支、不自动发布、不接触真实家庭账户。

## 已实现的界面结构

| 界面 | 新能力 | 保留的行为 |
| --- | --- | --- |
| 今天 | 昼夜插画构图、明确的状态卡与主次按钮、有限状态过渡 | 最多二选一、求助、休息、完成、跳过 |
| 睡前 | 可切换的专注一件、大图触控、真实进度条 | 默认总清单、16 项平板视图、撤销、临时跳过和原结算 |
| 家长今天 | 家庭近况卡、直接切换孩子、四项快捷操作 | 实际求助、愿望、睡眠补记及原管理入口 |
| 故事树屋 | 阅读位置提示、四本及以上书架的书名/作者搜索 | 原三种主要读法、更多读法、实体书阅读、可跳过表达 |
| 世界与背包 | 风景说明卡、区域区分、实际记忆分类 | 无通关次序、真实成长来源、无记录空状态 |
| 全站 | 统一文字层级、色板、圆角、边框、焦点与表单；家长移动底部导航 | 原路由、角色主题、多孩子、备份和安全设置 |

阅读位置提示只是位置说明，不是必须完成的三项任务。专注一件是可选视图，并非强制按固定顺序；返回总清单后仍可选择其他项目或撤销。

## 实现结构

- `src/styles/evolution.css`：V2 tokens、共享控件和响应式样式。由 `src/main.jsx` 在历史样式之后导入，防止懒加载路由重新覆盖视觉层。
- `src/styles/evolution-layout.css`：旧模块的移动布局兼容层；保留手机书架标题，修复内容列宽与辅助导航显隐。
- `src/ui/Shared.jsx`：对话框挂载到页面根部，避免短转场改变固定弹层位置。
- `src/ui/v2/Evolution.jsx`：阅读位置、空状态、专注任务、家庭近况、快捷操作和世界插画组合。
- `src/ui/v2/evolutionModel.js`：不写入数据的筛选和展示派生函数。
- `src/ui/v2/useGentleMotion.js`：渐进增强的短转场，载入失败时页面仍可用。动画结束及卸载后清理 transform，避免改变弹层定位参照。
- `src/vendor/motion-mini/`：Motion 12.43.0 的 MIT mini 模块、许可证和重建说明。

## 素材与依赖取舍

本轮复用仓库现有毛毡素材，包括花园、夜间陪伴、世界地图与阅读树屋；重新组合而不重复生成近似大图。没有新增生成素材或网络图片热链。

调研过 shadcn/ui、Radix、Motion、React Aria、Embla、dotLottie 的官方资料。实际仅采用 Motion mini；常规状态反馈用 CSS，保留已有弹层的焦点处理并使用 React DOM Portal，不同时叠加多个组件系统。无需自动轮播、额外手势或循环 Lottie。生产依赖和锁文件保持基线版本。

Motion 构建后的动画模块按需加载，生产构建会把该脚本包含到现有预缓存清单中。无运行时 CDN、埋点、AI 请求或外部字体。供应商代码只在隔离开发副本中升级，并需审查重新生成的差异。

## 可访问性与节奏

操作有文字标签，选择状态有 aria-pressed，阅读当前位置有 aria-current，睡前进度可被辅助技术读到。儿童与家长主内容各有键盘跳过导航入口。

同时尊重系统 `prefers-reduced-motion` 和孩子的减少动态设置。动效有限时长，不持续催促，不先隐藏内容等待动画资源。小屏和大字模式可以自然滚动；不通过裁剪或关闭缩放满足一屏。

## 验证与复现

```sh
npm ci
npm run lint
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:pwa
```

保留原完整回归测试。`evolutionModel.test.js` 新增真实数据派生检查；`evolution-v2.spec.js` 新增专注模式完成/撤销、书架搜索、家庭切换、背包分类、手机/平板/桌面和减少动态/键盘检查；`evolution-layout.spec.js` 覆盖 16 个家长深层页面与弹层固定定位。截图由真实 Chromium 页面输出到 `artifacts/visual-qa/v2-*`，使用测试家庭数据，不是效果图。

以 PR 最新提交的 GitHub Actions 结果为准，旧提交的绿灯不代表后续提交通过。浏览器测试和视口模拟不等于真机 Safari、iPad 或 Android 验收。

## 参考与许可

- Motion animate：https://motion.dev/docs/animate
- Motion bundle size：https://motion.dev/docs/react-reduce-bundle-size
- Motion accessibility：https://motion.dev/docs/react-accessibility
- shadcn/ui：https://ui.shadcn.com/docs
- Radix：https://www.radix-ui.com/primitives
- W3C WCAG 2.2：https://www.w3.org/TR/WCAG22/

## 发布

继续使用完整 `npm run build` 产物，包含 `sw.js` 与 `precache-manifest.json`。上线前保留可恢复备份。V2 是界面和交互演进，不迁移家庭业务数据格式。
