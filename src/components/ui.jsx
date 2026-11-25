import { useState } from 'react'
import { ORDER_STEPS, STATUS_LABEL } from '../lib/constants'

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
        const h = (o.history || []).find((x) => x.status === st)
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
      {items.map(([id, icon, label, count]) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
          <span className="nav-ico">{icon}{count ? <i className="dotcount">{count}</i> : null}</span>
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

export function Img({ src, emoji, className = '', alt = '' }) {
  const [bad, setBad] = useState(false)
  if (src && !bad) return <img className={'img ' + className} src={src} alt={alt} loading="lazy" onError={() => setBad(true)} />
  return <div className={'img emoji ' + className}>{emoji || '📦'}</div>
}

export function Stars({ value, count }) {
  if (!Number(value)) return <span className="rating new">New</span>
  return <span className="rating">★ {Number(value).toFixed(1)}{count ? <small> ({count})</small> : null}</span>
}

export function StarInput({ value, onChange }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  )
}

export function Sheet({ title, onClose, children }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  )
}

export const Loading = () => <div className="loading"><span className="spinner" /></div>
export const Empty = ({ icon = '😕', title, sub, children }) => (
  <div className="empty"><div className="empty-ico">{icon}</div><b>{title}</b>{sub && <small>{sub}</small>}{children}</div>
)
