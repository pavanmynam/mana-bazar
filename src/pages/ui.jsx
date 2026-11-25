import { ORDER_STEPS, STATUS_LABEL } from '../store'

export function StatusBadge({ s }) {
  return <span className={'badge st-' + s}>{STATUS_LABEL[s] || s}</span>
}

export function Tracker({ o }) {
  if (o.status === 'cancelled' || o.status === 'rejected') {
    return <div className="warn">This order was {o.status === 'cancelled' ? 'cancelled' : 'rejected by the shop'}.</div>
  }
  const cur = ORDER_STEPS.indexOf(o.status)
  return (
    <ol className="tracker">
      {ORDER_STEPS.map((st, i) => {
        const h = o.history.find((x) => x.status === st)
        return (
          <li key={st} className={i <= cur ? 'done' : ''}>
            <span className="dot">{i <= cur ? '✓' : ''}</span>
            <div>
              <b>{STATUS_LABEL[st]}</b>
              {h && <small>{new Date(h.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function BottomNav({ tab, setTab, items }) {
  return (
    <nav className="bottom-nav">
      {items.map(([id, icon, label]) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  )
}

export function Stat({ icon, label, value, tone }) {
  return (
    <div className={'stat ' + (tone || '')}>
      <span>{icon}</span>
      <div><b>{value}</b><small>{label}</small></div>
    </div>
  )
}
