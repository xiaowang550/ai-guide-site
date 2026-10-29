'use client'
import { useEffect, useRef } from 'react'

/** Original procedural orbital sculpture. No video, remote assets or WebGL dependency. */
export function OrbitalCore({ paused }: { paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0,
      visible = true,
      angle = 0.4,
      last = 0,
      width = 560,
      height = 540
    const pointer = { x: 0, y: 0 }
    const resize = () => {
      width = el.clientWidth
      height = el.clientHeight
      const dpr = Math.min(devicePixelRatio || 1, 1.75)
      el.width = width * dpr
      el.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(() => {
      resize()
      schedule()
    })
    observer.observe(el)
    resize()
    const project = (x: number, y: number, z: number) => {
      const a = angle + pointer.x * 0.25,
        b = -0.3 + pointer.y * 0.2
      const xx = x * Math.cos(a) - z * Math.sin(a),
        zz = x * Math.sin(a) + z * Math.cos(a)
      const yy = y * Math.cos(b) - zz * Math.sin(b),
        depth = y * Math.sin(b) + zz * Math.cos(b)
      const scale = (Math.min(width, height) * 0.32) / (1.8 + depth * 0.2)
      return { x: width * 0.51 + xx * scale, y: height * 0.49 + yy * scale, z: depth }
    }
    const draw = (time: number) => {
      frame = 0
      if (document.hidden || !visible) return
      if (!paused && !reduced.matches) angle += Math.min(time - last || 16, 40) * 0.00012
      last = time
      ctx.clearRect(0, 0, width, height)
      const points = []
      const count = 240
      for (let i = 0; i < count; i++) {
        const y = 1 - (2 * i) / (count - 1),
          r = Math.sqrt(1 - y * y),
          a = i * 2.399963
        points.push(project(Math.cos(a) * r * 1.6, y * 1.6, Math.sin(a) * r * 1.6))
      }
      for (let ring = 0; ring < 6; ring++) {
        ctx.beginPath()
        for (let i = 0; i <= 160; i++) {
          const a = (i / 160) * Math.PI * 2,
            tilt = (ring / 6) * Math.PI
          const x = Math.cos(a) * 1.9,
            y = Math.sin(a) * 1.9
          const p = project(x, y * Math.cos(tilt), y * Math.sin(tilt))
          if (!i) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = ring % 2 ? 'rgba(215,255,100,.34)' : 'rgba(215,255,100,.65)'
        ctx.lineWidth = ring % 2 ? 0.6 : 1
        ctx.stroke()
      }
      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        ctx.fillStyle = `rgba(220,255,160,${0.25 + (p.z + 1.6) / 5})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.z > 0 ? 1.4 : 0.65, 0, Math.PI * 2)
        ctx.fill()
        if (i % 3 === 0) {
          const next = points[(i + 13) % points.length]
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(next.x, next.y)
          ctx.strokeStyle = 'rgba(215,255,100,.085)'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
      const center = project(0, 0, 0)
      const halo = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, width * 0.22)
      halo.addColorStop(0, 'rgba(220,255,140,.12)')
      halo.addColorStop(1, 'rgba(220,255,140,0)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, width, height)
      if (!paused && !reduced.matches) frame = requestAnimationFrame(draw)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw)
    }
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) {
        last = 0
        schedule()
      } else {
        cancelAnimationFrame(frame)
        frame = 0
      }
    })
    intersection.observe(el)
    const move = (event: PointerEvent) => {
      const r = el.getBoundingClientRect()
      pointer.x = (event.clientX - r.left) / r.width - 0.5
      pointer.y = (event.clientY - r.top) / r.height - 0.5
      schedule()
    }
    el.addEventListener('pointermove', move)
    document.addEventListener('visibilitychange', schedule)
    reduced.addEventListener('change', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      intersection.disconnect()
      el.removeEventListener('pointermove', move)
      document.removeEventListener('visibilitychange', schedule)
      reduced.removeEventListener('change', schedule)
    }
  }, [paused])
  return (
    <>
      <svg className="x-orb-fallback" viewBox="0 0 560 540" aria-hidden="true">
        <defs>
          <radialGradient id="x-orb-halo">
            <stop stopColor="#ceff6d" stopOpacity=".07" />
            <stop offset="1" stopColor="#ceff6d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="280" cy="270" r="230" fill="url(#x-orb-halo)" stroke="none" />
        {[-60, -30, 0, 30, 60, 90].map((angle) => (
          <ellipse
            key={angle}
            cx="280"
            cy="270"
            rx="200"
            ry="68"
            transform={`rotate(${angle} 280 270)`}
          />
        ))}
        <circle cx="280" cy="270" r="156" strokeDasharray="1 9" />
        <path
          d="M280 170 380 270 280 370 180 270Z M280 170 280 370 M180 270 380 270 M280 170 310 270 280 370 250 270Z"
          strokeOpacity=".5"
        />
      </svg>
      <canvas ref={canvas} className="x-orb-canvas" aria-hidden="true" />
    </>
  )
}
