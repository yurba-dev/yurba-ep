class YurbaEP extends HTMLElement {
    static _GROUP_HTML = {
        'Smileys and emotions': '<span class="material-symbols-rounded">face</span>',
        'People':               '<span class="material-symbols-rounded">group</span>',
        'Animals and nature':   '<span class="material-symbols-rounded">fertile</span>',
        'Food and drink':       '<span class="material-symbols-rounded">local_pizza</span>',
        'Travel and places':    '<span class="material-symbols-rounded">globe</span>',
        'Activities and events':'<span class="material-symbols-rounded">sports_football</span>',
        'Objects':              '<span class="material-symbols-rounded">eyeglasses_2</span>',
        'Symbols':              '<span class="material-symbols-rounded">attach_money</span>',
        'Flags':                '<span class="material-symbols-rounded">flag</span>',
    }

    static _EMOJI_JSON = 'https://cdn.yurba.one/static/noto-emoji/emoji.json'
    static _NOTO_BASE  = 'https://cdn.yurba.one/static/noto-emoji/png/72/'

    connectedCallback() {
        const cfg = this._initConfig || {}

        this.classList.add('y-ep')
        this.style.display = 'none'

        this._title        = cfg.title    ?? 'Pick an emoji'
        this._emojiJson    = cfg.emojiJson ?? YurbaEP._EMOJI_JSON
        this._notoBaseUrl  = cfg.notoBase  ?? YurbaEP._NOTO_BASE
        this._groupHtml    = Object.assign({}, YurbaEP._GROUP_HTML, cfg.groupHtml || {})
        this._insertImage  = cfg.insertImage ?? false
        this._customEmojis = cfg.customEmojis || []
        this._chunks = {}
        this._allItems = []
        this._loaded = false
        this._activator = null
        this._input = null
        this._activeTab = 'all'

        this.innerHTML = this._template()

        this._lists = this.querySelector('.y-ep__lists')
        this._categories = this.querySelector('.y-ep__categories')
        this._searchInput = this.querySelector('.y-ep__search')
        this._gradient = this.querySelector('.y-ep__gradient')
        this._loader = this.querySelector('.y-ep__loader')

        this._bindCategories()
        this._bindClose()
        this._bindSearch()
        this._bindScroll()
        this._bindOutsideClick()
        this._bindScrollClose()
    }

    _template() {
        return `
            <div class="y-ep__header">
                <p class="y-ep__title">${this._title}</p>
                <button class="y-ep__close" data-action="close">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="y-ep__divider"></div>
            <div class="y-ep__categories-wrap">
                <div class="y-ep__categories">
                    <div class="y-ep__category" data-tab="all">${this._groupHtml['all'] ?? '<span class="material-symbols-rounded">more_horiz</span>'}</div>
                </div>
            </div>
            <div class="y-ep__divider"></div>
            <div class="y-ep__search-wrap">
                <div class="y-ep__search-inner">
                    <span class="y-ep__search-icon material-symbols-rounded">search</span>
                    <input class="y-ep__search" placeholder="Search...">
                </div>
            </div>
            <div class="y-ep__body">
                <div class="y-ep__lists">
                    <div class="y-ep__list" data-tab="all" data-page="0"></div>
                </div>
                <div class="y-ep__gradient"></div>
                <div class="y-ep__loader"></div>
            </div>`
    }

    _bindCategories() {
        this._categories.querySelectorAll('.y-ep__category').forEach(cat => {
            cat.removeEventListener('click', cat._epHandler)
            cat._epHandler = () => this.selectTab(cat.dataset.tab)
            cat.addEventListener('click', cat._epHandler)
        })
    }

    _bindClose() {
        this.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this.close())
        })
    }

    _bindSearch() {
        this._searchInput.addEventListener('input', () => {
            const q = this._searchInput.value.trim().toLowerCase()
            if (!q) { this._hideSearch(); return }
            if (this._loaded) this._renderSearch(q)
        })
    }

    _bindScroll() {
        this._lists.addEventListener('scroll', () => {
            if (this._detectBottom()) this._loadPage(this._activeTab)
        })
    }

    _bindOutsideClick() {
        document.addEventListener('click', e => {
            if (
                this.style.display !== 'none' &&
                !this.contains(e.target) &&
                (!this._activator || !this._activator.contains(e.target))
            ) {
                this.close()
            }
        })
    }

    _bindScrollClose() {
        document.addEventListener('scroll', e => {
            if (this.style.display == 'none') return
            if (this.contains(e.target)) return
            this.close()
        }, true)
    }

    close() {
        const wasOpen = this.style.display !== 'none'

        this._closeVariantPopup()
        this._activator = null
        this._input = null
        this.style.display = 'none'
        
        if (wasOpen) this._emit('close')
    }

    _emit(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(`yurbaep.${name}`, { bubbles: true, detail }))
    }

    open() {
        if (this._loaded) { this._show(); return }

        if (!this._emojiJson) {
            console.warn('[yurba-ep] Emoji JSON not configured. Pass emojiJson to YurbaEP.create().')
            return
        }

        this._show()
        this._showLoader()

        fetch(this._emojiJson)
            .then(r => {
                if (!r.ok) throw new Error(`[yurba-ep] Failed to load emoji JSON: ${r.status} ${r.statusText}`)
                return r.json()
            })
            .then(groups => {
                this._processMetadata(groups)
                this._customEmojis.forEach(cat => this._addCustomCategory(cat))
                this._chunks.all = this._chunkArray(this._allItems, 100)
                this._loaded = true
                this.selectTab('all')
                this._emit('load', { count: this._allItems.filter(i => i.type === 'emoji').length })
            })
            .catch(err => {
                this._hideLoader()
                console.error(err)
            })
    }

    _show() {
        const wasHidden = this.style.display == 'none'
        this.style.display = 'flex'
        this._position()
        if (wasHidden) this._emit('open')
    }

    _position() {
        if (!this._activator) return

        const rect = this._activator.getBoundingClientRect()
        const w = this.offsetWidth
        const h = this.offsetHeight
        const gap = 4
        const vw = window.innerWidth
        const vh = window.innerHeight

        let left = rect.right
        if (left + w > vw - gap) left = rect.right - w
        if (left + w > vw - gap) left = vw - w - gap
        if (left < gap) left = gap

        let top = rect.bottom
        if (top + h > vh - gap) top = rect.top - h
        if (top + h > vh - gap) top = vh - h - gap
        if (top < gap) top = gap

        this.style.left = (window.scrollX + left) + 'px'
        this.style.top = (window.scrollY + top) + 'px'
    }

    _processMetadata(groups) {
        groups.forEach(group => {
            const tabId = this._groupToTabId(group.group)
            const iconHtml = this._groupHtml[group.group]
                ?? '<span class="material-symbols-rounded">emoji_emotions</span>'

            this._categories.insertAdjacentHTML('beforeend',
                `<div class="y-ep__category" data-tab="${tabId}">${iconHtml}</div>`)
            this._lists.insertAdjacentHTML('beforeend',
                `<div class="y-ep__list" data-tab="${tabId}" data-page="0"></div>`)

            const tabItems = []
            const head = { type: 'category', name: group.group, id: tabId }
            tabItems.push(head)
            this._allItems.push(head)

            group.emoji.forEach(entry => {
                const code = entry.shortcodes[0]?.replace(/:/g, '')
                if (!code) return
                const item = {
                    type: 'emoji',
                    code,
                    codepoints: entry.base,
                    keywords: [
                        ...entry.shortcodes.map(s => s.replace(/:/g, '')),
                        ...entry.emoticons,
                    ],
                    alternates: entry.alternates?.length > 1 ? entry.alternates.slice(1) : null,
                }
                tabItems.push(item)
                this._allItems.push(item)
            })

            this._chunks[tabId] = this._chunkArray(tabItems, 100)
        })

        this._bindCategories()
    }

    _groupToTabId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    }

    _addCustomCategory(cat) {
        const head = { type: 'category', name: cat.name, id: cat.id }
        const items = [head]
        this._allItems.push(head)

        cat.emojis.forEach(em => {
            if (!em.src) return
            const item = {
                type: 'emoji',
                code: em.id,
                codepoints: null,
                customSrc: em.src,
                animated: !!em.animated,
                keywords: [em.id, ...(em.keywords || [])]
            }
            items.push(item)
            this._allItems.push(item)
        })

        this._chunks[cat.id] = this._chunkArray(items, 100)

        if (cat.html) {
            this._categories.insertAdjacentHTML('beforeend',
                `<div class="y-ep__category" data-tab="${cat.id}">${cat.html}</div>`)
            this._bindCategories()
            this._lists.insertAdjacentHTML('beforeend',
                `<div class="y-ep__list" data-tab="${cat.id}" data-page="0"></div>`)
        }
    }

    selectTab(tabId) {
        this._activeTab = tabId
        this._searchInput.value = ''
        this._hideSearch()

        this._categories.querySelectorAll('.y-ep__category').forEach(c => c.classList.remove('y-ep__category--active'))
        this._categories.querySelector(`[data-tab="${tabId}"]`)?.classList.add('y-ep__category--active')

        this._lists.querySelectorAll('.y-ep__list:not(.y-ep__list--search)').forEach(t => t.style.display = 'none')
        const tab = this._lists.querySelector(`.y-ep__list[data-tab="${tabId}"]`)
        if (!tab) return

        tab.style.display = 'flex'
        this._lists.scrollTop = 0

        if (!tab.classList.contains('y-ep__list--loaded')) {
            tab.classList.add('y-ep__list--loaded')
            this._loadPage(tabId)
        }
    }

    _hideSearch() {
        const s = this._lists.querySelector('.y-ep__list--search')
        if (s) s.style.display = 'none'

        const tab = this._lists.querySelector(`.y-ep__list[data-tab="${this._activeTab}"]`)
        if (tab) tab.style.display = 'flex'
    }

    _loadPage(tabId) {
        const tab = this._lists.querySelector(`.y-ep__list[data-tab="${tabId}"]`)
        if (!tab) return
        const page = Number(tab.dataset.page)
        const chunk = this._chunks[tabId]?.[page]
        if (!chunk) return

        this._showLoader()

        chunk.forEach(item => {
            if (item.type == 'category') {
                const sep = document.createElement('div')
                sep.className = 'y-ep__sep'
                sep.textContent = item.name
                tab.appendChild(sep)
            } else {
                tab.appendChild(this._makeEmojiEl(item))
            }
        })

        tab.dataset.page = page + 1
        this._hideLoader()
    }

    _renderSearch(q) {
        this._lists.querySelectorAll('.y-ep__list:not(.y-ep__list--search)').forEach(t => t.style.display = 'none')

        let results = this._lists.querySelector('.y-ep__list--search')
        if (!results) {
            results = document.createElement('div')
            results.className = 'y-ep__list y-ep__list--search'
            this._lists.appendChild(results)
        }

        results.innerHTML = ''
        results.style.display = 'flex'

        const matches = this._allItems.filter(item =>
            item.type == 'emoji' &&
            item.keywords?.some(k => k.includes(q))
        ).slice(0, 80)

        matches.forEach(item => results.appendChild(this._makeEmojiEl(item)))
    }

    _makeEmojiEl(item) {
        let el

        if (item.customSrc) {
            el = document.createElement('img')
            el.className = 'y-ep__emoji'
            el.src = item.customSrc
        } else {
            el = document.createElement('img')
            el.className = 'y-ep__emoji'
            el.src = this._notoUrl(item.codepoints)
            el.onerror = () => { el.style.display = 'none' }
        }

        el.dataset.code = item.code
        el.dataset.names = item.keywords?.join(',') ?? item.code
        el.addEventListener('click', e => {
            if (item.alternates?.length) {
                e.stopPropagation()
                this._showVariantPopup(item, el)
            } else {
                this._insert(item.code, el.src, item.animated)
            }
        })
        return el
    }

    _insert(code, src, animated = false) {
        const target = this._input
        if (!target) return

        target.dispatchEvent(new CustomEvent('yurbaep.select', {
            bubbles: true,
            detail: { code, shortcode: `:${code}:`, src, animated: !!animated },
        }))

        if (target.isContentEditable) {
            if (!this._insertImage || !src) return

            target.focus()
            const node = this._makeInsertImg(code, src)
            const sel = window.getSelection()
            if (sel?.rangeCount && target.contains(sel.anchorNode)) {
                const range = sel.getRangeAt(0)
                range.deleteContents()
                range.insertNode(node)
                range.setStartAfter(node)
                range.collapse(true)
                sel.removeAllRanges()
                sel.addRange(range)
            } else {
                target.appendChild(node)
            }
        } else {
            const text = `:${code}:`
            const start = target.selectionStart
            const end = target.selectionEnd

            if (start != null && end != null) {
                target.value = target.value.slice(0, start) + text + target.value.slice(end)
                const pos = start + text.length
                target.selectionStart = target.selectionEnd = pos
            } else {
                target.value += text
            }
        }

        target.dispatchEvent(new Event('input', { bubbles: true }))
    }

    _makeInsertImg(code, src) {
        const img = document.createElement('img')
        img.src = src
        img.alt = `:${code}:`
        img.dataset.emoji = code

        return img
    }

    _showVariantPopup(item, triggerEl) {
        this._closeVariantPopup()

        const popup = document.createElement('div')
        popup.className = 'y-ep__variants'

        const makeImg = (codepoints, code) => {
            const img = document.createElement('img')
            img.className = 'y-ep__emoji'
            img.src = this._notoUrl(codepoints)
            img.onerror = () => { img.style.display = 'none' }
            img.addEventListener('click', e => {
                e.stopPropagation()
                this._insert(code, img.src)
                this._closeVariantPopup()
            })

            return img
        }

        popup.appendChild(makeImg(item.codepoints, item.code))
        item.alternates.forEach((altCps, i) => {
            popup.appendChild(makeImg(altCps, `${item.code}_${i + 1}`))
        })

        document.body.appendChild(popup)
        this._variantPopup = popup

        const tRect = triggerEl.getBoundingClientRect()
        const pw = popup.offsetWidth
        const ph = popup.offsetHeight

        let top = tRect.bottom + 6
        if (top + ph > window.innerHeight - 4) top = tRect.top - ph - 6

        let left = tRect.left
        if (left + pw > window.innerWidth - 4) left = window.innerWidth - pw - 4
        if (left < 4) left = 4

        popup.style.top = top + 'px'
        popup.style.left = left + 'px'

        this._variantClickAway = e => {
            if (!popup.contains(e.target)) this._closeVariantPopup()
        }

        setTimeout(() => document.addEventListener('click', this._variantClickAway), 0)
    }

    _closeVariantPopup() {
        if (this._variantPopup) {
            this._variantPopup.remove()
            this._variantPopup = null
        }
        if (this._variantClickAway) {
            document.removeEventListener('click', this._variantClickAway)
            this._variantClickAway = null
        }
    }

    _notoUrl(codepoints) {
        const hex = codepoints
            .filter(cp => cp !== 65039)
            .map(cp => cp.toString(16).padStart(4, '0'))
            .join('_')

        return `${this._notoBaseUrl}emoji_u${hex}.png`
    }

    _showLoader() {
        this._loader.style.display = 'block'
        this._gradient.classList.add('y-ep__gradient--loading')
    }

    _hideLoader() {
        this._loader.style.display = 'none'
        this._gradient.classList.remove('y-ep__gradient--loading')
    }

    _detectBottom() {
        return this._lists.scrollTop + this._lists.clientHeight >= this._lists.scrollHeight - 1
    }

    _chunkArray(array, size) {
        const result = []
        for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size))

        return result
    }

    bind(button, input) {
        button.addEventListener('click', e => {
            e.preventDefault()
            this._activator = button
            this._input = input
            this.open()
        })
    }

    static create(config = {}) {
        const el = document.createElement('yurba-ep')
        el._initConfig = config
        document.body.appendChild(el)

        return el
    }
}

window.customElements.define('yurba-ep', YurbaEP)
