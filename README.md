# YurbaEmojiPicker

Renders Noto Color Emoji (Google) from PNG files. Features lazy pagination, dynamic category tabs, search, skin tone variant popups, and support for custom emojis.

## Installation

```html
<link rel="stylesheet" href="/dist/yurba-ep.min.css">
<script src="/dist/yurba-ep.min.js"></script>
```

This is the standalone build. On a page with YurbaUI use the `.ui` build, see [Builds](#builds).

## Builds

Two builds with the same API. They differ only in how the picker is shown on a small screen.

| Build | Files | Made of | On a small screen |
|---|---|---|---|
| `yurba-ep` | `dist/yurba-ep.min.js`, `dist/yurba-ep.min.css` | `yurba-ep.js`; `yurba-ep.css` + `yurba-ep.standalone.css` | No dependencies. Up to 1280px wide the standalone CSS pins the popup to the bottom edge at full width |
| `yurba-ep.ui` | `dist/yurba-ep.ui.min.js`, `dist/yurba-ep.ui.min.css` | `yurba-ep.js` + `yurba-ep.ui.js`; `yurba-ep.css` + `yurba-ep.ui.css` | Up to 768px wide the picker opens in a `YurbaUI.Modal` sheet, closing the sheet closes the picker. Wider, the same floating popup as the standalone build |

Standalone:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0">
<link rel="stylesheet" href="/dist/yurba-ep.min.css">
<script src="/dist/yurba-ep.min.js"></script>
```

With YurbaUI:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0">
<link rel="stylesheet" href="/dist/yurba-ui.min.css">
<link rel="stylesheet" href="/dist/yurba-ep.ui.min.css">
<script src="/dist/yurba-ui.min.js"></script>
<script src="/dist/yurba-ep.ui.min.js"></script>
```

- The `.ui` build checks for the `YurbaUI` global each time the picker opens. Without it the picker stays a floating popup on a phone too, and this build has no bottom pinning of its own.
- Both builds draw the close, search and category icons with Material Symbols Rounded, so the page loads that font (any of them can be replaced with `icons` and `groupHtml`, see [Icons](#icons)).
- Colors follow the Yurba theme variables (`--yurba-main-color`, `--yurba-brand-color` and others) when the page defines them.

## Build

```bash
npm install
npm run build
```

Output: `dist/yurba-ep.min.js`, `dist/yurba-ep.min.css` (standalone) and `dist/yurba-ep.ui.min.js`, `dist/yurba-ep.ui.min.css` (for pages with YurbaUI: on a phone the picker opens in its sheet)

## Usage

The picker is created entirely from JavaScript via the static `YurbaEP.create()` factory - no HTML markup needed. It appends itself to `document.body` and returns the element.

## API

### Static

| Method | Description |
|---|---|
| `YurbaEP.create(config)` | Create and mount a picker. Returns the element. |

**Config options:**

| Key | Type | Default | Description |
|---|---|---|---|
| `title` | string | `'Pick an emoji'` | Header text |
| `closeLabel` | string | `'Close'` | Accessible name of the close button |
| `allLabel` | string | `'All'` | Accessible name of the "all" category tab |
| `searchLabel` | string | `'Search...'` | Placeholder and accessible name of the search field |
| `emojiJson` | string | `https://cdn.yurba.one/static/emoji/noto/emoji.json` | URL to emoji JSON |
| `notoBase` | string | `https://cdn.yurba.one/static/emoji/noto/png/` | Base URL for Noto PNG files |
| `groupHtml` | object | built-in icons | Tab icons of named groups, see [Icons](#icons) |
| `icons` | object | built-in icons | Close, search, "all" tab and fallback tab icons, see [Icons](#icons) |
| `insertImage` | boolean | `false` | Insert `<img>` into `contenteditable` on selection |
| `customEmojis` | array | `[]` | Custom emoji categories, see [Animated custom emoji](#animated-custom-emoji) |
| `lottie` | object | `window.lottie` | The [lottie-web](https://github.com/airbnb/lottie-web) module, when it is imported rather than loaded as a global |

By default `emojiJson` and `notoBase` point to the Yurba CDN, which lets any site load them. Pass both to serve the emoji from your own server.

### Animated custom emoji

A custom emoji is `{ id, src, keywords?, animated?, still? }`. With `animated: true` its `src` is a Lottie JSON file, and the picker shows it still, on its first frame, so the grid stays calm. Playing it where it is used is up to the page: the `yurba-ep.select` event says `animated`.

lottie-web is optional. When it is on the page (the `lottie` global, or the `lottie` option) the picker draws the first frame from the JSON. Without it the picker shows `still`, a plain picture of that frame, and an animated emoji with no `still` is left out of the picker.

```js
YurbaEP.create({
    customEmojis: [{
        id: 'yurba', name: 'Yurba', html: '<span class="material-symbols-rounded">diamond</span>',
        emojis: [
            { id: 'crystal', src: '/emoji/crystal.png' },
            { id: 'cat', src: '/emoji/cat.json', animated: true, still: '/emoji/cat.png' },
        ],
    }],
})
```

### Instance

| Method | Description |
|---|---|
| `bind(button, input)` | Attach a trigger button and target field (`input`, `textarea`, or `contenteditable`). Clicking the trigger again while open closes the picker. |
| `open(only?)` | Show the picker. `only`, an array of native emoji, offers just those, with no categories, as a chat allowing only some reactions does |
| `close()` | Hide the picker. Escape does the same (closing the skin tone popup first when it is open) |
| `selectTab(tabId)` | Switch to a category tab by ID |

## Events

All events bubble. `yurba-ep.*` events fire on the picker element; `yurba-ep.select` fires on the bound field.

| Event | Fired on | Detail |
|---|---|---|
| `yurba-ep.select` | bound field | `{ code, shortcode, src, animated, native }` |
| `yurba-ep.open` | picker element | - |
| `yurba-ep.close` | picker element | - |
| `yurba-ep.load` | picker element | `{ count }` |

`yurba-ep.select` always fires (non-cancelable) whenever an emoji is selected, regardless of `insertImage`.

`native` is the emoji as text, `null` for a custom one. A skin tone has no shortcode of its own: it comes with the `code` and `shortcode` of its base emoji, and the tone only in `native`, so prefer `native` where text is fine.

## Icons

`icons` sets the built-in icons outside the category tabs. Each value is an HTML string inserted as given; keys left out keep the default.

| Key | Where | Default |
|---|---|---|
| `close` | Close button in the header | `close` Material Symbol |
| `search` | Search field. A custom icon is wrapped in `.y-ep__search-icon`, so it keeps the color and focus styling | `search` Material Symbol |
| `all` | The "all" tab | `more_horiz` Material Symbol |
| `category` | Tab of a JSON group with no icon of its own in `groupHtml` | `emoji_emotions` Material Symbol |

`groupHtml` sets the tab of a named group (`Smileys and emotions`, `People`, `Animals and nature`, `Food and drink`, `Travel and places`, `Activities and events`, `Objects`, `Symbols`, `Flags`), merged over the built-in ones. Use `icons` for the four keys above and `groupHtml` for named groups. `groupHtml.all` still sets the "all" tab; `icons.all` wins when both are given. A custom category brings its tab icon in its `html`.

```js
YurbaEP.create({
    icons: { close: '<svg viewBox="0 0 24 24" width="20" height="20">…</svg>', search: '<i class="fa fa-search"></i>' },
    groupHtml: { 'Flags': '<img src="/flag.svg" width="20" height="20">' },
})
```

## Insertion behavior

- `<input>` / `<textarea>` - inserts `:code:` shortcode at caret.
- `contenteditable` + `insertImage: true` - inserts `<img alt=":code:" data-emoji="code">` at caret.
- `contenteditable` + `insertImage: false` - inserts nothing; handle via `yurba-ep.select`.

## CSS variables

```css
.y-ep,
.y-ep__variants {
    --y-ep-bg:        #ffffff;
    --y-ep-secondary: #f2f2f7;
    --y-ep-text:      #000000;
    --y-ep-accent:    #007aff;
}
```

Each default follows a Yurba theme variable (`--yurba-main-color`, `--yurba-brand-color` and others) when the page defines it and falls back to the value above otherwise.

See [demo](https://yurba-dev.github.io/yurba-ep/) for full documentation.
