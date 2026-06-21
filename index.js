hljs.highlightAll()

const picker = YurbaEP.create({
    insertImage: true,
    customEmojis: [
        {
            name: 'Yurba',
            id: 'yurba',
            html: '<span class="material-symbols-rounded">diamond</span>',
            emojis: [
                { id: 'crystal', keywords: ['crystal', 'diamond', 'yurba'], src: 'https://cdn.yurba.one/static/emoji/yurba/png/crystal.png' }
            ]
        }
    ]
})

const autoGrow = el => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
}

const btn = document.querySelector('#demo-btn')
const input = document.querySelector('#demo-input')
const output = document.querySelector('#demo-output')

picker.bind(btn, input)
input.addEventListener('input', () => {
    autoGrow(input)
    output.innerHTML = input.value ? `<strong>Value:</strong> ${input.value}` : ''
})
autoGrow(input)

const btn3 = document.querySelector('#demo-btn3')
const inputText = document.querySelector('#demo-input-text')
const output3 = document.querySelector('#demo-output3')

picker.bind(btn3, inputText)
inputText.addEventListener('input', () => {
    output3.innerHTML = inputText.value ? `<strong>Value:</strong> ${inputText.value}` : ''
})

const btn2 = document.querySelector('#demo-btn2')
const editable = document.querySelector('#demo-editable')
const output2 = document.querySelector('#demo-output2')

picker.bind(btn2, editable)
editable.addEventListener('input', () => {
    const text = [...editable.childNodes].map(n =>
        n.nodeName == 'IMG' ? n.alt : n.textContent
    ).join('').trim()
    output2.innerHTML = text ? `<strong>Value:</strong> ${text}` : ''
})

const sections = document.querySelectorAll('.doc-section[id]')
const links = document.querySelectorAll('.sidebar a')

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            links.forEach(l => l.classList.remove('active'))
            const active = document.querySelector(`.sidebar a[href="#${entry.target.id}"]`)
            if (active) active.classList.add('active')
        }
    })
}, { rootMargin: '-20% 0px -70% 0px' })

sections.forEach(s => observer.observe(s))
