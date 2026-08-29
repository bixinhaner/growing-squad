# v0.7 发明家工坊 · ImageGen 素材清单

生成方式：OpenAI ImageGen 内置生成模式。所有素材均为本轮原创生成；产品代码没有使用 Emoji 充当美术素材。

## 视觉母版

统一提示词基底：儿童长期项目“发明家工坊”，高级绘本质感，手工纸板、毛毡、木材和蓝图纸组成的温暖阁楼工作室；深墨蓝、蓝图青、铜橙、羊皮纸白、暖木色；柔和自然光；清晰可信的儿童动手过程；强调发现问题、原型、测试证据、迭代和家庭分享；不出现积分、星星、排行榜、奖杯、倒计时、考试和失败惩罚；不在图中生成可读文字。

## 页面效果图

| 文件 | 用途 | 画面重点 |
| --- | --- | --- |
| `01-workshop-hub.png` | 工坊首页 | 当前项目、七步轨迹、继续入口 |
| `02-discover-problem.png` | 发现问题 | 从生活麻烦开始，不先选课程 |
| `03-prototype-one.png` | 第一版 | 安全材料、草图、可测试原型 |
| `04-testing-findings.png` | 测试发现 | 三种观察与“新线索”语言 |
| `05-knowledge-bridge.png` | 知识桥 | 只在真实问题出现后给一张知识卡 |
| `06-family-showcase.png` | 家庭发布会 | 问题、第一版、测试、第二版的完整故事 |
| `07-parent-workshop.png` | 家长区 | 过程证据、按需知识卡、媒体同步和导出 |
| `08-testing-mobile.png` | 手机测试页 | 390×844 一屏完成观察与下一步选择 |

## 运行时素材

| 源图 | 运行时文件 | 页面/状态 |
| --- | --- | --- |
| `assets/workshop-hero.png` | `public/assets/inventor/workshop-hero.webp` | 工坊首页、家长资料同步 |
| `assets/hair-washing-robot-atlas.png` | `hair-robot-problem.webp` | 发现麻烦 |
| 同上 | `hair-robot-sketch.webp` | 草图 |
| 同上 | `hair-robot-building-v1.webp` | 搭建第一版 |
| 同上 | `hair-robot-prototype-v1.webp` | 第一版原型 |
| 同上 | `hair-robot-testing.webp` | 测试 |
| 同上 | `hair-robot-clue.webp` | 新线索 |
| 同上 | `hair-robot-prototype-v2.webp` | 第二版 |
| 同上 | `hair-robot-showcase.webp` | 家庭发布会 |
| `assets/knowledge-card-atlas.png` | `knowledge-wraparound.webp` | 围住两侧 |
| 同上 | `knowledge-adjustable-band.webp` | 可调节贴合 |
| 同上 | `knowledge-water-path.webp` | 给水安排路径 |

运行时素材已转换为 WebP，并加入 Service Worker v22 预缓存；原始高分辨率 PNG 保留在 `design/v0.7/assets/`，便于后续裁切和视觉迭代。
