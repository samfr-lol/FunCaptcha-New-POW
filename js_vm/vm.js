const vm = require('vm');
const { performance } = require('perf_hooks');

const realRequire = require;

function safeRequire(name) {
  if (name === 'crypto') return realRequire('crypto');
  throw new Error(`Module not allowed: ${name}`);
}

const safeConsole = {
  log: (...args) => {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      process.stdout.write(JSON.stringify(args[0]));
    } else {
      process.stderr.write(args.map(a => String(a)).join(' ') + '\n');
    }
  },
  error: (...args) => process.stderr.write(args.map(a => String(a)).join(' ') + '\n'),
  warn:  (...args) => process.stderr.write(args.map(a => String(a)).join(' ') + '\n'),
  info:  (...args) => process.stderr.write(args.map(a => String(a)).join(' ') + '\n'),
};

function btoaPoly(s) { return Buffer.from(s, 'binary').toString('base64'); }
function atobPoly(s) { return Buffer.from(s, 'base64').toString('binary'); }

let code = '';

process.stdin.on('data', chunk => code += chunk);
process.stdin.on('end', async () => {
  const sandbox = {
    require: safeRequire,
    console: safeConsole,
    setTimeout, setInterval, clearTimeout, clearInterval,
    Buffer,
    performance,
    btoa: btoaPoly,
    atob: atobPoly,
    postMessage: (msg) => {
      if (msg && msg.type === 'done') {
        process.stdout.write(JSON.stringify(msg.data));
      }
    },
    global: null,
    globalThis: null,
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);

  try {
    await vm.runInContext(code, sandbox);
  } catch (err) {
    process.stderr.write(String(err.stack || err) + '\n');
    process.exit(1);
  }
});
