# Growing Squad 交互动线重设计 · 方案 1

生成方式：OpenAI 内置 ImageGen。  
Figma 流程板：https://www.figma.com/board/XuDNYxjpdX0lxj11wdx98H

## 视觉母版

- `child-today-selected.png`：方案 1 母版。羊毛毡与软陶质感、奶油底色、深蓝文字、鼠尾草绿与蜂蜜金辅助色。
- 页面原则：一个页面只推动一个主要目标；辅助动作渐进展开；儿童端始终保留统一三栏导航；家长端始终保留五栏导航。

## 儿童端

- `child-today-selected.png`：今天 / 下一件事。
- `child-help-sheet.png`：需要帮助底部层。
- `child-tonight-tablet.png`：iPad 晚间任务全览，任务不翻页、不滚动。
- `child-world.png`：小队世界与继续探索。
- `child-garden.png`：月光花园深层页，保持统一儿童导航。
- `child-backpack.png`：成长背包与收藏。
- `child-complete-early-tablet.png`：按时完成，15–20 秒星光开花反馈关键帧。
- `child-complete-late-tablet.png`：超时完成，约 10 秒新叶成长反馈关键帧。

## 家长端

- `parent-today-desktop.png`：今天 / 待处理优先的桌面端。
- `parent-today-mobile.png`：移动端今天页，五个带文字底部入口。
- `parent-growth-desktop.png`：成长时间线，日期以 2026-08-30 为锚点。
- `parent-plan-desktop.png`：计划中心，周视图为 2026-08-24 至 2026-08-30。
- `parent-routine-editor-desktop.png`：睡前流程列表与单项编辑抽屉。
- `parent-rewards-desktop.png`：星光、愿望与奖励事件。
- `parent-settings-desktop.png`：孩子、设备、同步与安全设置。

## 生成提示词摘要

所有页面均以 `ui-mockup` 模式生成，并附带方案 1 母版作为视觉参考。统一约束包括：

- Web 应用内容本身，不出现浏览器、设备边框或系统状态栏。
- 不使用 emoji，不使用惩罚、排名和扣分表达。
- 儿童移动端以 390 × 844 构图，iPad 晚间任务和完成反馈以 834 × 1194 构图。
- 家长桌面端以 1440 × 1024 构图，移动端以 390 × 844 构图。
- 中文可读、触控目标明确、避免卡片堆叠、避免隐藏导航和横向入口滚动。
