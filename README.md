# Discord Presence
> Update your discord status with the newly added rich presence.

<div align="center">
	<p>
		<a href="https://marketplace.visualstudio.com/items?itemName=icrawl.discord-vscode"><img src="https://vsmarketplacebadge.apphb.com/version/icrawl.discord-vscode.svg" alt="VS Code Marketplace"></a>
		<a href="https://discord.gg/4aFThGU"><img src="https://discordapp.com/api/guilds/304034982475595776/embed.png" alt="Discord server" /></a>
	</p>
</div>

## Features

* Shows what you are editing in VSCode with no bullsh*t involved
* Support for over 70 of the most popular languages
* Enable/Disable Rich Presence for individual workspaces (enabled by default)
* Automatic reconnect after losing internet or a discord restart/crash (defaults to 20 reconnect attempts)
* Custom string support
* Respects Discords 15sec limit when it comes to updating your status
* Stable or Insiders build detection
* Debug mode detection

## The rich presence won't show after my PC has been put to sleep / after I lost internet!
It will only attempt to reconnect 20 times. After it hit that threshold you will have to manually enable it again.  
Just open the command pallette and execute the enable command for the extension / or reload the window.  
You can also set the reconnectThreshold in the settings to something very high, for example 9999 or Infinity to never stop trying to reconnect.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

**Discord Presence** © [iCrawl](https://github.com/iCrawl).<br>
Authored and maintained by iCrawl.

> GitHub [@iCrawl](https://github.com/iCrawl)
