# v1.0 视觉与交互验收

## 验收目标

- 家长不需要理解数据库、队列或校验术语，也能判断记录是否安全以及下一步做什么。
- “全部安全”必须同时有本地保存和可恢复副本作为事实依据；云端模式还必须通过同步、每日备份和文件校验。
- 高风险删除不出现在日常主界面，展开后仍需重新校验家长 PIN。
- 生成主视觉在桌面、iPad 和手机上均保持主体可见，业务信息始终由可访问的前端文字呈现。

## 自动化证据

- `tests/e2e/guardian-v10.spec.js`
- `artifacts/visual-qa/130-family-guardian-desktop.png`
- `artifacts/visual-qa/131-family-guardian-ipad.png`
- `artifacts/visual-qa/132-family-guardian-mobile.png`

## 运行时验证

- 服务端集成测试会实际打开 SQLite 主库和最新每日备份并执行 `quick_check`。
- 守护接口仅家长会话可读写，检查动作不会修改孩子任务、星光和成长记录。
- 离线云端家庭禁止执行永久删除，避免因无法重新校验 PIN 而误删。
