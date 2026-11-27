import { useEffect, useRef, useState } from 'react'

// Full-screen camera scanner for barcodes (EAN/UPC on product packs) and QR codes.
// Uses the browser's built-in BarcodeDetector where it exists (Chrome on Android),
// otherwise loads the ZXing reader from a CDN on first use (iPhone Safari etc.),
// so nothing extra ships in the main bundle. Camera needs HTTPS (Vercel is HTTPS).
const ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm'
const FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']
const CAMERA = { video: { facingMode: { ideal: 'environment' } }, audio: false }

export default function Scanner({ title = 'Scan barcode / QR', onResult, onClose }) {
  const videoRef = useRef(null)
  const doneRef = useRef(false)
  const resultRef = useRef(onResult)
  resultRef.current = onResult
  const [status, setStatus] = useState('starting') // starting | scanning | error
  const [err, setErr] = useState('')
  const [manual, setManual] = useState('')

  useEffect(() => {
    let stream = null
    let timer = null
    let controls = null
    let cancelled = false

    const finish = (text) => {
      const code = String(text || '').trim()
      if (doneRef.current || !code) return
      doneRef.current = true
      try { navigator.vibrate?.(80) } catch { /* not supported */ }
      resultRef.current(code)
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error'); setErr('Camera is not available in this browser. Type the code below.'); return
      }
      try {
        let supported = []
        if ('BarcodeDetector' in window) {
          try { supported = await window.BarcodeDetector.getSupportedFormats() } catch { supported = [] }
        }
        const formats = FORMATS.filter((f) => supported.includes(f))
        if (formats.length) {
          const detector = new window.BarcodeDetector({ formats })
          stream = await navigator.mediaDevices.getUserMedia(CAMERA)
          if (cancelled) return
          const v = videoRef.current
          v.srcObject = stream
          await v.play()
          setStatus('scanning')
          const tick = async () => {
            if (cancelled || doneRef.current) return
            try {
              const codes = await detector.detect(v)
              if (codes.length) return finish(codes[0].rawValue)
            } catch { /* frame not ready yet */ }
            timer = setTimeout(tick, 150)
          }
          tick()
        } else {
          const { BrowserMultiFormatReader } = await import(/* @vite-ignore */ ZXING_URL)
          if (cancelled) return
          const reader = new BrowserMultiFormatReader()
          controls = await reader.decodeFromConstraints(CAMERA, videoRef.current, (res) => { if (res) finish(res.getText()) })
          if (cancelled) { controls.stop(); return }
          setStatus('scanning')
        }
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setErr(e?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera for this site in your browser settings, or type the code below.'
          : 'Could not start the camera. Type the code below.')
      }
    }
    start()

    return () => {
      cancelled = true
      clearTimeout(timer)
      try { controls?.stop() } catch { /* already stopped */ }
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function submitManual(e) {
    e.preventDefault()
    if (manual.trim()) { doneRef.current = true; onResult(manual.trim()) }
  }

  return (
    <div className="scanner" role="dialog" aria-label={title}>
      <div className="scanner-top">
        <b>{title}</b>
        <button className="btn ghost sm" onClick={onClose}>✕ Close</button>
      </div>
      <div className="scanner-view">
        <video ref={videoRef} playsInline muted />
        <div className="scanner-frame" />
        {status === 'starting' && <div className="scanner-msg">Starting camera…</div>}
        {status === 'scanning' && <div className="scanner-msg">Point the camera at the barcode or QR code</div>}
        {status === 'error' && <div className="scanner-msg err">{err}</div>}
      </div>
      <form className="scanner-manual" onSubmit={submitManual}>
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Or type the barcode number" inputMode="numeric" />
        <button className="btn primary sm">OK</button>
      </form>
    </div>
  )
}

// Free product lookup (Open Food Facts) to pre-fill name/size for a new barcode.
// Returns null when unknown or offline — the owner just types the details.
export async function lookupBarcode(code) {
  if (!/^\d{8,14}$/.test(code)) return null
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,quantity`)
    if (!r.ok) return null
    const j = await r.json()
    if (j.status !== 1 || !j.product?.product_name) return null
    const brand = (j.product.brands || '').split(',')[0].trim()
    const name = j.product.product_name.trim()
    return { name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name, unit: (j.product.quantity || '').trim() }
  } catch {
    return null
  }
}
