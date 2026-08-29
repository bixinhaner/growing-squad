# v0.6 家庭责任 · 视觉与交互验收

验收结论：通过。实现保持了效果图的家庭小屋、水粉微缩美术、纸张卡片与鼠尾草绿行动色；桌面端和 390×844 手机端都能在一屏内看清当前角色、三步提示和所有主操作。

## 逐屏对照

| 场景 | ImageGen 效果图 | 本机浏览器截图 | 对照图 |
| --- | --- | --- | --- |
| 家庭小屋 | `01-family-cottage-hub.png` | `100-family-cottage-ipad.png` | `01-hub.jpg` |
| 角色分配 | `02-family-role.png` | `101-family-role-ipad.png` | `02-role.jpg` |
| 进行中 | `03-family-active.png` | `102-family-active-ipad.png` | `03-active.jpg` |
| 共同完成 | `04-family-complete.png` | `103-family-complete-ipad.png` | `04-complete.jpg` |
| 家长编排 | `05-parent-responsibility.png` | `105-family-parent-desktop.png` | `05-parent.jpg` |
| 手机进行中 | `06-family-active-mobile.png` | `104-family-active-mobile.png` | `06-mobile.jpg` |

效果图在 `design/v0.6/`，浏览器截图在 `artifacts/visual-qa/`，并排对照图在 `artifacts/visual-qa/comparisons-v06/`。

## 关键检查

- 1366×900：家庭小屋、角色分配、进行中与完成页无横向溢出，主要操作不依赖滚动。
- 390×844：进行页 `scrollHeight <= innerHeight`，三张步骤图、完成、求助和返回均可见。
- 多孩子：角色互不重复；每个孩子只完成自己的角色；全部完成后只生成一条家庭共同记录。
- 纠错与支持：孩子可以请求帮助或换角色；家长端可看到请求、切换五阶段支持方式和手动轮换。
- 动机边界：儿童界面没有积分、排行榜、连续打卡、计时或惩罚；完成反馈强调“我们一起准备好了”。
- 美术一致性：场景图、活动图、角色图和步骤图均来自 ImageGen；未使用 Emoji 代替主视觉。

## 自动验证

- ESLint：通过。
- Vitest：13 个文件、74 个测试全部通过。
- Vite production build：通过。
- Playwright Chromium：17 条完整流程全部通过，包括本模块 3 条专门流程和既有睡前、运动、阅读回归。

运动、阅读、家庭责任与低频家长页面已改为路由级懒加载；主包由约 549 kB 降到约 491 kB（gzip 约 151 kB），构建不再出现大包提醒。孩子第一次打开核心页面时不用先下载所有成长模块。
