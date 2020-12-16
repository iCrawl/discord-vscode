# Changing Title and Images (aka changing client)

Visit [the Discord Developers portal](https://discord.com/developers/applications) and create a new application. Call it like you want the title to appear in Discord.

## Uploading Assets

In the [repo](https://github.com/icrawl/discord-vscode) there is a folder `assets/art`. Download it (or clone the repo, or whatever), edit all the images you need. `vscode-big` is the big image shown when idling instead of the language icon, `vscode` (or `vscode-insiders` if your build registers as an Insiders build) is the small icon shown bottom-right (`debug` is shown while debugging) and all the other ones are just the file types. Upload all of the assets (the PNGs!) in the folder in the "Rich Presence/Art Assets" section in the Discord portal. Save, wait a couple minutes and refresh the asset page. If you see zero assets, wait again and reload.

## Applying

Copy the "client ID" from the app's main page and set it as the Visual Studio Code setting `"discord.clientID"`.

Depending on your PC, you might have to just reload your VSCode instance, restart the Discord client or even the whole PC (potentially after every art change) before seeing changes for your rich presence. If anyone else uses your CID, you should be able to see all changes instantly.

## Pre-build Client IDs

- Default client (shows as _Visual Studio Code_): `383226320970055681`
- VSCodium: `788336694289891358`

<small>Created a client and want to share it with the world? Open a pull request or an issue!</small>

## Credit

As the icons used by the extension are currently unavailable, all the file type icons are from the awesome [vscode-icons](https://github.com/vscode-icons/vscode-icons) project while the idle and debug icons are from the equally awesome [Bootstrap Icons](https://icons.getbootstrap.com),both licensed under the MIT license.
