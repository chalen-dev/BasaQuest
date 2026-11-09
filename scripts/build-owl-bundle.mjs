// Builds public/owl-rig.js, the owl for pages outside React (see
// src/components/ui/owlRig/standalone.ts). Run: npm run build:owl
import { build } from 'esbuild'

await build({
    entryPoints: ['src/components/ui/owlRig/standalone.ts'],
    outfile: 'public/owl-rig.js',
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2020',
    legalComments: 'none',
})
console.log('Built public/owl-rig.js')
