# Linux systemd setup

## 1. Install and configure the bot

```bash
npm install -g reasonix-telegram-bot@latest
reasonix-telegram config
```

`config` writes the `.env` and `settings.json` into the installed app home and launches the setup wizard.

## 2. Get the required paths

```bash
which node
which reasonix
which reasonix-telegram
dirname "$(which node)"
```

Use these values in the service file:

- `<USER>`: your Linux user
- `<NODE_PATH>`: output of `which node`
- `<REASONIX_TELEGRAM_PATH>`: output of `which reasonix-telegram`
- `<NODE_BIN_DIR>`: output of `dirname "$(which node)"`

`reasonix` must be on the `PATH` given to the service: the bot starts one `reasonix serve` per project root itself. If the binary is somewhere else, set `REASONIX_SERVE_BINARY` in the bot `.env`.

## 3. Create the service file

Create `/etc/systemd/system/reasonix-telegram-bot.service`:

```ini
[Unit]
Description=Reasonix Telegram Bot
After=network.target

[Service]
Type=simple
User=<USER>
Environment=PATH=<NODE_BIN_DIR>:/usr/local/bin:/usr/bin:/bin
ExecStart=<NODE_PATH> <REASONIX_TELEGRAM_PATH> start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Run the bot in foreground mode. Do not use `--daemon` under `systemd`.

## 4. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable reasonix-telegram-bot
sudo systemctl start reasonix-telegram-bot
sudo systemctl status reasonix-telegram-bot
```

## 5. Project roots

The bot serves the roots in `REASONIX_ROOTS`, one `reasonix serve` instance each:

```env
REASONIX_ROOTS=/home/user/repo-a,/home/user/repo-b
```

When unset, it serves its own working directory. Each root gets a stable port in `47610`-`47809` with its own token; ports and tokens are persisted so a bot restart reconnects to the same instances instead of leaving orphans.

If the bot runs as a system service but you want to serve files under your home directory, grant it read access to those roots. Do not run the service as root.

## 6. View logs

```bash
sudo journalctl -u reasonix-telegram-bot -f
```

The bot also writes its own log files under `<app home>/logs` (`logs` in source mode).

## Example

This is a working example for an `nvm`-based setup:

`ExecStart` does not include `start` here because `start` is the default CLI command.

```ini
[Unit]
Description=Reasonix Telegram Bot
After=network.target

[Service]
Type=simple
User=admin
Environment=PATH=/home/admin/.nvm/versions/node/v22.23.2/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/home/admin/.nvm/versions/node/v22.23.2/bin/node /home/admin/.nvm/versions/node/v22.23.2/bin/reasonix-telegram
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```