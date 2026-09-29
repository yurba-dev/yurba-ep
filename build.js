const { transform } = require('esbuild')
const fs = require('fs')
const path = require('path')

const distDir = path.join(__dirname, 'dist')
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir)

const builds = {
    'yurba-ep': { js: ['yurba-ep.js'], css: ['yurba-ep.css', 'yurba-ep.standalone.css'] },
    'yurba-ep.ui': { js: ['yurba-ep.js', 'yurba-ep.ui.js'], css: ['yurba-ep.css', 'yurba-ep.ui.css'] },
}

function read(files) {
    return files.map(file => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n')
}

Promise.all(Object.entries(builds).flatMap(([name, build]) => [
    transform(read(build.js), { loader: 'js', minify: true, target: ['chrome80', 'firefox78', 'safari14'] })
        .then(result => fs.writeFileSync(path.join(distDir, name + '.min.js'), result.code, 'utf8'))
        .then(() => console.log(`✓  JS  →  dist/${name}.min.js`)),
    transform(read(build.css), { loader: 'css', minify: true })
        .then(result => fs.writeFileSync(path.join(distDir, name + '.min.css'), result.code, 'utf8'))
        .then(() => console.log(`✓  CSS →  dist/${name}.min.css`)),
])).catch(error => {
    console.error(error)
    process.exit(1)
})
