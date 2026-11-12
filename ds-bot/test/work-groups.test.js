import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { test } from 'node:test'
import { createRuntime } from '../index.js'
import { fakeContext } from './fake-ctx.js'

// The native realpath, as fs/promises uses it: on Windows the JS one keeps 8.3 short names.
const real = path => (typeof realpathSync.native === 'function' ? realpathSync.native(path) : realpathSync(path))
const pathKey = (path) => {
  let value
  try {
    value = real(path)
  } catch {
    value = resolve(String(path))
  }
  return process.platform === 'win32' ? value.toLowerCase() : value
}
const samePath = (actual, wanted) => assert.equal(pathKey(actual), pathKey(wanted), `${actual} should be ${wanted}`)
const isDir = path => existsSync(path) && statSync(path).isDirectory()

const baseState = () => ({
  version: 1,
  revision: 0,
  workspaceId: 'w1',
  mainBotIds: ['chief'],
  bots: {
    chief: { id: 'chief', sessionId: 'chief', name: 'Chief', role: 'Lead', instructions: '', createdAt: 1, model: 'fake/model-a' },
    writer: { id: 'writer', sessionId: 'writer', name: 'Writer', role: 'Copy', instructions: '', createdAt: 2, model: 'fake/model-a' },
    editor: { id: 'editor', sessionId: 'editor', name: 'Editor', role: 'Video', instructions: '', createdAt: 3, model: 'fake/model-a' },
  },
  rooms: {
    r1: { id: 'r1', sessionId: 'r1', name: 'Video Room', named: true, members: ['chief', 'writer', 'editor'], admin: 'chief', mode: 'admin', notice: '', createdAt: 4 },
  },
  agents: {},
  exchanges: [],
  exchangeTurns: {},
  questions: {},
  prefs: {},
  sections: [],
})

// Every folder in the precedence chain is distinct, so one lookup names one source.
const precedenceState = ({ project, other, third, roomDir }) => {
  const state = baseState()
  state.bots.writer = { ...state.bots.writer, workDir: project, sectionId: 'sec-b' }
  state.bots.editor = { ...state.bots.editor, sectionId: 'sec-b' }
  state.bots.plain = { id: 'plain', sessionId: 'plain', name: 'Plain', role: '', instructions: '', createdAt: 5, model: 'fake/model-a' }
  state.rooms = {
    r1: { id: 'r1', sessionId: 'r1', name: 'Room folder', named: true, members: ['writer', 'editor'], admin: 'chief', mode: 'admin', notice: '', createdAt: 6, workDir: roomDir, sectionId: 'sec-a' },
    r2: { id: 'r2', sessionId: 'r2', name: 'Member folder', named: true, members: ['writer', 'editor'], admin: 'chief', mode: 'admin', notice: '', createdAt: 7, memberDirs: { writer: other, editor: null }, sectionId: 'sec-a' },
    r3: { id: 'r3', sessionId: 'r3', name: 'Room section', named: true, members: ['writer', 'editor'], admin: 'chief', mode: 'admin', notice: '', createdAt: 8, sectionId: 'sec-a' },
  }
  state.sections = [
    { id: 'sec-a', name: 'Alpha', workDir: third },
    { id: 'sec-b', name: 'Beta', workDir: other },
  ]
  return state
}

const modelState = () => {
  const state = baseState()
  state.bots.coder = { id: 'coder', sessionId: 'coder', name: 'Coder', role: 'Code', instructions: '', createdAt: 5, model: 'local-claude-code/default' }
  return state
}

const privateState = ({ privateDir }) => {
  const state = baseState()
  state.bots.vault = { id: 'vault', sessionId: 'vault', name: 'Vault', role: '', instructions: '', createdAt: 5, model: 'fake/model-a', workDir: privateDir, private: true }
  return state
}

