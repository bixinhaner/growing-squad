# 电子宠物2.0美术资产

## 来自本次对话的图像

`source/` 保留三张带透明通道的原始生成图，用于后续美术维护。生成记录：

- `kawaii_pastel_plush_pet_collection.png`：`ded60566-6f76-48c4-ac3f-834309a3f558`
- `pastel_plush_animal_sprite_grid.png`：`51fcc3ff-3836-4de4-aa76-f3d50eb4740a`
- `kawaii_plush_pet_shop_sticker_sheet.png`：`1859dd47-544a-406c-8acc-258d1232e37a`

每份原图及输出的SHA-256、实际裁切坐标在 `public/assets/pets-v2/manifest.json`。图像并非第三方开源插画，不给生成图虚构CC0/MIT授权声明。它们是本次对话的生成素材；品牌化使用仍应自行做外观/权利审核。

共53份独立WebP：五个物种各六姿态（30）、五颗蛋（5）、星光与徽章（2）、五件衣服（5）、五个小屋（5）、六件家具（6）。角色和物件分别接入组件，中文文案、数字、价格、按钮都是真实界面元素，没有烧进图片。

在生成表上按真实布局裁切，移除与主体不相连的邻格碎片，归一化姿态外框并保留透明边缘。没有把带手机边框的UI效果图当作页面，也没有用分镜里的箭头/框线冒充素材。

## 重建

运行应用不需要Python。只有重新生成裁切资产时，才需要Pillow、NumPy和SciPy：

```bash
python design/pets-v2/extract-art.py
```

默认从 `design/pets-v2/source/` 读取原图，输出到 `public/assets/pets-v2/`，审查图输出到 `artifacts/pets-v2/crop-review.png`。不要修改代码里物种/物件路径而忘记同步清单和测试。

## 同源离线预览

```bash
node scripts/export-pet-art.mjs
# 或 node scripts/export-pet-v2-preview.mjs /your/output/path
```

`preview.html` 内嵌图片与同源样式，不要求联网；展示八种蛋、角色成长层次、有限动作与装扮。它只是美术/组件预览，不读写余额，不模拟已通过完整应用验收。

五种生成角色使用姿态切换、独立衣饰和有限CSS动画，成长外观通过徽饰/光圈及大小变化表达。原有三种使用分层矢量动作和年龄比例。没有声称336个组件组合是336个独立绘制的动画帧。需要连续逐帧影片或完全不同的年龄外形时仍应专门制作，而不是从当前图集推断不存在的画面。

## 开源依赖

项目已经内置的 `src/vendor/motion-mini/` 用于短面板过渡，保留MIT许可及来源说明；未引入运行时CDN或新的远程字体。

官方能力文档：https://motion.dev/docs/animate

上游许可：https://github.com/motiondivision/motion/blob/main/LICENSE.md

本次没有直接下载来历不明的第三方人物、付费商店资源或未注明许可的Lottie文件。
