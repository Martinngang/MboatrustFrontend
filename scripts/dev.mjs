#!/usr/bin/env node
// Wraps `vite` so a busy port doesn't just crash the dev server — it
// finds the next free port and, in an interactive terminal, asks
// before switching to it.
import { createServer } from 'node:net'
import { createInterface } from 'node:readline/promises'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

// Matches AGENTS.md's documented default. Deliberately NOT 3000/3001/5173 —
// those are the default ports for CRA, Next.js, and Vite itself, so any
// other Node project running alongside this one is likely to collide there.
// 8443 is uncommon enough to avoid that entirely.
const DEFAULT_PORT = Number(process.env.PORT) || 8443

// Binds on every address a real client could reach the server through, not
// just 0.0.0.0 — on Windows a wildcard (0.0.0.0) bind can report success
// even when another process already holds the same port on a different
// address family (e.g. `::`), which is exactly the "wildcard address"
// warning Vite itself prints when this happens. Checking each address and
// requiring all of them to succeed catches that case instead of handing
// back a port that's actually still contested.
function canBind(port, address) {
  return new Promise((resolve) => {
    const tester = createServer()
    tester.once('error', (err) => {
      // Only a real conflict on this exact port counts as "not free" — any
      // other error (e.g. EADDRNOTAVAIL/ENOTSUP because this machine has no
      // IPv6 loopback) means the address family isn't usable at all here,
      // not that something else is occupying the port.
      resolve(err.code !== 'EADDRINUSE')
    })
    tester.once('listening', () => tester.close(() => resolve(true)))
    tester.listen(port, address)
  })
}

async function isPortFree(port) {
  for (const address of ['0.0.0.0', '127.0.0.1', '::1']) {
    if (!(await canBind(port, address))) return false
  }
  return true
}

async function findNextFreePort(fromPort) {
  let port = fromPort + 1
  while (!(await isPortFree(port))) port++
  return port
}

async function resolvePort() {
  if (await isPortFree(DEFAULT_PORT)) return DEFAULT_PORT

  console.log(`Port ${DEFAULT_PORT} is already in use.`)
  const suggestion = await findNextFreePort(DEFAULT_PORT)

  if (!process.stdin.isTTY) {
    console.log(`Non-interactive session — using port ${suggestion} instead.`)
    return suggestion
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let answer
  try {
    answer = await rl.question(`Use port ${suggestion} instead? [Y/n, or enter a port number] `)
  } finally {
    rl.close()
  }

  const trimmed = answer.trim()
  if (trimmed === '' || /^y(es)?$/i.test(trimmed)) return suggestion
  if (/^n(o)?$/i.test(trimmed)) {
    console.log('Aborted — free up the port and re-run, or re-run and choose a port.')
    process.exit(1)
  }

  const customPort = Number(trimmed)
  if (Number.isInteger(customPort) && customPort > 0) {
    if (await isPortFree(customPort)) return customPort
    console.log(`Port ${customPort} is also busy. Falling back to ${suggestion}.`)
    return suggestion
  }

  return suggestion
}

const port = await resolvePort()
console.log(`Starting dev server on port ${port}...`)

// Invoke Vite's local bin directly via `node <script>` — spawning
// `npx`/`vite.cmd` on Windows throws EINVAL under Node's spawn with an
// argv array. Running the JS entrypoint through the current Node binary
// sidesteps the shell/.cmd wrapper entirely and works identically
// cross-platform. `vite/bin/vite.js` isn't in the package's `exports`
// map, so resolve via the (exported) package.json instead.
const viteBin = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')
const child = spawn(process.execPath, [viteBin, '--host', '0.0.0.0', '--port', String(port)], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
