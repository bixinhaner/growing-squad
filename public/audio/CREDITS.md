# 成长小队音频素材

以下背景音乐均从 OpenGameArt 下载，以 CC0 1.0（公共领域贡献）发布。应用内仍保留作者与来源记录。

- `bgm/moon-clouds.m4a`：Contemplation，Joth，https://opengameart.org/content/contemplation-0
- `bgm/starry-meadow.m4a`：Calm Track，pmiller，https://opengameart.org/content/calm-track
- `bgm/moonflower-piano.m4a`：Forget Me Not，Kistol，https://opengameart.org/content/forget-me-not
- `bgm/rainy-dream.m4a`：Rizy's Sleep Music，Rizy，https://opengameart.org/content/rizys-sleep-music

原始文件已转码为适合 Safari/iPad 播放的 AAC/M4A，仅用于“成长小队”应用中的 5 分钟轻音乐。

界面操作音效由应用使用 Web Audio API 实时合成，不使用第三方采样。

`bedtime-5min/` 是上述四首 CC0 源文件的 5 分钟播放版，源文件保留在 `bgm/`。
使用 `node scripts/prepare-bedtime-audio.mjs` 在 macOS 上生成：AAC 96 kbps、
44.1 kHz 双声道，0.32 增益、2.2 秒渐入、8 秒渐出，循环接缝交叉淡化 150 毫秒。
低音量与结束点写在文件中，不依赖 iPad 网页音量控制或后台 JavaScript 定时器。
生产构建直接使用提交的音频文件，不要求服务器安装音频编码工具。
