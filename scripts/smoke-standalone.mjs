import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM, VirtualConsole } from 'jsdom'

const filePath = resolve('dist/standalone.html')
const html = await readFile(filePath, 'utf8')
const errors = []
const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', (error) => errors.push(error.message))
virtualConsole.on('error', (message) => errors.push(String(message)))

const dom = new JSDOM(html, {
  url: 'https://forkroom.example/standalone.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.structuredClone = globalThis.structuredClone
    window.matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return true },
    })
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.confirm = () => true
  },
})

const deadline = Date.now() + 4_000
while (Date.now() < deadline) {
  const tools = dom.window.__FORKROOM_DEVTOOLS__?.listTools?.()
  if (dom.window.document.querySelector('.app-shell') && tools?.length === 16) break
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 25))
}

const tools = dom.window.__FORKROOM_DEVTOOLS__?.listTools?.() ?? []
const names = tools.map((tool) => tool.name)
const assertions = [
  ['application shell rendered', Boolean(dom.window.document.querySelector('.app-shell'))],
  ['decision map rendered', Boolean(dom.window.document.querySelector('.decision-map'))],
  ['exactly 16 tools booted', tools.length === 16],
  ['inspection tool booted', names.includes('forkroom_inspect_decision')],
  ['commitment tool booted', names.includes('forkroom_draft_commitment')],
  ['no runtime errors', errors.length === 0],
]

console.log('\nForkRoom standalone runtime smoke test')
console.log('--------------------------------------')
for (const [label, passed] of assertions) console.log(`${passed ? '✓' : '✗'} ${label}`)
if (errors.length > 0) console.error(errors.join('\n'))

dom.window.close()
if (assertions.some(([, passed]) => !passed)) process.exit(1)
