# YurbaEmojiPicker

Renders Noto Color Emoji (Google) from PNG files loaded from CDN. Features lazy pagination, dynamic category tabs, search, skin tone variant popups, and support for custom emojis.

## Installation

```html
<link rel="stylesheet" href="/dist/yurba-ep.min.css">
<script src="/dist/yurba-ep.min.js"></script>
```

## Build

```bash
npm install
npm run build
```

Output: `dist/yurba-ep.min.js`, `dist/yurba-ep.min.css`

## Usage

The picker is created entirely from JavaScript via the static `YurbaEP.create()` factory — no HTML markup needed. It appends itself to `document.body` and returns the element.

## API

### Static

| Method | Description |
|---|---|
| `YurbaEP.create(config)` | Create and mount a picker. Returns the element. |

**Config options:**

| Key | Type | Default | Description |
|---|---|---|---|
| `title` | string | `'Pick an emoji'` | Header text |
| `emojiJson` | string | Yurba CDN | URL to emoji JSON |
| `notoBase` | string | Yurba CDN | Base URL for Noto PNG files |
| `groupHtml` | object | built-in icons | Category icon overrides |
| `insertImage` | boolean | `false` | Insert `<img>` into `contenteditable` on selection |
| `customEmojis` | array | `[]` | Custom emoji categories |

### Instance

| Method | Description |
|---|---|
| `bind(button, input)` | Attach a trigger button and target field (`input`, `textarea`, or `contenteditable`). Clicking the trigger again while open closes the picker. |
| `open()` | Show the picker |
| `close()` | Hide the picker |
| `selectTab(tabId)` | Switch to a category tab by ID |

## Events

All events bubble. `yurba-ep.*` events fire on the picker element; `yurba-ep.select` fires on the bound field.

| Event | Fired on | Detail |
|---|---|---|
| `yurba-ep.select` | bound field | `{ code, shortcode, src, animated }` |
| `yurba-ep.open` | picker element | — |
| `yurba-ep.close` | picker element | — |
| `yurba-ep.load` | picker element | `{ count }` |

`yurba-ep.select` always fires (non-cancelable) whenever an emoji is selected, regardless of `insertImage`.

## Insertion behavior

- `<input>` / `<textarea>` — inserts `:code:` shortcode at caret.
- `contenteditable` + `insertImage: true` — inserts `<img alt=":code:" data-emoji="code">` at caret.
- `contenteditable` + `insertImage: false` — inserts nothing; handle via `yurba-ep.select`.

## CSS variables

```css
:root {
    --y-ep-bg:        #ffffff;
    --y-ep-secondary: #f2f2f7;
    --y-ep-text:      #000000;
    --y-ep-accent:    #007aff;
}
```

See [demo](https://yurba-dev.github.io/yurba-ep/) for full documentation.
