# 健康数据：GitHub Pages 部署指南

本项目是纯静态 PWA，无需后端服务器。GitHub Pages 托管应用文件，血压和心率记录只保存在使用者设备的本地数据库中，不上传 GitHub。

## 一、仓库与站点地址

- GitHub 仓库：https://github.com/regaljerry/health
- Git 远程地址：`https://github.com/regaljerry/health.git`
- 默认部署网址：https://regaljerry.github.io/health/
- 部署工作流：[.github/workflows/deploy.yml](.github/workflows/deploy.yml)

部署网址须在工作流成功后才能访问；如已配置自定义域名，以部署任务实际输出的网址为准。

## 二、启用 GitHub Pages

1. 打开 GitHub 上的 `regaljerry/health` 仓库，确认你有管理权限。
2. 进入 **Settings → Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
4. 如果仓库禁用了 Actions，先在 **Settings → Actions → General** 中允许运行项目所需的工作流和 Actions。

不需要选择 `gh-pages` 分支，不需要手动上传 `dist`。当前工作流会自动构建并发布。

如果看不到 Pages 设置，请检查仓库权限及 GitHub 账号套餐是否支持当前仓库的 Pages 功能。公开仓库通常可使用免费 Pages；私有仓库的可用性取决于套餐。

## 三、检查本地 Git 配置

在 VS Code 中打开项目，在 PowerShell 终端逐行执行：

```powershell
git init
git branch -M main
git add .
git commit -m "Initial daycare ledger"
git remote add origin https://github.com/YOUR_NAME/daycare-ledger.git
git push -u origin main
```

> Note:

```powershell
git status
git branch --show-current
git remote -v
```

当前项目已将 `origin` 配置为 `https://github.com/regaljerry/health.git`，无需再次执行 `git remote add origin`。

如果已有 `origin`，但地址不正确，使用：

```powershell
git remote set-url origin https://github.com/regaljerry/health.git
git remote -v
```

仅在没有 `origin` 时使用：

```powershell
git remote add origin https://github.com/regaljerry/health.git
```

如果 `git status` 提示当前目录不是 Git 仓库，先确认已进入项目根目录。只有首次初始化新项目时才执行 `git init`；不要在错误目录中初始化。

## 四、提交并推送代码

先检查待提交文件，确保没有个人健康数据备份、密钥或其他不应公开的内容，再逐行执行：

```git
git add .
git commit -m "Deploy health data PWA"
git push origin main
```

> Note:



```powershell
git status
git add .
git diff --cached --stat
git commit -m "Deploy health data PWA"
git branch -M main
git push -u origin main
```

- 如果当前没有待提交的变更，跳过 `git commit`，继续推送已有提交即可。
- `git branch -M main` 用于将当前分支命名为 `main`。本项目工作流只自动监听 `main`；如果你有意使用其他分支，应先调整工作流，不要随意改名已有协作分支。
- 首次推送可能需要完成 GitHub 登录，请在 Git 或浏览器弹出的认证流程中操作，不要将密码或令牌写入代码、文档或聊天。
- 首次推送到远程空仓库前，本地至少需要一个提交。

## 五、查看或手动触发部署

推送到 `main` 后，工作流会自动启动。也可以手动运行：

1. 打开仓库 **Actions** 页面。
2. 选择左侧 **Deploy to GitHub Pages**。
3. 点击 **Run workflow**，选择 `main` 分支并确认。
4. 等待 `build` 和 `deploy` 两个任务全部成功。
5. 打开部署结果或 `github-pages` 环境中显示的站点地址。

如果没有看到工作流或 **Run workflow** 按钮，确认工作流文件已提交到仓库默认分支，且 Actions 已启用。

工作流自动执行以下步骤：

1. 使用 Node.js 22，通过 `npm ci` 安装锁定版本的依赖。
2. 执行 `npm test`、`npm run lint`。
3. 生成主屏幕图标，构建应用、PWA 清单和 Service Worker。
4. 安装 Chromium / WebKit，执行浏览器测试。
5. 上传 `dist`，发布到 GitHub Pages。

工作流通过 `actions/configure-pages` 获取真实站点子路径，再传给构建和浏览器测试。对于本仓库，默认路径为 `/health/`，无需将代码中的路径手动改为 `/health/`，也不要修改生成后的 `dist` 文件。

## 六、在 iPhone 添加到主屏幕

1. 使用 iPhone 的 **Safari** 打开 https://regaljerry.github.io/health/ 。
2. 首次访问保持联网，等待“离线资源已就绪”的提示。
3. 点击 Safari 的 **分享 → 添加到主屏幕**。
4. 确认名称为 **健康数据**，点击添加。
5. 从主屏幕打开应用，分别保存早晨和晚间记录，关闭后重新打开，确认记录仍在。
6. 开启飞行模式，再次打开应用并录入记录，确认离线可用。

首次安装和资源缓存需要联网；仅开启本地开发服务器并不能让 iPhone 安装正式应用。自动化 WebKit 测试不能替代以上真机验收。

## 七、数据备份与版本更新

### 数据迁移与备份

- 本地预览地址的数据不会自动迁移到正式网址。先在原应用的“备份与应用信息”中导出 JSON，再在正式应用中导入。
- 建议添加到主屏幕后，在主屏幕应用内正式录入；Safari 和主屏幕应用的存储行为可能因 iOS 版本而不同。
- 清除网站数据、卸载应用、换设备、系统存储回收或更换域名可能导致无法访问原记录，请定期导出 JSON 备份。
- CSV 用于查看或统计，恢复数据请使用 JSON。备份包含明文健康信息，请妥善保管，不要提交到 GitHub 仓库。

### 更新应用

后续修改代码后，检查并提交本次改动，再推送到 `main`，会自动重新部署：

```powershell
git status
git add .
git diff --cached --stat
git commit -m "Update health data app"
git push origin main
```

部署完成后联网打开应用。如果出现“新版本已就绪”，先结束当前录入，再点击“更新应用”。正常更新不会主动清空本地记录，但仍建议提前备份。

## 八、常见问题

### `error: remote origin already exists`

说明 `origin` 已存在，不要重复添加。执行 `git remote -v` 查看地址；需要修改时使用 `git remote set-url origin`，具体命令见第三节。

### `src refspec main does not match any`

执行 `git status`、`git branch --show-current` 和 `git log -1`，检查是否已有提交以及分支是否叫 `main`。完成首次提交并确认分支后再推送。

### 推送被拒绝：`non-fast-forward` 或 `fetch first`

远程存在本地尚未包含的提交。先执行 `git fetch origin` 并检查双方历史，再按实际情况合并或变基；不要直接使用强制推送覆盖远程内容。

### `Repository not found` 或认证失败

检查 `health` 仓库是否已在 GitHub 创建、远程地址是否正确，以及当前登录账号是否有推送权限。

### Actions 构建或测试失败

进入 **Actions → 失败的运行 → 失败的任务 / 步骤**，查看第一条错误。只有构建和测试通过才会发布。修复后推送新提交，或在适合时使用 **Re-run jobs**。

### Pages 配置失败或站点显示 404

确认 **Settings → Pages → Source** 已选择 **GitHub Actions**，并检查 `deploy` 任务是否成功。使用完整地址 `https://regaljerry.github.io/health/`，不要遗漏仓库路径；以成功部署输出的网址为准。

### 页面仍显示旧名称或旧样式

先确认最新提交的部署成功，再联网重开应用并检查更新提示。Service Worker 可能暂时继续使用旧缓存；不要为更新界面而直接清除网站数据，这可能同时删除健康记录。确需清理前，务必先导出 JSON 备份。