// A real runtime over the /api/bot route, in its own temp DSH_HOME. The fake LLM
// serves one provider so resolveModel can turn a bare model id into provider/model.
async function start(saved = baseState()) {
  const root = real(mkdtempSync(join(tmpdir(), 'ds-bot-work-groups-')))
  const dsh = join(root, 'dsh')
  const home = join(dsh, 'bot')
  const team = join(home, 'workspace')
  const project = join(root, 'project')
  const other = join(root, 'other')
  const third = join(root, 'third')
  const roomDir = join(root, 'room')
  const privateDir = join(root, 'private')
  for (const dir of [team, project, other, third, roomDir, privateDir]) mkdirSync(dir, { recursive: true })
  const paths = { root, dsh, home, team, project, other, third, roomDir, privateDir }
  writeFileSync(join(home, 'state.json'), JSON.stringify(typeof saved === 'function' ? saved(paths) : saved))

  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = dsh

  const registry = new Map([['w1', { id: 'w1', path: team, title: 'DS Bot' }]])
  const agents = new Map()
  const agentOf = (sessionId) => {
    if (!agents.has(sessionId)) {
      agents.set(sessionId, {
        id: sessionId,
        status: 'running',
        session: { id: sessionId, header: { cwd: team }, requestHeader: () => undefined, deriveMessages: () => [] },
        followup() {},
        steer() {},
        inject() {},
        cancel() {},
        async whenIdle() {},
        async runMaintenance(fn) { return fn(AbortSignal.timeout(60_000)) },
        inbox: { nextStep: [], nextTurn: [], remove() {} },
      })
    }
    return agents.get(sessionId)
  }

  const ctx = fakeContext()
  Object.assign(ctx, {
    llm: {
      ...ctx.llm,
      listProviders: () => [{ id: 'fake', name: 'Fake' }],
      listModels: async provider => (provider === 'fake'
        ? [{ id: 'model-a', name: 'Model A' }, { id: 'model-b', name: 'Model B' }]
        : []),
      resolveModelInfo: async () => ({}),
      providerRetryPolicy: () => undefined,
    },
    workspaceRegistry: {
      get: id => registry.get(id),
      list: () => [...registry.values()],
      resolveByPath: async path => [...registry.values()].find(entry => pathKey(entry.path) === pathKey(path)),
      create: async (path, title = 'DS Bot') => {
        const found = [...registry.values()].find(entry => pathKey(entry.path) === pathKey(path))
        if (found !== undefined) return found
        const workspace = { id: `w-${registry.size + 1}`, path, title }
        registry.set(workspace.id, workspace)
        return workspace
      },
      archiveSession: async () => {},
    },
    sessionController: {
      create: async () => ({ sessionId: `s${agents.size + 1}` }),
      prompt: async () => ({ accepted: true }),
      resolveAgent: async sessionId => ({ agent: agentOf(sessionId) }),
      selectModel: async () => ({}),
      page: async () => ({ records: [], hasMore: false }),
    },
    sessionTitle: { rename: async () => {} },
    sessions: { flush: async () => {} },
  })

  let route
  const register = ctx.connection.fetch.register
  ctx.connection.fetch.register = (options) => {
    route = options
    return register(options)
  }
  const rt = createRuntime(ctx, { home })
  const call = async (endpoint, payload) => (await route.fetch(new Request('http://localhost/api/bot', {
    method: 'POST', body: JSON.stringify({ endpoint, payload }),
  }))).json()
  const stateOf = () => JSON.parse(readFileSync(join(home, 'state.json'), 'utf8'))
  const stop = async () => {
    await ctx.dispose()
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(root, { recursive: true, force: true, maxRetries: 5 })
  }
  // Loading once fills the Session-owner indexes, as the first endpoint call would.
  await rt.load()
  return { ctx, rt, call, stateOf, stop, root, dsh, home, team, project, other, third, roomDir, privateDir }
}

// ---------------------------------------------------------------------------
// The group workspace lookup.

test('workDirOf uses the room folder before member, Bot, and section folders', async (t) => {
  const env = await start(precedenceState)
  t.after(env.stop)
  samePath(env.rt.workDirOf({ botId: 'writer', roomId: 'r1' }), env.roomDir)
})

