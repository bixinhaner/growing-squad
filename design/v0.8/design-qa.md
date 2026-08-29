# v0.8 视觉与交互验收

## 已通过

- 1440×1024 小队助手：主视觉完整加载；开关、隐私说明和建议层级清楚；无横向溢出。
- 1440×1024 小队周报：首屏可见结论、四个片段和唯一下一步；图像裁切无破图；无横向溢出。
- 390×844 孩子一问一答：问题、三个选择和跳过按钮同屏；页面无横向或纵向滚动；点击跳过不写入记录。
- 1180×820 终端模拟器：生成素材、屏幕叠加和 6 位码输入完整；没有孩子切换、开放文本框或聊天历史。
- 图片加载检查：所有当前页面 `img` 均 `complete` 且 `naturalWidth > 0`。

## 自动化证据

- `tests/e2e/assistant-v08.spec.js`
- `artifacts/visual-qa/120-assistant-parent-desktop.png`
- `artifacts/visual-qa/121-weekly-report-desktop.png`
- `artifacts/visual-qa/122-companion-question-mobile.png`
- `artifacts/visual-qa/123-terminal-simulator-desktop.png`

## 未声称通过

- M5Stack 真机烧录、物理按键手感、屏幕亮度、扬声器和麦克风采集没有硬件，不能由浏览器模拟器替代。
