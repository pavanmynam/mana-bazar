// Small UI effects: tap sounds and animations, each with an on/off switch
// (Profile → Sounds / Animations). Sounds are made with the Web Audio API,
// so there are no audio files to download.
const KEY = 'manabazar_fx_v1'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
let prefs = { sound: true, motion: true, ...read() }

export const fxPrefs = () => ({ ...prefs })
export function setFxPref(k, v) {
  prefs = { ...prefs, [k]: v }
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* private mode */ }
  applyMotion()
}
function applyMotion() {
  document.documentElement.classList.toggle('no-anim', !prefs.motion)
}

let ctx = null
function tone(freq, dur = 0.06, vol = 0.05, type = 'sine', delay = 0, slideTo = null) {
  if (!prefs.sound) return
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(ctx.destination)
    o.start(t); o.stop(t + dur + 0.02)
  } catch { /* no audio available */ }
}

export const sfx = {
  tap: () => tone(1400, 0.035, 0.025, 'triangle'),
  add: () => { tone(520, 0.08, 0.06, 'sine', 0, 880) },
  remove: () => { tone(700, 0.07, 0.045, 'sine', 0, 420) },
  success: () => { tone(660, 0.12, 0.06); tone(880, 0.12, 0.06, 'sine', 0.1); tone(1320, 0.2, 0.05, 'sine', 0.2) },
  error: () => { tone(220, 0.15, 0.06, 'square') },
}

// One listener for the whole app: picks a sound from what was tapped.
export function installFx() {
  applyMotion()
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, .btn, a, label.radio, .chips button, .photo-pick, .mp-add')
    if (!el || el.disabled) return
    const txt = (el.textContent || '').trim()
    if (el.matches('.btn.add') || (el.closest('.qty') && txt === '+')) sfx.add()
    else if (el.closest('.qty') && txt === '−') sfx.remove()
    else sfx.tap()
  }, { capture: true, passive: true })
}