test('workDirOf uses a member folder and treats null as the team workspace', async (t) => {
  const env = await start(precedenceState)
  t.after(env.stop)
  samePath(env.rt.workDirOf({ botId: 'writer', roomId: 'r2' }), env.other)
  samePath(env.rt.workDirOf({ botId: 'editor', roomId: 'r2' }) ?? env.rt.teamFolder(), env.team)
})

test('workDirOf uses a Bot folder, then a section folder, with the room section first', async (t) => {
  const env = await start(precedenceState)
  t.after(env.stop)
  samePath(env.rt.workDirOf({ botId: 'writer' }), env.project)
  samePath(env.rt.workDirOf({ botId: 'editor' }), env.other)
  samePath(env.rt.workDirOf({ botId: 'editor', roomId: 'r3' }), env.third)
})

test('workDirOf ends at the team workspace, or at nothing when none is registered', async (t) => {
  const env = await start(precedenceState)
  t.after(env.stop)
  samePath(env.rt.teamFolder(), env.team)
  samePath(env.rt.workDirOf({ botId: 'plain' }) ?? env.rt.teamFolder(), env.team)

  const bare = await start(() => {
    const state = baseState()
    delete state.workspaceId
    return state
  })
  t.after(bare.stop)
  assert.equal(bare.rt.teamFolder(), undefined)
  assert.equal(bare.rt.workDirOf({ botId: 'writer' }) ?? bare.rt.teamFolder(), undefined)
})

// ---------------------------------------------------------------------------
// section-save and its folder fields.

test('section-save stores an existing folder and clears it with an empty string', async (t) => {
  const env = await start()
  t.after(env.stop)
  const created = await env.call('section-save', { name: 'Release', color: 'orange', items: ['writer'] })
  assert.equal(created.ok, true)
  const id = created.value.id

  const stored = await env.call('section-save', { id, workDir: env.project })
  assert.equal(stored.ok, true)
  samePath(stored.value.workDir, env.project)
  samePath(env.stateOf().sections.find(section => section.id === id).workDir, env.project)

  const cleared = await env.call('section-save', { id, workDir: '' })
  assert.equal(cleared.ok, true)
  assert.equal('workDir' in cleared.value, false)
  assert.equal('workDir' in env.stateOf().sections.find(section => section.id === id), false)
})

test('section-save creates a workspace folder for an existing section', async (t) => {
  const env = await start()
  t.after(env.stop)
  const created = await env.call('section-save', { name: 'Release', items: ['writer'] })
  const id = created.value.id

  const saved = await env.call('section-save', { id, newWorkspace: true })
  assert.equal(saved.ok, true)
  assert.equal(typeof saved.value.workDir, 'string', 'the existing section must carry the new workDir')
  assert.equal(isAbsolute(saved.value.workDir), true)
  assert.equal(isDir(saved.value.workDir), true)
  samePath(saved.value.workDir, join(env.team, 'Release'))
  assert.notEqual(pathKey(saved.value.workDir), pathKey(env.team))
  samePath(env.stateOf().sections.find(section => section.id === id).workDir, saved.value.workDir)
})

test('section-save creates a workspace folder for a new section', async (t) => {
  const env = await start()
  t.after(env.stop)
  const created = await env.call('section-save', { name: 'Release', newWorkspace: true })
  assert.equal(created.ok, true)
  const expected = join(env.team, 'Release')
  assert.equal(isDir(expected), true, 'newWorkspace must create the folder')
  assert.equal(typeof created.value.workDir, 'string', 'the new section must carry the workDir it created')
  assert.equal(isAbsolute(created.value.workDir), true)
  samePath(created.value.workDir, expected)
  samePath(env.stateOf().sections.find(section => section.id === created.value.id).workDir, expected)
})

