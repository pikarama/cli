# Pikarama CLI

Command-line interface for [Pikarama](https://www.pikarama.com) — karma-weighted group decisions.

**✨ Interactive by default** — run commands without arguments and get beautiful select menus. Add `--json` for scripts.

## Install

```bash
npm install -g @pikarama/cli
```

## Quick start

```bash
# Interactive login
pikarama login

# Browse and select events interactively
pikarama events

# Create a poll with guided prompts
pikarama poll

# Or use non-interactive mode for scripts
pikarama events --json
pikarama poll <topic-id> "Question?" --option "A" --option "B" --json
```

## Features

- 🎨 **Interactive mode** — Select from menus, get prompted for missing info
- 📦 **JSON mode** — `--json` flag for scripting and automation
- 🔇 **Quiet mode** — `--quiet` for minimal output (just IDs)

## Commands

### Events
```bash
pikarama events                    # Interactive: browse and select
pikarama events --json             # List as JSON
pikarama events create             # Interactive: guided creation
pikarama events submit             # Interactive: select event, enter pick
pikarama events vote               # Interactive: select event & submission
pikarama events advance <id>       # Advance to next phase
```

### Polls
```bash
pikarama poll                      # Interactive: full guided flow
pikarama poll <topic> "Q?" -o A -o B   # Non-interactive
```

### Groups
```bash
pikarama groups                    # Interactive: browse groups
pikarama groups create             # Interactive: create with prompts
pikarama groups join               # Interactive: enter invite code
```

### Karma
```bash
pikarama karma                     # Show karma across all topics
pikarama karma <group-id>          # Filter by group
```

### Auth
```bash
pikarama login                     # Store API token
pikarama logout                    # Remove token
```

## Output modes

| Flag | Effect |
|------|--------|
| (default) | Interactive menus and prompts |
| `--json` | Raw JSON (non-interactive) |
| `--quiet` | Minimal output, just IDs |

## Configuration

- Token stored in `~/.pikarama/config.json`
- Get your API token at https://www.pikarama.com/settings

## API

REST API: `https://www.pikarama.com/api/v1`  
OpenAPI docs: https://www.pikarama.com/api-docs

## License

MIT
