# Pikarama CLI

Command-line interface for [Pikarama](https://www.pikarama.com) - karma-weighted group decision making.

> 🚧 **Coming Soon** - This CLI is under development. See [issue #59](https://github.com/musketyr/pikarama/issues/59) for the roadmap.

## Quick Start

```bash
# Install
npm install -g @pikarama/cli

# Login (get token from pikarama.com/settings)
pikarama login

# Create a poll
pikarama poll <topic-id> "Where should we eat?" --option "Thai" --option "Sushi" --option "Pizza"

# List your events
pikarama events

# Vote on an event
pikarama vote <event-id> <submission-id>
```

## Commands

| Command | Description |
|---------|-------------|
| `pikarama login` | Store your API token |
| `pikarama groups` | List your groups |
| `pikarama events` | List active events |
| `pikarama poll` | Create a quick poll |
| `pikarama karma` | View your karma |

## API

This CLI uses the Pikarama REST API. Get your API token at [pikarama.com/settings](https://www.pikarama.com/settings).

API documentation: https://www.pikarama.com/api-docs

## License

MIT
