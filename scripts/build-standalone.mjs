import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Script } from 'node:vm'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = resolve(projectRoot, 'dist')
const entryPath = resolve(distRoot, 'index.html')
const outputPath = resolve(distRoot, 'standalone.html')

const html = await readFile(entryPath, 'utf8')
const stylesheetMatch = html.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/i)
const scriptMatch = html.match(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i)

if (!stylesheetMatch || !scriptMatch) {
  throw new Error('Could not locate Vite stylesheet and module entry points in dist/index.html.')
}

const resolveAsset = (reference) => resolve(distRoot, reference.replace(/^\.\//, '').replace(/^\//, ''))
const [css, javascript] = await Promise.all([
  readFile(resolveAsset(stylesheetMatch[1]), 'utf8'),
  readFile(resolveAsset(scriptMatch[1]), 'utf8'),
])

const escapedJavascript = javascript.replace(/<\/script/gi, '<\\/script')
const inlineScriptTag = `<script data-forkroom-bundle="javascript">${escapedJavascript}</script>`
const standalone = html
  .replace(stylesheetMatch[0], () => `<style data-forkroom-bundle="css">${css}</style>`)
  .replace(scriptMatch[0], '')
  .replace(/<link\s+rel="manifest"[^>]*>/i, '')
  .replace(/<link\s+rel="icon"[^>]*>/i, '')
  .replace(
    '</head>',
    '    <meta name="forkroom-build" content="standalone-v1" />\n  </head>',
  )
  .replace('</body>', () => `    ${inlineScriptTag}\n  </body>`)

const inlineScript = standalone.match(/<script\s+data-forkroom-bundle="javascript">([\s\S]*?)<\/script>/i)?.[1]
if (!inlineScript) throw new Error('Could not recover the inlined JavaScript bundle.')
if ((standalone.match(/<!doctype html>/gi) ?? []).length !== 1) {
  throw new Error('Standalone document contains a duplicated or injected HTML document.')
}
if (!standalone.includes('<div id="root"></div>')) {
  throw new Error('Standalone document is missing the application root.')
}
if (standalone.indexOf('<div id="root"></div>') > standalone.indexOf('data-forkroom-bundle="javascript"')) {
  throw new Error('Standalone JavaScript must execute after the application root is parsed.')
}
new Script(inlineScript, { filename: 'forkroom-standalone-bundle.js' })

if (!standalone.includes('registerTool') || !standalone.includes('forkroom_draft_commitment')) {
  throw new Error('Standalone build does not contain the verified WebMCP tool surface.')
}

await writeFile(outputPath, standalone)
console.log(`Wrote ${outputPath} (${Buffer.byteLength(standalone)} bytes).`)
