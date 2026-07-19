# 🎮 Discord Presence

**Update your Discord status with a rich presence, straight from VS Code.**

📦 [**Marketplace**](https://marketplace.visualstudio.com/items?itemName=icrawl.discord-vscode) &nbsp;|&nbsp; 🧩 [**Open VSX**](https://open-vsx.org/extension/icrawl/discord-vscode) &nbsp;|&nbsp; 💬 [**Discord**](https://discord.gg/cZSWqAF) &nbsp;|&nbsp; 📄 [**MIT License**](https://github.com/iCrawl/discord-vscode/blob/master/LICENSE)

---

## 📌 About

**Discord Presence** connects VS Code to your Discord profile using Discord's Rich Presence feature. Once installed, your Discord status automatically updates to show what you're working on in real time — the file you have open, the programming language, your workspace name, and how long you've been coding.

Anyone who views your Discord profile can see your live coding activity, for example:

```
🟢 Editing README.md
   Workspace: discord-vscode
   00:12:45 elapsed
```

No manual setup is required beyond installing the extension — it detects your project, language, and editor state automatically, and updates the moment you switch files, start debugging, or go idle.

---

## ✨ Features

- 🖊️ **Live editing status** — shows the file and workspace you're currently working on
- 🌐 **200+ languages** — recognizes and displays icons for most popular programming languages
- 🗂️ **Per-workspace toggle** — enable or disable Rich Presence for individual workspaces (on by default)
- 📝 **Custom strings** — override the default status text with your own format
- 🧪 **Build detection** — distinguishes between Stable and Insiders builds automatically
- 🐞 **Debug mode detection** — shows when you're actively debugging
- 🔄 **Manual reconnect** — reconnect to Discord on demand without restarting VS Code

---

## 📦 Installation

**From the Extensions view:**
1. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for `Discord Presence`
3. Click **Install**

**From the command line:**
```bash
code --install-extension icrawl.discord-vscode
```

**Quick Open:**
```
ext install icrawl.discord-vscode
```

Also available on [Open VSX](https://open-vsx.org/extension/icrawl/discord-vscode) for VS Code–compatible editors (VSCodium, Gitpod, etc.).

---

## 🛠️ Troubleshooting

### Windows
Do **not** run VS Code or Discord as administrator. There's no reason to, and it introduces permission mismatches that block the IPC connection between the two apps.

### Linux
Discord installs from `flatpak` or `snap` sandbox the app and break IPC support, which Rich Presence relies on. Install Discord from the [official website](https://discord.com/download) instead.

**Related reports:**
- [flathub/com.discordapp.Discord#29](https://github.com/flathub/com.discordapp.Discord/issues/29)
- [iCrawl/discord-vscode#77](https://github.com/iCrawl/discord-vscode/issues/77#issuecomment-435622205)
- [iCrawl/discord-vscode#85](https://github.com/iCrawl/discord-vscode/issues/85#issuecomment-417895483)

### Status still not updating?
1. Confirm Discord is running (not just installed)
2. Run **Discord Presence: Reconnect** from the Command Palette
3. Check that Rich Presence is enabled for the current workspace in your settings
4. Restart VS Code if the connection remains stuck

---

## 🤝 Contributing

```bash
# 1. Fork the repo on GitHub, then:
git clone https://github.com/your-username/discord-vscode.git
cd discord-vscode

# 2. Create a feature branch
git checkout -b my-new-feature

# 3. Commit your changes
git commit -am "Add some feature"

# 4. Push and open a PR
git push origin my-new-feature
```

Then [open a pull request](https://github.com/iCrawl/discord-vscode/pulls) 🚀

---

## 👤 Author

**Discord Presence** © [iCrawl](https://github.com/iCrawl)
Authored and maintained by iCrawl.

[GitHub](https://github.com/iCrawl) · [Marketplace](https://marketplace.visualstudio.com/items?itemName=icrawl.discord-vscode) · [Open VSX](https://open-vsx.org/extension/icrawl/discord-vscode) · [Discord](https://discord.gg/cZSWqAF)
