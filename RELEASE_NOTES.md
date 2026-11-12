# What's new

The release notes the release workflow puts under the download table, after `INSTALL.md`.
Rewrite this file for the version being released; the tag keeps the version it was written for.

## 0.4.0

### Work groups with their own working folder

Sidebar sections are now work groups. Give a group a working folder and every Bot in it works
there by default, so you no longer set the folder Bot by Bot.

- A new group starts in a new folder inside the team workspace and is registered as a DSH
  workspace; a group can also use the team workspace or an existing folder.
- A single Bot or a group chat can still work somewhere else: the Bot's own folder wins over the
  group's, and a group chat's folder wins over both.
- Changing a group's folder moves its idle conversations to a fresh part right away, and a
  running turn moves at its next step. Files in the old folder stay where they are.
- Settings → **Work groups** sets the team workspace, creates and removes groups, picks each
  group's folder, and ticks which Bots belong to it.

### Set one model on several Bots at once

Settings → **Bot models** lists every Bot with the model it runs on now. Tick several Bots and
apply one model to all of them in a single step. Bots that run on a local agent CLI are skipped
and listed: their model belongs to that CLI and changes in the Bot's own settings.

### Also changed

- The desktop app checks for updates and opens the release page at this repository.
- The release workflow here builds and attaches the installers, the plugin package, the
  checksums and `INSTALL.md`.
- This is version 0.4.0 of a build based on [Fei2411/DS-Bot](https://github.com/Fei2411/DS-Bot);
  everything else is unchanged.

### 工作分组各有工作区

侧边栏的分组现在就是工作分组。给一个分组指定工作文件夹，组里的所有 Bot 默认都在那里干活，
不用再一个个设置。

- 新建分组时会在总工作区里为它新建一个文件夹，并注册成 DSH 工作区；分组也可以沿用总工作区
  或改指到已有目录。
- 单个 Bot 或群聊仍然可以另选目录：Bot 自己的目录优先于分组目录，群聊自己的目录优先级最高。
- 改分组目录时，空闲的会话立刻换到新目录，正在跑的回合在下一步换；旧目录里的文件不动。
- 设置 → **Work groups** 里可以设置总工作区、新建和删除分组、指定每个分组的文件夹，并勾选
  哪些 Bot 属于它。

### 一次给多个 Bot 设置模型

设置 → **Bot models** 会列出每个 Bot 当前用的模型。勾选多个 Bot，一次把它们都设成同一个
模型。跑在本地 agent CLI 上的 Bot 会被跳过并列出：它的模型属于那个 CLI，要在它自己的设置里改。

### 其它改动

- 桌面应用的更新检查和发布页现在指向本仓库。
- 本仓库的发行工作流会构建并附上安装包、插件包、校验文件和 `INSTALL.md`。
- 这是基于 [Fei2411/DS-Bot](https://github.com/Fei2411/DS-Bot) 的 0.4.0 构建，其余功能不变。
