// The Bot models page: one model for several Bots at once. A Bot that runs on a local
// agent keeps its own settings, so its row cannot be picked here.
import { createElement as h, useState } from 'react'
import { BotAvatar } from './mark.js'
import { groupModels, modelOf } from './model-menu.js'
import { isLocalRoute } from './agent-routes.js'
import { hostText, t } from './i18n.js'

export function BotModelsPage({ roster, actions, run, Section, Row }) {
  const [selected, setSelected] = useState(() => new Set())
  const [model, setModel] = useState('')
  const [group, setGroup] = useState('')
  const [result, setResult] = useState(null)
  const bots = roster.bots ?? []
  const groups = groupModels((roster.models ?? []).filter(entry => !isLocalRoute(entry.ref)))
  const onAgent = bot => bot.engine !== undefined || isLocalRoute(bot.model ?? bot.appliedModel)
  const shown = group === '' ? bots : bots.filter(bot => bot.sectionId === group)
  const pickable = shown.filter(bot => !onAgent(bot))
  const toggle = (id) => setSelected((previous) => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const pickGroup = (id) => { setGroup(id); setSelected(new Set()) }
  const apply = () => {
    if (selected.size === 0 || model === '') return
    setResult(null)
    void run(Promise.resolve(actions.setBotModels([...selected], model)).then((value) => {
      setResult(value ?? null)
      setSelected(new Set())
    }))
  }
  const names = ids => ids.map(id => roster.byId?.[id]?.name ?? id).join(t(', '))
  const skipped = result?.skipped ?? []
  const updated = result?.updated ?? []
  // The host skips a Bot a local agent runs; anything else it skipped carries its own reason.
  const agentOnly = skipped.length > 0 && skipped.every(row => row.reason === 'Runs on a local agent')
  const outcome = agentOnly
    ? t('Skipped {count} Bots that run on a local agent.', { count: skipped.length })
    : skipped.length > 0
      ? t('Skipped {count} Bots.', { count: skipped.length })
      : t('Updated {count} Bots.', { count: updated.length })
  const outcomeHint = skipped.length > 0
    ? skipped.map(row => (row.reason && row.reason !== 'Runs on a local agent'
        ? `${row.name ?? row.id} · ${hostText(row.reason)}`
        : row.name ?? row.id)).join(t(', '))
    : names(updated)
  const botRow = bot => h(Row, {
    key: bot.id,
    label: h('label', { className: 'bt-set-bot' },
      h('input', {
        type: 'checkbox', checked: selected.has(bot.id), disabled: onAgent(bot),
        onChange: () => toggle(bot.id),
      }),
      h(BotAvatar, { bot, size: 20, badge: false, live: false }),
      h('span', { className: 'bt-row-title' }, bot.name),
      h('span', { className: 'bt-set-hint bt-row-title' }, modelOf(bot, roster)?.name ?? t('No model yet'))),
  }, onAgent(bot) ? h('span', { className: 'bt-tag' }, t('Local agent')) : null)
  return [
    h('p', { key: 'note', className: 'bt-browser-note' }, t('Set several Bots to one model at once.')),
    h(Section, { key: 'bots', title: t('Bots · {count}', { count: shown.length }) },
      bots.length === 0
        ? h(Row, { label: t('No Bots yet.') })
        : [
            h(Row, { key: 'choose', label: t('Choose Bots') },
              h('button', { type: 'button', className: 'bt-soft bt-soft-sm', disabled: pickable.length === 0, onClick: () => setSelected(new Set(pickable.map(bot => bot.id))) }, t('Select all')),
              h('button', { type: 'button', className: 'bt-soft bt-soft-sm', disabled: selected.size === 0, onClick: () => setSelected(new Set()) }, t('Clear selection')),
              h('select', {
                className: 'bt-select', 'aria-label': t('Work groups'), value: group,
                onChange: event => pickGroup(event.target.value),
              },
              h('option', { value: '' }, t('All Bots')),
              (roster.sections ?? []).map(sec => h('option', { key: sec.id, value: sec.id }, sec.name)))),
            shown.length === 0
              ? h(Row, { key: 'none', label: t('No Bots match') })
              : shown.map(botRow),
          ]),
    h(Section, { key: 'model', title: t('Model') },
      h(Row, { label: t('Model') },
        h('select', {
          className: 'bt-select', 'aria-label': t('Model'), value: model,
          onChange: event => setModel(event.target.value),
        },
        h('option', { value: '' }, t('Choose a model…')),
        groups.map(([provider, list]) => h('optgroup', { key: provider, label: provider },
          list.map(entry => h('option', { key: entry.ref, value: entry.ref }, entry.name))))),
        h('button', {
          type: 'button', className: 'bt-send bt-soft-sm', disabled: selected.size === 0 || model === '',
          onClick: apply,
        }, t('Apply model'))),
      result === null ? null : h(Row, {
        label: skipped.length > 0 ? h('span', { className: 'bt-danger' }, outcome) : outcome,
        hint: outcomeHint === '' ? undefined : outcomeHint,
      })),
  ]
}
