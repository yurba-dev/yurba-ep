class YurbaEP extends HTMLElement {
    static GROUP_HTML = {
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

    static EMOJI_JSON = 'https://cdn.yurba.one/static/noto-emoji/emoji.json'
    static NOTO_BASE  = 'https://cdn.yurba.one/static/noto-emoji/png/72/'

    static create(config = {}) {
        const element = document.createElement('yurba-ep')
        element.initConfig = config
        document.body.appendChild(element)

        return element
    }

    connectedCallback() {
        const config = this.initConfig || {}

        this.classList.add('y-ep', 'y-ep--hidden')
        this.style.display = 'none'

        this.pickerTitle = config.title ?? 'Pick an emoji'
        this.emojiJson = config.emojiJson ?? YurbaEP.EMOJI_JSON
        this.notoBaseUrl = config.notoBase ?? YurbaEP.NOTO_BASE
        this.groupHtml = Object.assign({}, YurbaEP.GROUP_HTML, config.groupHtml || {})
        this.insertImage = config.insertImage ?? false
        this.customEmojis = config.customEmojis || []
        this.chunks = {}
        this.allItems = []
        this.loaded = false
        this.isOpen = false
        this.activator = null
        this.input = null
        this.activeTab = 'all'

        this.innerHTML = this.template()

        this.lists = this.querySelector('.y-ep__lists')
        this.categories = this.querySelector('.y-ep__categories')
        this.searchInput = this.querySelector('.y-ep__search')
        this.gradient = this.querySelector('.y-ep__gradient')
        this.loader = this.querySelector('.y-ep__loader')

        this.bindCategories()
        this.bindClose()
        this.bindSearch()
        this.bindScroll()
        this.bindOutsideClick()
        this.bindScrollClose()
    }

    template() {
        return `
            <div class="y-ep__header">
                <p class="y-ep__title">${this.pickerTitle}</p>
                <button class="y-ep__close" data-action="close">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="y-ep__divider"></div>
            <div class="y-ep__categories-wrap">
                <div class="y-ep__categories">
                    <div class="y-ep__category" data-tab="all">${this.groupHtml['all'] ?? '<span class="material-symbols-rounded">more_horiz</span>'}</div>
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

    bindCategories() {
        this.categories.querySelectorAll('.y-ep__category').forEach(category => {
            category.removeEventListener('click', category.clickHandler)
            category.clickHandler = () => this.selectTab(category.dataset.tab)
            category.addEventListener('click', category.clickHandler)
        })
    }

    bindClose() {
        this.querySelectorAll('[data-action="close"]').forEach(button => {
            button.addEventListener('click', () => this.close())
        })
    }

    bindSearch() {
        this.searchInput.addEventListener('input', () => {
            const query = this.searchInput.value.trim().toLowerCase()
            if (!query) { this.hideSearch(); return }
            if (this.loaded) this.renderSearch(query)
        })
    }

    bindScroll() {
        this.lists.addEventListener('scroll', () => {
            if (this.detectBottom()) {
                this.loadPage(this.activeTab)
                this.ensureFilled(this.activeTab)
            }
        })
    }

    bindOutsideClick() {
        document.addEventListener('click', event => {
            if (
                this.isOpen &&
                !this.contains(event.target) &&
                (!this.activator || !this.activator.contains(event.target))
            ) {
                this.close()
            }
        })
    }

    bindScrollClose() {
        document.addEventListener('scroll', event => {
            if (!this.isOpen) return
            if (this.contains(event.target)) return
            this.close()
        }, true)
    }

    close() {
        const wasOpen = this.isOpen
        this.isOpen = false

        this.closeVariantPopup()
        this.activator = null
        this.input = null

        this.classList.add('y-ep--hidden')
        setTimeout(() => {
            if (!this.isOpen) this.style.display = 'none'
        }, 150)

        if (wasOpen) this.emit('close')
    }

    emit(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(`yurba-ep.${name}`, { bubbles: true, detail }))
    }

    open() {
        if (this.loaded) { this.show(); return }

        if (!this.emojiJson) {
            console.warn('[yurba-ep] Emoji JSON not configured. Pass emojiJson to YurbaEP.create().')
            return
        }

        this.show()
        this.showLoader()

        fetch(this.emojiJson)
            .then(response => {
                if (!response.ok) throw new Error(`[yurba-ep] Failed to load emoji JSON: ${response.status} ${response.statusText}`)
                return response.json()
            })
            .then(groups => {
                this.processMetadata(groups)
                this.customEmojis.forEach(category => this.addCustomCategory(category))
                this.chunks.all = this.chunkArray(this.allItems, 100)
                this.loaded = true
                this.selectTab('all')
                this.emit('load', { count: this.allItems.filter(item => item.type === 'emoji').length })
            })
            .catch(error => {
                this.hideLoader()
                console.error(error)
            })
    }

    show() {
        const wasHidden = !this.isOpen
        this.isOpen = true
        this.style.display = 'flex'
        this.position()

        void this.offsetWidth
        requestAnimationFrame(() => this.classList.remove('y-ep--hidden'))

        if (wasHidden) this.emit('open')
    }

    position() {
        if (!this.activator) return

        const rect = this.activator.getBoundingClientRect()
        const width = this.offsetWidth
        const height = this.offsetHeight
        const gap = 4
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let left = rect.right
        if (left + width > viewportWidth - gap) left = rect.right - width
        if (left + width > viewportWidth - gap) left = viewportWidth - width - gap
        if (left < gap) left = gap

        let top = rect.bottom
        if (top + height > viewportHeight - gap) top = rect.top - height
        if (top + height > viewportHeight - gap) top = viewportHeight - height - gap
        if (top < gap) top = gap

        this.style.left = (window.scrollX + left) + 'px'
        this.style.top = (window.scrollY + top) + 'px'
    }

    processMetadata(groups) {
        groups.forEach(group => {
            const tabId = this.groupToTabId(group.group)
            const iconHtml = this.groupHtml[group.group]
                ?? '<span class="material-symbols-rounded">emoji_emotions</span>'

            this.categories.insertAdjacentHTML('beforeend',
                `<div class="y-ep__category" data-tab="${tabId}">${iconHtml}</div>`)
            this.lists.insertAdjacentHTML('beforeend',
                `<div class="y-ep__list" data-tab="${tabId}" data-page="0"></div>`)

            const tabItems = []
            const head = { type: 'category', name: group.group, id: tabId }
            tabItems.push(head)
            this.allItems.push(head)

            group.emoji.forEach(entry => {
                const code = entry.shortcodes[0]?.replace(/:/g, '')
                if (!code) return
                const item = {
                    type: 'emoji',
                    code,
                    codepoints: entry.base,
                    keywords: [
                        ...entry.shortcodes.map(shortcode => shortcode.replace(/:/g, '')),
                        ...entry.emoticons,
                    ],
                    alternates: entry.alternates?.length > 1 ? entry.alternates.slice(1) : null,
                }
                tabItems.push(item)
                this.allItems.push(item)
            })

            this.chunks[tabId] = this.chunkArray(tabItems, 100)
        })

        this.bindCategories()
    }

    groupToTabId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    }

    addCustomCategory(category) {
        const head = { type: 'category', name: category.name, id: category.id }
        const items = [head]
        this.allItems.push(head)

        category.emojis.forEach(emoji => {
            if (!emoji.src) return
            const item = {
                type: 'emoji',
                code: emoji.id,
                codepoints: null,
                customSrc: emoji.src,
                animated: !!emoji.animated,
                keywords: [emoji.id, ...(emoji.keywords || [])]
            }
            items.push(item)
            this.allItems.push(item)
        })

        this.chunks[category.id] = this.chunkArray(items, 100)

        if (category.html) {
            this.categories.insertAdjacentHTML('beforeend',
                `<div class="y-ep__category" data-tab="${category.id}">${category.html}</div>`)
            this.bindCategories()
            this.lists.insertAdjacentHTML('beforeend',
                `<div class="y-ep__list" data-tab="${category.id}" data-page="0"></div>`)
        }
    }

    selectTab(tabId) {
        this.activeTab = tabId
        this.searchInput.value = ''
        this.hideSearch()

        this.categories.querySelectorAll('.y-ep__category').forEach(category => category.classList.remove('y-ep__category--active'))
        this.categories.querySelector(`[data-tab="${tabId}"]`)?.classList.add('y-ep__category--active')

        this.lists.querySelectorAll('.y-ep__list:not(.y-ep__list--search)').forEach(list => list.style.display = 'none')
        const tab = this.lists.querySelector(`.y-ep__list[data-tab="${tabId}"]`)
        if (!tab) return

        tab.style.display = 'flex'
        this.lists.scrollTop = 0

        if (!tab.classList.contains('y-ep__list--loaded')) {
            tab.classList.add('y-ep__list--loaded')
            this.loadPage(tabId)
        }
        this.ensureFilled(tabId)
    }

    hideSearch() {
        const searchList = this.lists.querySelector('.y-ep__list--search')
        if (searchList) searchList.style.display = 'none'

        const tab = this.lists.querySelector(`.y-ep__list[data-tab="${this.activeTab}"]`)
        if (tab) tab.style.display = 'flex'
    }

    loadPage(tabId) {
        const tab = this.lists.querySelector(`.y-ep__list[data-tab="${tabId}"]`)
        if (!tab) return
        const page = Number(tab.dataset.page)
        const chunk = this.chunks[tabId]?.[page]
        if (!chunk) return

        this.showLoader()

        chunk.forEach(item => {
            if (item.type == 'category') {
                const separator = document.createElement('div')
                separator.className = 'y-ep__sep'
                separator.textContent = item.name
                tab.appendChild(separator)
            } else {
                tab.appendChild(this.makeEmojiElement(item))
            }
        })

        tab.dataset.page = page + 1
        this.hideLoader()
    }

    renderSearch(query) {
        this.lists.querySelectorAll('.y-ep__list:not(.y-ep__list--search)').forEach(list => list.style.display = 'none')

        let results = this.lists.querySelector('.y-ep__list--search')
        if (!results) {
            results = document.createElement('div')
            results.className = 'y-ep__list y-ep__list--search'
            this.lists.appendChild(results)
        }

        results.innerHTML = ''
        results.style.display = 'flex'

        const matches = this.allItems.filter(item =>
            item.type == 'emoji' &&
            item.keywords?.some(keyword => keyword.includes(query))
        ).slice(0, 80)

        matches.forEach(item => results.appendChild(this.makeEmojiElement(item)))
    }

    makeEmojiElement(item) {
        const element = document.createElement('img')
        element.className = 'y-ep__emoji'

        if (item.customSrc) {
            element.src = item.customSrc
        } else {
            element.src = this.notoUrl(item.codepoints)
            element.onerror = () => { element.style.display = 'none' }
        }

        element.dataset.code = item.code
        element.dataset.names = item.keywords?.join(',') ?? item.code
        element.addEventListener('click', event => {
            if (item.alternates?.length) {
                event.stopPropagation()
                this.showVariantPopup(item, element)
            } else {
                this.insert(item.code, element.src, item.animated)
            }
        })

        return element
    }

    insert(code, src, animated = false) {
        const target = this.input
        if (!target) return

        target.dispatchEvent(new CustomEvent('yurba-ep.select', {
            bubbles: true,
            detail: { code, shortcode: `:${code}:`, src, animated: !!animated },
        }))

        if (target.isContentEditable) {
            if (!this.insertImage || !src) return

            target.focus()
            const node = this.makeInsertImage(code, src)
            const selection = window.getSelection()
            if (selection?.rangeCount && target.contains(selection.anchorNode)) {
                const range = selection.getRangeAt(0)
                range.deleteContents()
                range.insertNode(node)
                range.setStartAfter(node)
                range.collapse(true)
                selection.removeAllRanges()
                selection.addRange(range)
            } else {
                target.appendChild(node)
            }
        } else {
            const text = `:${code}:`
            const start = target.selectionStart
            const end = target.selectionEnd

            if (start != null && end != null) {
                target.value = target.value.slice(0, start) + text + target.value.slice(end)
                const position = start + text.length
                target.selectionStart = target.selectionEnd = position
            } else {
                target.value += text
            }
        }

        target.dispatchEvent(new Event('input', { bubbles: true }))
    }

    makeInsertImage(code, src) {
        const image = document.createElement('img')
        image.src = src
        image.alt = `:${code}:`
        image.dataset.emoji = code

        return image
    }

    showVariantPopup(item, triggerElement) {
        this.closeVariantPopup()

        const popup = document.createElement('div')
        popup.className = 'y-ep__variants'

        const createImage = (codepoints, code) => {
            const image = document.createElement('img')
            image.className = 'y-ep__emoji'
            image.src = this.notoUrl(codepoints)
            image.onerror = () => { image.style.display = 'none' }
            image.addEventListener('click', event => {
                event.stopPropagation()
                this.insert(code, image.src)
                this.closeVariantPopup()
            })

            return image
        }

        popup.appendChild(createImage(item.codepoints, item.code))
        item.alternates.forEach((alternateCodepoints, index) => {
            popup.appendChild(createImage(alternateCodepoints, `${item.code}_${index + 1}`))
        })

        document.body.appendChild(popup)
        this.variantPopup = popup

        const triggerRect = triggerElement.getBoundingClientRect()
        const popupWidth = popup.offsetWidth
        const popupHeight = popup.offsetHeight

        let top = triggerRect.bottom + 6
        if (top + popupHeight > window.innerHeight - 4) top = triggerRect.top - popupHeight - 6

        let left = triggerRect.left
        if (left + popupWidth > window.innerWidth - 4) left = window.innerWidth - popupWidth - 4
        if (left < 4) left = 4

        popup.style.top = top + 'px'
        popup.style.left = left + 'px'

        this.variantClickAway = event => {
            if (!popup.contains(event.target)) this.closeVariantPopup()
        }

        setTimeout(() => document.addEventListener('click', this.variantClickAway), 0)
    }

    closeVariantPopup() {
        if (this.variantPopup) {
            this.variantPopup.remove()
            this.variantPopup = null
        }
        if (this.variantClickAway) {
            document.removeEventListener('click', this.variantClickAway)
            this.variantClickAway = null
        }
    }

    notoUrl(codepoints) {
        const hex = codepoints
            .filter(codepoint => codepoint !== 65039)
            .map(codepoint => codepoint.toString(16).padStart(4, '0'))
            .join('_')

        return `${this.notoBaseUrl}emoji_u${hex}.png`
    }

    showLoader() {
        this.loader.style.display = 'block'
        this.gradient.classList.add('y-ep__gradient--loading')
    }

    hideLoader() {
        this.loader.style.display = 'none'
        this.gradient.classList.remove('y-ep__gradient--loading')
    }

    detectBottom() {
        return this.lists.scrollTop + this.lists.clientHeight >= this.lists.scrollHeight - 150
    }

    ensureFilled(tabId) {
        const tab = this.lists.querySelector(`.y-ep__list[data-tab="${tabId}"]`)
        if (!tab) return
        let guard = 0
        while (guard++ < 100 && this.lists.scrollHeight <= this.lists.clientHeight) {
            const page = Number(tab.dataset.page)
            if (!this.chunks[tabId]?.[page]) break
            this.loadPage(tabId)
        }
    }

    chunkArray(array, size) {
        const result = []
        for (let index = 0; index < array.length; index += size) result.push(array.slice(index, index + size))

        return result
    }

    bind(button, input) {
        button.addEventListener('click', event => {
            event.preventDefault()
            if (this.isOpen && this.activator === button) {
                this.close()
                return
            }
            this.activator = button
            this.input = input
            this.open()
        })
    }
}

window.customElements.define('yurba-ep', YurbaEP)
