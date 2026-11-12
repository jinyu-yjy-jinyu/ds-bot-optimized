// The Work groups page: one group per roster section, each with a working folder its
// Bots and group chats share. A group works in the team workspace until it gets a
// folder of its own. The first Main Bot is never a member of a group.
import { createElement as h, useEffect, useState } from 'react'
import { BotAvatar } from './mark.js'
import { FolderMenu } from './folder-menu.js'
import { ChevronRightIcon, PlusIcon } from './icons.js'
import { t } from './i18n.js'

// The team workspace, where a group without a folder of its own works.
function TeamWorkspace({ actions, run, Section, Row }) {
  const [team, setTeam] = useState(null)
  useEffect(() => {
    void Promise.resolve(actions.folders()).then(info => setTeam(info?.team ?? null)).catch(() => {})
  }, [])
  return h(Section, { title: t('Team workspace') },
    h(Row, { label: t('Team workspace'), hint: t('Where Bots without a folder of their own work.') },
      team === null ? null : h(FolderMenu, { value: team, team: true, actions, run, onPick: path => run(actions.setTeamWorkspace(path)) })))
}

// One group: its name, its folder, its members and the way to delete it.
function WorkGroupCard({ sec, roster, actions, run, Row }) {
  const [draft, setDraft] = useState(sec.name)
  const [confirming, setConfirming] = useState(false)
  useEffect(() => setDraft(sec.name), [sec.name])
  // A delete that is asked for once and not again goes back to its normal state.
  useEffect(() => {
    if (!confirming) return undefined
    const timer = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(timer)
  }, [confirming])
  const commitName = () => {
    const name = draft.trim()
    if (name === '' || name === sec.name) { setDraft(sec.name); return }
    void run(actions.saveSection({ id: sec.id, name })).then(ok => { if (!ok) setDraft(sec.name) })
  }
  const remove = () => {
    if (!confirming) { setConfirming(true); return }
    setConfirming(false)
    void run(actions.deleteSection(sec.id))
  }
  const bots = (roster.bots ?? []).filter(bot => bot.id !== roster.mainBotIds?.[0]).map(bot => ({ entry: bot, room: false }))
  const rooms = (roster.rooms ?? []).map(room => ({ entry: room, room: true }))
  const members = [...bots, ...rooms]
  const count = members.filter(({ entry }) => entry.sectionId === sec.id).length
  const memberRow = ({ entry, room }) => h('label', { key: entry.id, className: 'bt-set-row' },
    h('span', { className: 'bt-set-bot' },
      h('input', {
        type: 'checkbox',
        checked: entry.sectionId === sec.id,
        onChange: event => run(event.target.checked
          ? actions.saveSection({ id: sec.id, add: [entry.id] })
          : actions.saveSection({ id: sec.id, remove: [entry.id] })),
      }),
      room ? null : h(BotAvatar, { bot: entry, size: 20, badge: false, live: false }),
      h('span', { className: 'bt-row-title' }, entry.name),
      room ? h('span', { className: 'bt-tag' }, t('Group chat')) : null))
  return h('div', { className: 'bt-set-card' },
    h('div', { className: 'bt-set-row bt-bs-row' },
      h('span', { className: 'bt-set-copy' },
        h('span', { className: 'bt-bs-label' }, t('Group name')),
        h('input', {
          className: 'bt-input', value: draft, maxLength: 32, spellCheck: false, 'aria-label': t('Group name'),
          onChange: event => setDraft(event.target.value),
          onBlur: commitName,
          onKeyDown: (event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.target.blur() },
        }))),
    h('div', { className: 'bt-set-row bt-bs-row' },
      h('span', { className: 'bt-set-copy' },
        h('span', { className: 'bt-bs-label' }, t('Working folder')),
        h('span', { className: 'bt-set-hint bt-folder-path', title: sec.workDir ?? undefined }, sec.workDir ?? t('Team workspace'))),
      h('div', { className: 'bt-set-control' },
        h(FolderMenu, { value: sec.workDir, actions, run, onPick: workDir => run(actions.saveSection({ id: sec.id, workDir })) }),
        h('button', { type: 'button', className: 'bt-soft bt-soft-sm', onClick: () => run(actions.saveSection({ id: sec.id, newWorkspace: true })) }, t('New workspace')),
        sec.workDir ? h('button', { type: 'button', className: 'bt-soft bt-soft-sm', onClick: () => run(actions.saveSection({ id: sec.id, workDir: '' })) }, t('Use team workspace')) : null)),
    h(Row, { label: t('Members'), hint: t('{count} members', { count }) }),
    members.map(memberRow),
    h('button', {
      type: 'button', className: 'bt-set-row bt-bs-row bt-bs-danger', 'data-confirm': confirming || undefined, onClick: remove,
    },
    h('span', { className: 'bt-set-copy' },
      h('span', { className: 'bt-bs-label' }, confirming ? t('Delete {name}?', { name: sec.name }) : t('Delete work group')),
      h('span', { className: 'bt-set-hint' }, confirming ? t('Click again to delete. Its folder is kept.') : t('Removes the work group. Its Bots and group chats stay on the team.'))),
    h('span', { className: 'bt-chevron' }, h(ChevronRightIcon))))
}

export function WorkGroupsPage({ roster, actions, run, Section, Row }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const sections = roster.sections ?? []
  const create = () => {
    const wanted = name.trim()
    if (busy || wanted === '') return
    setBusy(true)
    void run(actions.saveSection({ name: wanted, newWorkspace: true })).then((ok) => {
      setBusy(false)
      if (ok) { setName(''); setCreating(false) }
    })
  }
  const cancel = () => { setName(''); setCreating(false) }
  return [
    h(TeamWorkspace, { key: 'team', actions, run, Section, Row }),
    h('section', { key: 'groups', className: 'bt-set-section' },
      h('h3', null, t('Work groups · {count}', { count: sections.length })),
      creating
        ? h('div', { className: 'bt-set-card' },
            h('div', { className: 'bt-set-row' },
              h('span', { className: 'bt-set-copy' },
                h('input', {
                  className: 'bt-input', autoFocus: true, value: name, maxLength: 32, spellCheck: false,
                  placeholder: t('Group name'), 'aria-label': t('Group name'),
                  onChange: event => setName(event.target.value),
                  onKeyDown: (event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) create() },
                })),
              h('div', { className: 'bt-set-control' },
                h('button', { type: 'button', className: 'bt-send bt-soft-sm', disabled: busy || name.trim() === '', onClick: create }, t('Create')),
                h('button', { type: 'button', className: 'bt-soft bt-soft-sm', onClick: cancel }, t('Cancel')))))
        : h('div', { className: 'bt-actions' },
            h('button', { type: 'button', className: 'bt-soft bt-soft-sm bt-with-icon', onClick: () => setCreating(true) }, h(PlusIcon), t('New group'))),
      sections.length === 0
        ? h('div', { className: 'bt-set-card' },
            h(Row, { label: t('No work groups yet.'), hint: t('A work group shares one folder for the Bots and group chats in it.') }))
        : sections.map(sec => h(WorkGroupCard, { key: sec.id, sec, roster, actions, run, Row }))),
  ]
}