test('section-save refuses a missing or relative folder and leaves the section unchanged', async (t) => {
  const env = await start()
  t.after(env.stop)
  const created = await env.call('section-save', { name: 'Release', color: 'orange', items: ['writer'] })
  const id = created.value.id
  const before = env.stateOf()

  const missing = await env.call('section-save', { id, name: 'Renamed', color: 'green', items: ['editor'], workDir: join(env.root, 'missing') })
  assert.equal(missing.ok, false)
  const relative = await env.call('section-save', { id, name: 'Renamed', color: 'green', items: ['editor'], workDir: 'relative' })
  assert.equal(relative.ok, false)

  const after = env.stateOf()
  assert.deepEqual(after.sections, before.sections)
  assert.equal(after.bots.writer.sectionId, before.bots.writer.sectionId)
  assert.equal(after.bots.editor.sectionId, undefined)
  assert.equal(after.sections[0].name, 'Release')
  assert.equal(after.sections[0].color, 'orange')
  assert.equal('workDir' in after.sections[0], false)
})

test('section-save refuses a folder around a private Bot and leaves the section unchanged', async (t) => {
  const env = await start(privateState)
  t.after(env.stop)
  const created = await env.call('section-save', { name: 'Release', color: 'orange', items: ['writer'] })
  const id = created.value.id
  const before = env.stateOf()

  const rejected = await env.call('section-save', { id, name: 'Renamed', color: 'green', items: ['editor'], workDir: env.privateDir })
  assert.equal(rejected.ok, false)
  assert.match(rejected.error.message, /private/i)

  const after = env.stateOf()
  assert.deepEqual(after.sections, before.sections)
  assert.equal(after.bots.writer.sectionId, before.bots.writer.sectionId)
  assert.equal(after.bots.editor.sectionId, undefined)
})

// ---------------------------------------------------------------------------
// batch-models.

test('batch-models sets one model for several Bots at once', async (t) => {
  const env = await start(modelState)
  t.after(env.stop)
  const result = await env.call('batch-models', { ids: ['writer', 'editor'], model: 'model-b' })
  assert.equal(result.ok, true)
  assert.deepEqual([...result.value.updated].sort(), ['editor', 'writer'])
  assert.deepEqual(result.value.skipped, [])
  assert.deepEqual(result.value.missing, [])

  const saved = env.stateOf()
  assert.equal(saved.bots.writer.model, 'fake/model-b')
  assert.equal(saved.bots.editor.model, 'fake/model-b')
  assert.equal(saved.bots.chief.model, 'fake/model-a')
})

test('batch-models skips a Bot on a local agent and still updates the rest', async (t) => {
  const env = await start(modelState)
  t.after(env.stop)
  const result = await env.call('batch-models', { ids: ['writer', 'coder'], model: 'model-b' })
  assert.equal(result.ok, true)
  assert.deepEqual(result.value.updated, ['writer'])
  const skipped = result.value.skipped.find(entry => entry.id === 'coder')
  assert.ok(skipped, 'the local-agent Bot must be listed in skipped')
  assert.equal(skipped.name, 'Coder')
  assert.equal(typeof skipped.reason, 'string')
  assert.match(skipped.reason, /local/i)

  const saved = env.stateOf()
  assert.equal(saved.bots.writer.model, 'fake/model-b')
  assert.equal(saved.bots.coder.model, 'local-claude-code/default')
})

test('batch-models reports unknown ids as missing without failing', async (t) => {
  const env = await start(modelState)
  t.after(env.stop)
  const result = await env.call('batch-models', { ids: ['writer', 'ghost'], model: 'model-b' })
  assert.equal(result.ok, true)
  assert.deepEqual(result.value.updated, ['writer'])
  assert.deepEqual(result.value.missing, ['ghost'])
  assert.deepEqual(result.value.skipped, [])
  assert.equal(env.stateOf().bots.ghost, undefined)
  assert.equal(env.stateOf().bots.writer.model, 'fake/model-b')
})

test('batch-models refuses an empty id list', async (t) => {
  const env = await start(modelState)
  t.after(env.stop)
  const result = await env.call('batch-models', { ids: [], model: 'model-b' })
  assert.equal(result.ok, false)
  assert.equal(result.error.message, 'Choose at least one Bot')
})
