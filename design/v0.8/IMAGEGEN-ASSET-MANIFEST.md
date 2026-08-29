# v0.8 ImageGen 资产清单

生成方式：OpenAI ImageGen 内置生成（非脚本渲染）。生成日期：2026-08-30。

统一美术方向：深墨蓝、观测台青绿、铜橙、羊皮纸奶油色、低饱和鼠尾草绿；真实手工质感的儿童故事绘本，不使用 emoji，不把 AI 画成机器人聊天框。

## 效果图

| 文件 | 用途 | 提示词摘要 |
| --- | --- | --- |
| `01-controlled-assistant.png` | 家长端受控助手 | 家庭观察台；AI 默认关闭；范围开关、可编辑建议、删除派生内容；桌面 1440px 产品界面 |
| `02-weekly-report.png` | 小队周报 | 家庭田野手记；四个真实生活片段；不用趋势图、百分比、排名和儿童标签 |
| `03-pocket-terminal.png` | 口袋终端与设备管理 | 午夜蓝专属终端；空白青绿屏幕；绿、黄、铜三键；一次性绑定码 |
| `04-one-question-mobile.png` | 孩子的一问一答 | 390×844；每次一个问题、三个图像选择、明确跳过；无输入框、聊天记录和分数 |

## 运行时素材

| 设计源文件 | 运行时文件 | 使用位置 |
| --- | --- | --- |
| `assets/assistant-hero.png` | `public/assets/assistant/assistant-hero.webp` | 小队助手主视觉、孩子一问一答 |
| `assets/weekly-moments-atlas.png` | `public/assets/assistant/weekly-moments-atlas.webp` | 周报四格生活片段与卡片裁切 |
| `assets/pocket-terminal-blank.png` | `public/assets/assistant/pocket-terminal.webp` | 家庭设备页、终端协议模拟器 |

运行时素材没有烧录业务文字；终端屏幕与按键语义由 HTML/CSS 叠加，便于无障碍、动态数据和不同孩子绑定。
