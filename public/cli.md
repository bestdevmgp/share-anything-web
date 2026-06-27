# ShareAnything CLI

ShareAnything is a file-sharing service: upload a file and share it with others via a short code or link.

Share files from your terminal. Install the CLI via npm, or use curl to get started instantly.

## Install and use (Recommended)

**Install via npm**
```sh
npm i -g share-anything-cli
```

**Install via script**
```sh
curl -fsSL share-api.mingyu.dev/install | sh
```

**Use the TUI** — Access every CLI feature through the TUI without typing any commands.
```sh
share
```

**Upload a file** — To upload multiple files, separate them with spaces (e.g. `share upload a.txt b.png`). You can use file paths instead of just names (e.g. `share upload ./docs/a.txt`).
```sh
share upload myfile.txt
```

**Secure transfer (P2P)** — Files are sent directly to the receiver without being stored on the server. Both parties must be online.
```sh
share upload --secure myfile.txt
```

**View upload history** (authentication required)
```sh
share list
```

**Download a file** — Add a path after the code to choose where to save (e.g. `share download 123456 ./downloads/`).
```sh
share download 123456
```

**Check file info before downloading**
```sh
share info 123456
```

**Sign in via browser** — Sign in directly from your browser without a token.
```sh
share login
```

**Sign in with a Personal Token**
```sh
share login sat_your_token_here
```

**Remove the saved Personal Token**
```sh
share logout
```

## Quick start with curl

No installation needed. Use curl to upload and download files.

**Upload a file** — `@./myfile.txt` can be a relative or absolute path (e.g. `@./photo.png` or `@/home/user/file.txt`).
```sh
curl -F 'file=@./myfile.txt' https://share-api.mingyu.dev/cli/uploads
```

**Download a file**
```sh
curl -OJ https://share-api.mingyu.dev/cli/shares/123456/download
```

**Upload multiple files**
```sh
curl -F 'file=@./file1.txt' -F 'file=@./file2.png' https://share-api.mingyu.dev/cli/uploads
```

**Upload with a Personal Token (set expiration)**
```sh
curl -H 'X-Personal-Token: sat_your_token_here' -F 'file=@./myfile.txt' -F 'expiration=1h' https://share-api.mingyu.dev/cli/uploads
```

## Upload options

Options available when uploading with a Personal Token.

| Option | curl | share-cli | Values |
| --- | --- | --- | --- |
| Expiration | `-F 'expiration=1h'` | `--expires 1h` | 5m, 30m, 1h, 3h, 6h, 12h, 24h |
| Password protection | `-F 'password=secret'` | `--password secret` | Any string |
| One-time download | `-F 'is_one_time=true'` | `--one-time` | - |
| Secure transfer (P2P) | - | `--secure` | - |

All options above require a Personal Token. Without one, files expire in 30 minutes with no additional options.

## Guest vs Signed-in User

| Feature | Guest | Signed-in User |
| --- | --- | --- |
| Max file size | 10GB / day | 1TB / day |
| Expiration | 30m | 5m ~ 24h |
| Password protection | - | ✓ |
| One-time download | - | ✓ |
| Upload history | - | ✓ |

---

Web app & docs: https://share-api.mingyu.dev/cli
