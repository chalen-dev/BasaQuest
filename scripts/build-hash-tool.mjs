// File: scripts/build-hash-tool.mjs
// Builds tools/hash-password.html: a single file a teammate can open in any
// browser to make a password hash with no install. It embeds the very same
// bcryptjs build that `npm run hash-password` uses (node_modules/bcryptjs),
// so both produce the same kind of hash.
//
//   npm run build:hash-tool
//
// Run it again after upgrading bcryptjs.
import { readFileSync, writeFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('node_modules/bcryptjs/package.json', 'utf8'))
const library = readFileSync('node_modules/bcryptjs/umd/index.js', 'utf8')
const template = readFileSync('tools/hash-password.template.html', 'utf8')

// The library is a UMD build. Giving it a fake CommonJS `module` makes it hand
// back its exports whatever its browser global is called, `define` is hidden
// so it can't take the AMD branch instead, and `require` is stubbed because the
// library probes for Node's crypto module while loading.
const inline = [
    '(function () {',
    '  var define = undefined, exports = {}, module = { exports: exports };',
    // The build looks for Node's crypto module at load time; in a browser it
    // uses the built-in secure random generator (crypto.getRandomValues) instead.
    '  var require = function () { return {}; };',
    library,
    '  window.bcrypt = module.exports;',
    '})();',
].join('\n')

const html = template
    .replace('/*__BCRYPT_INLINE__*/', () => inline.replaceAll('</script', '<\\/script'))
    .replace('__BCRYPT_VERSION__', pkg.version)

writeFileSync('tools/hash-password.html', html)
console.log(`Wrote tools/hash-password.html (bcryptjs ${pkg.version}, ${(html.length / 1024).toFixed(0)} KB)`)
