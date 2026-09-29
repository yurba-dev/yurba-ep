;(() => {
    const floating = YurbaEP.shell

    function phone() {
        return window.matchMedia('(max-width: 768px)').matches
    }

    YurbaEP.shell = {
        show(picker) {
            if (!phone() || typeof YurbaUI == 'undefined') {
                picker.docked = false
                return floating.show(picker)
            }
            clearTimeout(picker.undock)
            if (picker.docked && picker.modal?.isShowed()) return
            picker.docked = true
            picker.style.display = 'flex'
            picker.classList.remove('is-hidden')
            const modal = new YurbaUI.Modal({
                sheet: true,
                components: [{ content: picker, area: 'body' }],
                onClose: () => picker.close(),
            })
            modal.addSetupHook(wrapper => wrapper.classList.add('y-ep-window'))
            picker.modal = modal
            modal.show()
        },

        hide(picker) {
            if (!picker.docked) return floating.hide(picker)
            picker.modal?.hide()
            picker.modal = null
            // Back in <body> before the sheet goes: pages query it there
            picker.undock = setTimeout(() => {
                if (picker.isOpen) return
                picker.docked = false
                picker.style.display = 'none'
                picker.classList.add('is-hidden')
                document.body.appendChild(picker)
            }, 200)
        },
    }
})()
