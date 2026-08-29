# v0.7 视觉与交互验收

## 已验证视口

- iPad 横屏：1366 × 900。
- 手机竖屏：390 × 844。
- 家长桌面：1366 × 900。

## 验收结论

- 工坊首页、发现问题、第一版、测试、知识卡、第二版和家庭发布会均使用同一套 ImageGen 美术语言。
- iPad 和手机儿童页 `scrollWidth <= innerWidth`、`scrollHeight <= innerHeight`，不需要上下翻页才能找到主操作。
- 手机测试页同时可见三项测试发现、三项下一步选择、媒体入口和“把测试发现收好”。
- “失败”只出现在否定性说明“这不是失败”中；产品不产生分数、排名、连胜或惩罚。
- 照片、语音、短视频都是可选证据；先写入 IndexedDB，再尝试同步，不会因为网络断开阻断孩子推进。
- 家长知识卡只在测试产生具体问题后加入；孩子也可跳过知识卡，按自己的办法继续第二版。
- 家庭发布会按“麻烦 → 第一版 → 测试发现 → 第二版”展示过程，不把作品变成比赛。

## 自动截图证据

- `artifacts/visual-qa/110-inventor-workshop-ipad.png`
- `artifacts/visual-qa/111-inventor-discover-ipad.png`
- `artifacts/visual-qa/112-inventor-prototype-ipad.png`
- `artifacts/visual-qa/113-inventor-testing-ipad.png`
- `artifacts/visual-qa/114-inventor-parent-desktop.png`
- `artifacts/visual-qa/115-inventor-knowledge-ipad.png`
- `artifacts/visual-qa/116-inventor-iteration-ipad.png`
- `artifacts/visual-qa/117-inventor-showcase-ipad.png`
- `artifacts/visual-qa/118-inventor-testing-mobile.png`
