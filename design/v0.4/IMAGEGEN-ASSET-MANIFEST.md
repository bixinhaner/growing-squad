# 运动小队 v0.4 · ImageGen 资产清单

## 视觉基准

- `child-movement-choice-ipad.png`：孩子二选一页；约束单屏层级、左右构图和三种退路。
- `child-movement-ready-ipad.png`：活动准备页；约束三步图示、安全提醒和主按钮。
- `child-movement-active-ipad.png`：低注意力活动页；约束不显示计时、热量、积分和排名。
- `child-movement-feedback-ipad.png`：回来反馈页；约束只问“还想玩 / 刚刚好 / 有点难”。
- `child-energy-plaza-ipad.png`：能量广场；约束展示体验记忆而非运动量。
- `parent-movement-desktop.png`：家长页；约束自主选择、真实感受和雨天推荐。

## 生产素材母版

全部母版由 ImageGen 直接生成，统一提示词主干为：

> Premium handcrafted miniature felt-and-soft-clay children's picture-book illustration, warm ivory backdrop, midnight navy, moonlight lavender, amber yellow, sage green, soft studio lighting, rounded friendly forms, consistent small blue robot companion. No words, no letters, no numbers, no symbols, no UI, no emoji, no watermark.

- `assets/activity-atlas-01.png`：气球不落地、机器人舞会、毛巾隧道、袜子球投篮。
- `assets/activity-atlas-02.png`：动物跳跳队、平衡小路、颜色反应站、机器人送货。
- `assets/activity-atlas-03.png`：骑车找颜色、滑板车绕桩、公园寻宝跑、家庭接力。
- `assets/activity-atlas-04.png`：跳房子、双人跳绳、软包接接乐、小球传递站。
- `assets/activity-atlas-05.png`：低低攀爬线、单脚小雕像、影子追追跑、树桩小探险。
- `assets/energy-plaza-hero.png`：能量广场夜景，包含平衡、跳跃、投掷与家庭协作区域。
- `assets/balloon-active-hero.png`：气球不落地的低注意力活动场景。

## 应用映射

母版按固定四宫格无再创作裁切为 20 张 `640×640` WebP，位于 `public/assets/movement/`。两张宽幅场景分别输出为：

- `energy-plaza-hero.webp`：孩子选择页左景和能量广场。
- `balloon-active-hero.webp`：气球活动进行页。

生产页面不使用 Emoji 作为图标或插画；功能图标使用应用现有 SVG 系统，美术图像全部来自以上 ImageGen 母版。
