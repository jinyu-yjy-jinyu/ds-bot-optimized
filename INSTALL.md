# Install DS Bot

English | [中文](#安装-ds-bot)

This release is a build of the DS Bot repository at
[`jinyu-yjy-jinyu/ds-bot-optimized`](https://github.com/jinyu-yjy-jinyu/ds-bot-optimized),
which is based on [DS Bot](https://github.com/Fei2411/DS-Bot) by Fei2411 (Apache-2.0).

## 1. Desktop app (recommended)

The desktop app brings its own DeepSeek Harness, so you do not need to install DSH first.

1. On the release page, download the file for your system:
   - **Windows 10/11 (64-bit)** — `DS-Bot-<version>-win-x64.exe`
   - **macOS, Apple chip** — `DS-Bot-<version>-mac-arm64.zip`
   - **Linux** — `DS-Bot-<version>-linux-x86_64.AppImage` (any distribution) or
     `DS-Bot-<version>-linux-amd64.deb` (Debian, Ubuntu)
2. Open it and follow the installer.
   - Windows: double-click the `.exe`. It installs for the current user only and asks for no
     administrator rights.
   - macOS: unzip, drag **DS Bot** to **Applications**, then open it once.
   - Linux: `chmod +x DS-Bot-<version>-linux-x86_64.AppImage && ./DS-Bot-<version>-linux-x86_64.AppImage`,
     or `sudo apt install ./DS-Bot-<version>-linux-amd64.deb`.
3. If the system warns that the app is unsigned:
   - Windows: select **More info** → **Run anyway**.
   - macOS: open **System Settings** → **Privacy & Security** and select **Open Anyway**.
     Gatekeeper says the app is from an unidentified developer; it does not say it is damaged.
4. On the first start, the app offers to copy the Bot team from your existing DSH. It then asks
   you to set up a model (a DeepSeek account sign-in or an API key). Set one up in
   **Settings → Models**.
5. Check for updates: **Settings → About DS Bot**. Windows and the Linux AppImage update
   themselves from this repository's releases; macOS and the Linux deb open the release page.

Your team, chats and memory stay on your computer: Windows `%USERPROFILE%\.dsh\`, macOS and
Linux `~/.dsh/`. The app keeps its data in its own folder and only reads your DSH on import.

## 2. As a plugin in DSH Desktop or DSH Web

Use this when you already run DeepSeek Harness and want the Bot team inside it.

- **DSH Desktop**: in the sidebar select **Plugins** → **Add plugin**, enter `ds-bot` (in
  mainland China set **Registry** to **Mainland China mirror**), then **Install** and
  **Enable now**.
- **From this repository**: the release attaches the plugin package as `ds-bot-<version>.tgz` —
  add that file through **Add plugin**. To build it yourself instead, run
  `cd ds-bot && npm ci && npm pack`.
- **DSH Web** (needs Node.js 22.19 or later, and pnpm):

```sh
npx @deepseek-ai/dsh@0.2.2-rc.1 plugin --profile web add ds-bot
npx @deepseek-ai/dsh@0.2.2-rc.1 web
```

Set up at least one model in DSH first: DS Bot uses the models DSH serves.

## 3. Build from source

```sh
git clone https://github.com/jinyu-yjy-jinyu/ds-bot-optimized.git
cd ds-bot-optimized/ds-bot
npm ci
npm run harness     # the DSH packages the tests and the linter load
npm run build       # regenerate client.js from src/client
npm test
npm run lint
```

The desktop app is built from `app/`:

```sh
cd ../app
npm ci
node scripts/seed-electron-checksums.mjs
npm run dist        # writes dist-pack/DS-Bot-<version>-win-x64.exe (and the platform package)
```

## 4. Checksums

Every release carries `SHA256SUMS.txt`. To check a download:

```sh
# Windows (PowerShell)
Get-FileHash .\DS-Bot-<version>-win-x64.exe -Algorithm SHA256
# macOS / Linux
shasum -a 256 DS-Bot-<version>-mac-arm64.zip
```

---

# 安装 DS Bot

本发行版来自 [`jinyu-yjy-jinyu/ds-bot-optimized`](https://github.com/jinyu-yjy-jinyu/ds-bot-optimized)
仓库，基于 Fei2411 的 [DS Bot](https://github.com/Fei2411/DS-Bot)（Apache-2.0）。

## 1. 桌面应用（推荐）

桌面应用自带 DeepSeek Harness，不需要先安装 DSH。

1. 在 Release 页面下载对应系统的文件：
   - **Windows 10/11（64 位）** — `DS-Bot-<版本>-win-x64.exe`
   - **macOS（Apple 芯片）** — `DS-Bot-<版本>-mac-arm64.zip`
   - **Linux** — `DS-Bot-<版本>-linux-x86_64.AppImage`（各发行版通用）或
     `DS-Bot-<版本>-linux-amd64.deb`（Debian、Ubuntu）
2. 打开并按提示安装。
   - Windows：双击 `.exe`。只装给当前用户，不需要管理员权限。
   - macOS：解压后把 **DS Bot** 拖进「应用程序」，然后打开一次。
   - Linux：`chmod +x DS-Bot-<版本>-linux-x86_64.AppImage && ./DS-Bot-<版本>-linux-x86_64.AppImage`，
     或 `sudo apt install ./DS-Bot-<版本>-linux-amd64.deb`。
3. 如果系统提示应用未签名：
   - Windows：点 **更多信息** → **仍要运行**。
   - macOS：打开 **系统设置** → **隐私与安全性**，点 **仍要打开**。Gatekeeper 提示的是
     「未识别的开发者」，不是「已损坏」。
4. 第一次打开时，应用会问你要不要从已有的 DSH 复制 Bot 团队。之后会让你配置模型
   （DeepSeek 账号登录或 API key），在 **设置 → 模型** 里配置。
5. 检查更新：**设置 → 关于 DS Bot**。Windows 和 Linux AppImage 会从本仓库的 Release
   自动更新；macOS 和 Linux deb 会打开 Release 页面。

团队、对话和记忆都留在你自己的电脑上：Windows 是 `%USERPROFILE%\.dsh\`，macOS 和 Linux 是
`~/.dsh/`。桌面应用把数据放在自己的目录里，导入时只读取你的 DSH。

## 2. 作为 DSH 插件安装

已经装了 DeepSeek Harness、想把 Bot 团队装进 DSH 时用这种方式。

- **DSH Desktop**：侧栏选 **插件** → **添加插件**，填 `ds-bot`（中国大陆把**源**切到
  **中国大陆镜像**），然后**安装**并**立即启用**。
- **从本仓库安装**：Release 里附带了插件包 `ds-bot-<版本>.tgz`，直接用**添加插件**装入即可；
  也可以自己构建：`cd ds-bot && npm ci && npm pack`。
- **DSH Web**（需要 Node.js 22.19 或更高，以及 pnpm）：

```sh
npx @deepseek-ai/dsh@0.2.2-rc.1 plugin --profile web add ds-bot
npx @deepseek-ai/dsh@0.2.2-rc.1 web
```

DSH 里要先配好至少一个模型：DS Bot 用的是 DSH 提供的模型。

## 3. 从源码构建

```sh
git clone https://github.com/jinyu-yjy-jinyu/ds-bot-optimized.git
cd ds-bot-optimized/ds-bot
npm ci
npm run harness     # 测试和 linter 需要的 DSH 包
npm run build       # 由 src/client 重新生成 client.js
npm test
npm run lint
```

桌面应用在 `app/` 里构建：

```sh
cd ../app
npm ci
node scripts/seed-electron-checksums.mjs
npm run dist        # 产出 dist-pack/DS-Bot-<版本>-win-x64.exe（以及当前平台的包）
```

## 4. 校验

每个 Release 都带 `SHA256SUMS.txt`。校验下载文件：

```sh
# Windows (PowerShell)
Get-FileHash .\DS-Bot-<版本>-win-x64.exe -Algorithm SHA256
# macOS / Linux
shasum -a 256 DS-Bot-<版本>-mac-arm64.zip
```
