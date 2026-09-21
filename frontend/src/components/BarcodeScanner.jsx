import { useEffect, useId, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
]

/**
 * Camera QR / barcode scanner. Stable across Strict Mode remounts.
 * Includes "upload image" fallback when camera is unavailable (desktop/HTTP).
 */
export default function BarcodeScanner({ onScan, onError, active = true, paused = false }) {
  const reactId = useId().replace(/:/g, '')
  const regionId = `sm-scanner-${reactId}`
  const scannerRef = useRef(null)
  const startingRef = useRef(false)
  const lastScanRef = useRef({ value: '', at: 0 })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('Starting camera...')
  const [cameras, setCameras] = useState([])
  const [cameraId, setCameraId] = useState('')
  const fileInputRef = useRef(null)

  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onScanRef.current = onScan
    onErrorRef.current = onError
  }, [onScan, onError])

  const emitScan = useCallback((decodedText) => {
    const text = String(decodedText || '').trim()
    if (!text) return
    const now = Date.now()
    if (text === lastScanRef.current.value && now - lastScanRef.current.at < 2000) return
    lastScanRef.current = { value: text, at: now }
    onScanRef.current?.(text)
  }, [])

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
    } catch {
      // ignore stop races
    }
    try {
      scanner.clear()
    } catch {
      // ignore
    }
  }, [])

  const startScanner = useCallback(
    async (preferredCameraId) => {
      if (!active || startingRef.current) return
      startingRef.current = true
      setStatus('starting')
      setMessage('Starting camera...')

      try {
        // Ensure previous instance is fully stopped (Strict Mode remount)
        await stopScanner()

        const scanner = new Html5Qrcode(regionId, {
          verbose: false,
          formatsToSupport: FORMATS,
          useBarCodeDetectorIfSupported: true,
        })
        scannerRef.current = scanner

        let deviceId = preferredCameraId
        if (!deviceId) {
          const list = await Html5Qrcode.getCameras()
          setCameras(list || [])
          if (!list?.length) {
            throw new Error(
              'No camera found. Use "Upload QR image" below, or open this page on a phone.'
            )
          }
          // Prefer back camera when label mentions it
          const back = list.find((c) => /back|rear|environment/i.test(c.label))
          deviceId = back?.id || list[list.length - 1].id
          setCameraId(deviceId)
        }

        const boxSize = Math.min(280, Math.floor(window.innerWidth * 0.7))

        await scanner.start(
          deviceId,
          {
            fps: 8,
            qrbox: (viewW, viewH) => {
              const w = Math.min(boxSize, Math.floor(viewW * 0.85))
              const h = Math.min(boxSize, Math.floor(viewH * 0.85))
              return { width: w, height: h }
            },
            aspectRatio: 1,
            disableFlip: false,
          },
          (decodedText) => emitScan(decodedText),
          () => {}
        )

        setStatus('ready')
        setMessage('Point camera at a QR code or barcode')
      } catch (err) {
        const name = err?.name || ''
        const raw = err?.message || String(err)
        let msg = raw
        if (name === 'NotAllowedError' || /permission|NotAllowed/i.test(raw)) {
          msg = 'Camera permission denied. Allow camera access, then tap Retry.'
        } else if (/secure|https|Only secure origins/i.test(raw)) {
          msg =
            'Camera needs HTTPS (or localhost). On a phone, use your PC IP over HTTPS, or upload a QR image below.'
        } else if (/play\(\)|AbortError|interrupted/i.test(raw)) {
          msg = 'Camera was interrupted. Tap Retry.'
        }
        setStatus('error')
        setMessage(msg)
        onErrorRef.current?.(msg)
      } finally {
        startingRef.current = false
      }
    },
    [active, emitScan, regionId, stopScanner]
  )

  useEffect(() => {
    if (!active) {
      stopScanner()
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) startScanner(cameraId || undefined)
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
      stopScanner()
    }
    // Intentionally omit cameraId — switching cameras uses onChange handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, startScanner, stopScanner])

  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner?.isScanning) return
    if (paused) {
      scanner.pause(true).catch(() => {})
    } else {
      scanner.resume().catch(() => {})
    }
  }, [paused])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus('starting')
    setMessage('Reading image...')
    try {
      // Use a temporary scanner for file decode so we don't fight the live camera
      const tempId = `${regionId}-file`
      let holder = document.getElementById(tempId)
      if (!holder) {
        holder = document.createElement('div')
        holder.id = tempId
        holder.style.display = 'none'
        document.body.appendChild(holder)
      }
      const fileScanner = new Html5Qrcode(tempId, {
        verbose: false,
        formatsToSupport: FORMATS,
      })
      const decoded = await fileScanner.scanFile(file, true)
      try {
        fileScanner.clear()
      } catch {
        // ignore
      }
      holder.remove()
      setStatus('ready')
      setMessage('Code found in image')
      emitScan(decoded)
    } catch (err) {
      setStatus('error')
      const msg = err?.message || 'No QR/barcode found in that image'
      setMessage(msg)
      onErrorRef.current?.(msg)
    }
  }

  const handleRetry = () => {
    startScanner(cameraId || undefined)
  }

  const handleCameraChange = async (e) => {
    const next = e.target.value
    setCameraId(next)
    await stopScanner()
    await startScanner(next)
  }

  if (!active) return null

  return (
    <div className="space-y-3">
      <div
        id={regionId}
        className="min-h-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner [&_video]:!w-full [&_video]:rounded-2xl [&_img]:!w-full"
      />

      <p
        className={`text-center text-sm font-medium ${
          status === 'error' ? 'text-red-600' : status === 'ready' ? 'text-emerald-700' : 'text-slate-500'
        }`}
      >
        {message}
      </p>

      {cameras.length > 1 && status === 'ready' && (
        <select
          value={cameraId}
          onChange={handleCameraChange}
          className="input-field text-sm"
        >
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label || `Camera ${c.id.slice(0, 6)}`}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap gap-2">
        {status === 'error' && (
          <button type="button" onClick={handleRetry} className="btn-primary flex-1 text-sm py-2.5">
            Retry camera
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary flex-1 text-sm py-2.5"
        >
          Upload QR image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
