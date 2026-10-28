# 健康数据

面向 iPhone Safari / 主屏幕安装的血压记录 PWA。纯静态前端，可部署到 GitHub Pages，无后端、无账号、无健康数据上传。

## 功能

- 每天早晨、晚间各一条记录，包含高压、低压（mmHg）和心率（次/分钟）。同一天同时段编辑替换，不新增重复记录。
- 选择历史日期补录，支持修改和确认删除，不允许未来日期。
- 早晨及晚间的高压 / 低压曲线；早晚高压、低压、心率对比；每日早晚平均血压概览。
- 近 7 天、近 30 天及自定义日期范围；平均值、最低值、最高值、记录天数；历史明细及时段筛选。
- IndexedDB 本地保存，JSON 备份导入 / 导出，CSV 导出；缺测不按零计算，曲线在缺测处断开。
- 联网访问并完成资源缓存后离线可用。应用有新版本时显示更新按钮，不在编辑期间强制刷新。

## 开发

需要 Node.js 22.18+ 和 npm。

```sh
npm ci
npm run dev
```

开发地址以终端实际输出为准，默认 http://localhost:5173/。开发模式不启用 Service Worker；离线功能须使用生产预览或 HTTPS 部署地址验证。所有依赖和图标打包在应用内，没有外部字体、图表 API 或分析追踪服务。

## 验证

```sh
npm test
npm run lint
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

数据测试覆盖校验、唯一记录、备份、缺测统计及 IndexedDB 事务。浏览器测试覆盖 Chromium 桌面、iPhone 尺寸的 WebKit、录入编辑删除、导入导出、曲线、320–1440px 布局和无外部请求。离线网络模拟仅在 Chromium 执行，WebKit 对应项跳过。截图和失败追踪位于 test-results/，不会提交仓库。

生产预览：

```sh
npm run build
npm run preview
```

模拟 GitHub Pages 项目子路径（PowerShell，命令逐行运行）：

```powershell
$env:BASE_PATH = '/P015_iOS_Record/'
npm run build
npm run test:e2e
npm run preview
```

预览地址为 http://localhost:4173/P015_iOS_Record/。恢复根路径时先运行 `Remove-Item Env:BASE_PATH`，再重新构建。

## GitHub Pages 部署

1. 在 GitHub 新建仓库，将本项目提交并推送到 `main` 分支，不要上传个人健康备份文件。
2. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 推送到 `main`，或在 **Actions → Deploy to GitHub Pages → Run workflow** 手动触发。
4. 流水线安装依赖、运行数据测试和检查、生成图标及 PWA、执行 Chromium / WebKit 浏览器测试，通过后部署 `dist`。
5. 在成功的部署任务中查看站点网址，通常为 `https://用户名.github.io/仓库名/`。

工作流通过 `actions/configure-pages` 获取真实 base_path，自动适配仓库子路径、用户主页仓库与配置过的自定义域名。不要手动修改构建产物里的路径。若默认分支不是 `main`，须调整工作流的触发分支。GitHub Pages 必须允许当前仓库和账号使用，仓库 Actions 也必须启用。

当前项目仅准备部署配置，不会自行创建远程仓库或提交、推送代码。

## iPhone 安装和验收

1. 用 iPhone Safari 打开正式 HTTPS 地址，等待资源缓存完成提示。
2. 点按“分享 → 添加到主屏幕”，确认名称“健康数据”。
3. 从主屏幕启动，确认应用独立窗口、图标、顶部及底部安全区域。
4. 分别保存一条早晨和晚间记录，关闭重开，确认数据仍在。
5. 开启飞行模式，再次打开并保存记录，确认离线可用。
6. 在“备份与应用信息”导出 JSON 到“文件”，再验证导入；备份请另行妥善保管。

自动化 WebKit 测试不等于 iPhone 真机验证。Safari 与主屏幕应用的存储隔离和生命周期可能随 iOS 版本变化，建议安装后在主屏幕应用内正式录入；切换环境前先导出备份。

## 数据与隐私边界

- 健康记录仅存放于当前浏览器环境的 IndexedDB，不进入 GitHub 仓库、Pages 服务器或 Service Worker 资源缓存。Pages 只托管应用静态文件，但像其他托管商一样可能处理普通网页请求日志。
- 本地数据不等于永久备份。清除网站数据、卸载、系统存储回收、换手机或改变站点域名均可能导致无法访问原记录。应用尝试申请持久存储，但是否批准由浏览器决定。
- JSON 导入验证全部记录后在同一事务中合并；同日期、同时段的冲突在确认后以备份内容覆盖。CSV 只供查看，不作为恢复格式。
- 本地数据库与备份未单独加密，请保护设备访问权限，不要把备份提交到公开仓库。
- 早晚记录没有自动时间限制，便于补录；不含后台提醒、系统健康同步或自动测量功能。
- 数值校验仅用于防止明显录入错误，不代表医学正常范围。应用不作诊断、用药建议或替代医护指导。
