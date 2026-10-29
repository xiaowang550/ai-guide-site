'use client'

import { useEffect, useId, useRef, useState } from 'react'

type Mode = 'idle' | 'focus' | 'warp'
type Point = { x: number; y: number; z: number }
const MODES: { id: Mode; label: string; code: string; description: string }[] = [
  { id: 'idle', label: '待命', code: '01', description: '在这里。准备和你开始一项新任务。' },
  { id: 'focus', label: '专注', code: '02', description: '目光锁定，一次只做好一件事。' },
  { id: 'warp', label: '跃迁', code: '03', description: '能量就绪，向下一个想法出发。' },
]
const TAU = Math.PI * 2
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** An original 2.5D companion: lit surfaces, projected parts and a gaze that follows you. */
export function OrbitalCore({ paused }: { paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLButtonElement>(null)
  const redraw = useRef<(() => void) | null>(null)
  const [mode, setMode] = useState<Mode>('idle')
  const [greeting, setGreeting] = useState(0)
  const [ready, setReady] = useState(false)
  const controls = useRef<(HTMLButtonElement | null)[]>([])
  const captionId = useId()
  const gradientId = useId().replace(/:/g, '')
  const settings = useRef({ paused, mode, greeting })

  useEffect(() => {
    settings.current = { paused, mode, greeting }
    redraw.current?.()
  }, [paused, mode, greeting])

  useEffect(() => {
    const element = canvas.current
    const hitArea = stage.current
    if (!element || !hitArea) return
    const context = element.getContext('2d', { alpha: true })
    if (!context) return
    const ctx = context
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 540
    let height = 400
    let frame = 0
    let visible = true
    let disposed = false
    let dirty = true
    let lastStamp = 0
    let clock = 0
    let observedGreeting = 0
    let greetAt = -10
    let focusMix = 0
    let warpMix = 0
    let yaw = 0
    let pitch = 0
    let roll = 0
    let unit = 100
    let centerX = 270
    let centerY = 200
    const target = { x: 0, y: 0 }
    const gaze = { x: 0, y: 0 }
    const stars = Array.from({ length: 23 }, (_, index) => ({
      x: ((index * 137.508) % 100) / 100,
      y: ((index * 73.913 + 17) % 100) / 100,
      size: index % 5 === 0 ? 1.2 : 0.65,
    }))

    function project(point: Point) {
      const x = point.x * Math.cos(yaw) + point.z * Math.sin(yaw)
      const z = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw)
      const y = point.y * Math.cos(pitch) - z * Math.sin(pitch)
      const depth = point.y * Math.sin(pitch) + z * Math.cos(pitch)
      const k = 4.8 / (4.8 + depth)
      const rx = x * Math.cos(roll) - y * Math.sin(roll)
      const ry = x * Math.sin(roll) + y * Math.cos(roll)
      return { x: centerX + rx * unit * k, y: centerY + ry * unit * k, k, z: depth }
    }

    function ellipse(x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
      ctx.beginPath()
      ctx.ellipse(x, y, Math.max(0.0001, rx), Math.max(0.0001, ry), 0, 0, TAU)
      ctx.fillStyle = fill
      ctx.fill()
    }

    function panel(x: number, y: number, w: number, h: number, radius: number) {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, radius)
    }

    function surface(center: Point, rx: number, ry: number, material: 'metal' | 'dark' = 'metal') {
      const p = project(center)
      const sx = rx * unit * p.k
      const sy = ry * unit * p.k
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(roll)
      ctx.scale(sx, sy)
      const gradient = ctx.createRadialGradient(-0.39, -0.48, 0.02, 0.05, 0.08, 1.13)
      if (material === 'metal') {
        gradient.addColorStop(0, '#ffffff')
        gradient.addColorStop(0.23, '#eaf0eb')
        gradient.addColorStop(0.5, '#a9b8b6')
        gradient.addColorStop(0.75, '#536164')
        gradient.addColorStop(0.92, '#263336')
        gradient.addColorStop(1, '#758983')
      } else {
        gradient.addColorStop(0, '#536565')
        gradient.addColorStop(0.25, '#283838')
        gradient.addColorStop(0.65, '#0d1718')
        gradient.addColorStop(1, '#020708')
      }
      ellipse(0, 0, 1, 1, gradient)
      ctx.beginPath()
      ctx.ellipse(0, 0, 0.99, 0.99, 0, -Math.PI * 0.96, -Math.PI * 0.08)
      ctx.strokeStyle = material === 'metal' ? 'rgba(246,255,251,.82)' : 'rgba(185,219,211,.42)'
      ctx.lineWidth = 0.009
      ctx.stroke()
      ctx.restore()
    }

    function plane(center: Point, paint: () => void) {
      const p = project(center)
      const xx = project({ ...center, x: center.x + 1 })
      const yy = project({ ...center, y: center.y + 1 })
      ctx.save()
      ctx.transform(xx.x - p.x, xx.y - p.y, yy.x - p.x, yy.y - p.y, p.x, p.y)
      paint()
      ctx.restore()
    }

    function rod(a: Point, b: Point, radius: number) {
      const first = project(a)
      const last = project(b)
      const gradient = ctx.createLinearGradient(first.x - 6, first.y, last.x + 5, last.y)
      gradient.addColorStop(0, '#4b605e')
      gradient.addColorStop(0.35, '#e7f3e9')
      gradient.addColorStop(0.65, '#a7b7b0')
      gradient.addColorStop(1, '#2c3e3b')
      ctx.beginPath()
      ctx.moveTo(first.x, first.y)
      ctx.lineTo(last.x, last.y)
      ctx.strokeStyle = gradient
      ctx.lineWidth = radius * unit * (first.k + last.k) * 0.5
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    function glow(p: Point, radius: number, intensity: number, blue = false) {
      const point = project(p)
      const r = Math.max(1, radius * unit * point.k)
      const color = blue ? '163,234,255' : '205,255,113'
      const light = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, r)
      light.addColorStop(0, `rgba(${color},${intensity})`)
      light.addColorStop(0.25, `rgba(${color},${intensity * 0.45})`)
      light.addColorStop(1, `rgba(${color},0)`)
      ellipse(point.x, point.y, r, r, light)
    }

    function orbit(front: boolean, time: number) {
      const tilt = 0.4 + focusMix * 0.08
      const radius = 1.13 + warpMix * 0.13
      const offset = time * (0.18 + warpMix * 0.5)
      for (let band = 0; band < 2; band++) {
        ctx.beginPath()
        let drawing = false
        for (let i = 0; i <= 100; i++) {
          const angle = (i / 100) * TAU + offset
          const point = {
            x: Math.cos(angle) * radius,
            y: 0.3 + Math.sin(angle) * radius * tilt,
            z: Math.sin(angle) * radius * 0.68,
          }
          if (band === 1) {
            point.y -= 0.13
            point.z *= -1
          }
          const p = project(point)
          if (p.z < 0 !== front) {
            drawing = false
            continue
          }
          if (!drawing) {
            ctx.moveTo(p.x, p.y)
            drawing = true
          } else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle =
          band === 0
            ? `rgba(205,255,113,${front ? 0.29 : 0.13})`
            : `rgba(171,205,208,${front ? 0.15 : 0.08})`
        ctx.lineWidth = band === 0 ? 1 : 0.7
        ctx.stroke()
      }
      for (let index = 0; index < 3; index++) {
        const angle = offset * 1.6 + index * 2.09
        const p = {
          x: Math.cos(angle) * radius,
          y: 0.3 + Math.sin(angle) * radius * tilt,
          z: Math.sin(angle) * radius * 0.68,
        }
        if (project(p).z < 0 !== front) continue
        glow(p, 0.095, 0.3)
        const dot = project(p)
        ellipse(dot.x, dot.y, 2, 2, '#d7ff84')
      }
    }

    function draw(time: number, motion: boolean) {
      if (settings.current.greeting !== observedGreeting) {
        observedGreeting = settings.current.greeting
        greetAt = time
      }
      const amount = motion ? 0.1 : 1
      focusMix = mix(focusMix, settings.current.mode === 'focus' ? 1 : 0, amount)
      warpMix = mix(warpMix, settings.current.mode === 'warp' ? 1 : 0, amount)
      gaze.x = mix(gaze.x, target.x, motion ? 0.12 : 1)
      gaze.y = mix(gaze.y, target.y, motion ? 0.12 : 1)
      const greetAge = time - greetAt
      const greetingActive = observedGreeting > 0 && greetAge < 2.1
      const hello = greetingActive
        ? motion
          ? Math.sin((clamp(greetAge / 0.25, 0, 1) * Math.PI) / 2) *
            Math.min(1, (2.1 - greetAge) / 0.35)
          : 1
        : 0
      const bob = motion ? Math.sin(time * 1.8) * 0.045 * (1 - focusMix * 0.7) : 0
      yaw = -gaze.x * 0.4 + Math.sin(time * 0.42) * 0.07
      pitch = -0.055 + gaze.y * 0.13 + focusMix * 0.09
      roll = Math.sin(time * 0.8) * 0.022 - warpMix * 0.14
      unit = Math.min(width * 0.35, height * 0.345)
      centerX = width * 0.5
      centerY = height * 0.54 + bob * unit - warpMix * 0.045 * unit
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Sparse depth cues, a soft ground shadow, and a lit landing ring.
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
        const shine = 0.14 + (Math.sin(time * 0.7 + i) + 1) * 0.07
        ellipse(star.x * width, star.y * height, star.size, star.size, `rgba(190,218,198,${shine})`)
      }
      const groundY = height * 0.87
      const shadow = ctx.createRadialGradient(centerX, groundY, 0, centerX, groundY, unit * 0.8)
      shadow.addColorStop(0, 'rgba(186,255,97,.16)')
      shadow.addColorStop(0.48, 'rgba(121,189,83,.055)')
      shadow.addColorStop(1, 'rgba(121,189,83,0)')
      ellipse(centerX, groundY, unit * 0.84, unit * 0.12, shadow)
      ctx.beginPath()
      ctx.ellipse(centerX, groundY, unit * (0.57 + warpMix * 0.18), unit * 0.075, 0, 0, TAU)
      ctx.strokeStyle = `rgba(201,255,115,${0.17 + warpMix * 0.18})`
      ctx.lineWidth = 0.8
      ctx.stroke()
      orbit(false, time)
      glow({ x: 0, y: -0.1, z: 0.3 }, 1.25, 0.1 + warpMix * 0.06)

      // Rear limbs are painted first, so the floating body occludes their joints.
      for (const side of [-1, 1]) {
        const wave = side === 1 ? hello : 0
        const shoulder = { x: side * 0.34, y: 0.08, z: 0.02 }
        const elbow = {
          x: side * (0.5 + wave * 0.12),
          y: 0.3 - wave * 0.45 + warpMix * 0.05,
          z: -0.035 + warpMix * 0.16,
        }
        const hand = {
          x: side * (0.49 + wave * (0.19 + Math.sin(time * 13) * 0.055)),
          y: 0.49 - wave * 1.01 + focusMix * -0.12 + warpMix * -0.01,
          z: -0.09 - focusMix * 0.25 + warpMix * 0.25,
        }
        rod(shoulder, elbow, 0.115)
        surface(elbow, 0.09, 0.1, 'dark')
        rod(elbow, hand, 0.11)
        surface(shoulder, 0.135, 0.15)
        surface(hand, 0.105, 0.13)
        const palm = project({ ...hand, z: hand.z - 0.07 })
        ellipse(palm.x, palm.y + 0.015 * unit, 0.025 * unit, 0.04 * unit, '#243c38')
      }

      // Small articulated boots and their cold, sculpted propulsion nozzles.
      for (const side of [-1, 1]) {
        const foot = { x: side * 0.16, y: 0.72 - warpMix * 0.04, z: -0.025 }
        surface({ ...foot, y: foot.y - 0.07 }, 0.095, 0.17, 'dark')
        surface(foot, 0.15, 0.14)
        plane({ ...foot, y: foot.y + 0.095, z: -0.05 }, () => {
          ellipse(0, 0, 0.09, 0.025, '#132523')
          ellipse(0, 0.004, 0.055, 0.012, '#bfeea2')
          if (warpMix > 0.03) {
            const jet = ctx.createLinearGradient(0, 0, 0, 0.4)
            jet.addColorStop(0, `rgba(218,255,169,${warpMix * 0.9})`)
            jet.addColorStop(0.3, `rgba(157,230,220,${warpMix * 0.35})`)
            jet.addColorStop(1, 'rgba(153,233,212,0)')
            ctx.beginPath()
            ctx.moveTo(-0.045, 0.025)
            ctx.quadraticCurveTo(-0.09, 0.19, 0, 0.42 + Math.sin(time * 20) * 0.03)
            ctx.quadraticCurveTo(0.09, 0.19, 0.045, 0.025)
            ctx.fillStyle = jet
            ctx.fill()
          }
        })
      }

      surface({ x: 0, y: 0.25, z: 0 }, 0.32, 0.37)
      plane({ x: 0, y: 0.2, z: -0.3 }, () => {
        const metal = ctx.createLinearGradient(-0.18, -0.2, 0.17, 0.25)
        metal.addColorStop(0, '#263c39')
        metal.addColorStop(0.45, '#111f1e')
        metal.addColorStop(1, '#40544c')
        panel(-0.19, -0.21, 0.38, 0.4, 0.15)
        ctx.fillStyle = metal
        ctx.fill()
        ctx.strokeStyle = 'rgba(210,235,220,.38)'
        ctx.lineWidth = 0.009
        ctx.stroke()
        ctx.save()
        ctx.translate(0, -0.045)
        ctx.rotate(time * (0.2 + warpMix * 0.6))
        ctx.strokeStyle = '#d7ff84'
        ctx.lineWidth = 0.013
        for (const tilt of [-0.7, 0.7]) {
          ctx.beginPath()
          ctx.ellipse(0, 0, 0.04, 0.092, tilt, 0, TAU)
          ctx.stroke()
        }
        ctx.restore()
        for (let i = 0; i < 3; i++) {
          panel(-0.06 + i * 0.05, 0.11, 0.022, 0.012, 0.005)
          ctx.fillStyle = i <= Math.round(warpMix * 2) ? '#d7ff84' : '#50675c'
          ctx.fill()
        }
      })

      // A gap between collar and helmet makes the head feel magnetically suspended.
      surface({ x: 0, y: -0.15, z: 0 }, 0.17, 0.055, 'dark')
      plane({ x: 0, y: -0.18, z: -0.04 }, () => {
        ctx.beginPath()
        ctx.ellipse(0, 0, 0.19, 0.045, 0, 0, TAU)
        ctx.strokeStyle = '#c1ef97'
        ctx.lineWidth = 0.018
        ctx.stroke()
      })

      const headY = -0.66 - focusMix * 0.025 - hello * 0.035
      for (const side of [-1, 1]) {
        surface({ x: side * 0.47, y: headY, z: 0.04 }, 0.115, 0.17, 'dark')
        surface({ x: side * 0.5, y: headY - 0.015, z: -0.055 }, 0.075, 0.12)
      }
      rod({ x: 0, y: headY - 0.33, z: 0.05 }, { x: 0.025, y: headY - 0.58, z: 0.04 }, 0.027)
      surface({ x: 0.025, y: headY - 0.58, z: 0.04 }, 0.065, 0.065, 'dark')
      glow({ x: 0.025, y: headY - 0.58, z: 0.03 }, 0.18, 0.24 + warpMix * 0.2)
      surface({ x: 0, y: headY, z: 0 }, 0.5, 0.42)

      plane({ x: 0, y: headY + 0.005, z: -0.32 }, () => {
        // The glass face is deliberately inset, with a bright machined rim and one soft reflection.
        const rim = ctx.createLinearGradient(-0.4, -0.25, 0.37, 0.26)
        rim.addColorStop(0, '#eff6f0')
        rim.addColorStop(0.28, '#a3b6ac')
        rim.addColorStop(0.6, '#1a2c2b')
        rim.addColorStop(1, '#789085')
        panel(-0.416, -0.278, 0.832, 0.535, 0.23)
        ctx.fillStyle = rim
        ctx.fill()
        const glass = ctx.createLinearGradient(-0.22, -0.25, 0.3, 0.28)
        glass.addColorStop(0, '#314c48')
        glass.addColorStop(0.3, '#132623')
        glass.addColorStop(0.62, '#061211')
        glass.addColorStop(1, '#0d211d')
        panel(-0.392, -0.253, 0.784, 0.481, 0.21)
        ctx.fillStyle = glass
        ctx.fill()
        ctx.save()
        ctx.clip()
        const reflection = ctx.createLinearGradient(0, -0.3, 0, 0.11)
        reflection.addColorStop(0, 'rgba(217,255,242,.17)')
        reflection.addColorStop(1, 'rgba(217,255,242,0)')
        ctx.fillStyle = reflection
        ctx.beginPath()
        ctx.moveTo(-0.5, -0.28)
        ctx.lineTo(0.23, -0.28)
        ctx.lineTo(-0.1, 0.11)
        ctx.lineTo(-0.5, 0.09)
        ctx.fill()
        ctx.restore()

        const blinkPhase = time % 6.4
        const blink = motion && blinkPhase > 5.9 && blinkPhase < 6.04 ? 0.12 : 1
        const eyeHeight = (0.1 - focusMix * 0.058 + warpMix * 0.012) * blink
        for (const side of [-1, 1]) {
          const ex = side * 0.16 + gaze.x * 0.026
          const ey = -0.028 + gaze.y * 0.022
          ctx.save()
          ctx.shadowColor = warpMix > 0.5 ? '#aeecff' : '#d7ff84'
          ctx.shadowBlur = unit * (0.07 + warpMix * 0.035)
          if (hello > 0.3) {
            ctx.beginPath()
            ctx.moveTo(ex - 0.055, ey + 0.025)
            ctx.quadraticCurveTo(ex, ey - 0.05, ex + 0.055, ey + 0.025)
            ctx.strokeStyle = '#ddffad'
            ctx.lineWidth = 0.034
            ctx.stroke()
          } else {
            ctx.translate(ex, ey)
            ctx.rotate(side * focusMix * -0.12)
            panel(-0.052, -eyeHeight / 2, 0.104, eyeHeight, Math.min(0.035, eyeHeight / 2))
            ctx.fillStyle = warpMix > 0.5 ? '#c4f4ff' : '#d7ff84'
            ctx.fill()
            panel(-0.025, -eyeHeight * 0.35, 0.029, Math.max(0.006, eyeHeight * 0.29), 0.009)
            ctx.fillStyle = '#f6ffe5'
            ctx.fill()
          }
          ctx.restore()
        }
        ctx.beginPath()
        ctx.moveTo(-0.045, 0.115)
        ctx.quadraticCurveTo(0, 0.139 + hello * 0.028, 0.045, 0.115)
        ctx.strokeStyle = 'rgba(201,242,206,.7)'
        ctx.lineWidth = 0.012
        ctx.stroke()
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(side * 0.265, 0.08)
          ctx.lineTo(side * 0.28, 0.08)
          ctx.strokeStyle = 'rgba(190,237,210,.35)'
          ctx.lineWidth = 0.008
          ctx.stroke()
        }
      })

      // The rim light catches the bottom of the shell rather than flattening its face.
      plane({ x: 0, y: headY + 0.32, z: -0.12 }, () => {
        ctx.beginPath()
        ctx.ellipse(0, 0, 0.285, 0.051, 0, 0.12, Math.PI - 0.12)
        ctx.strokeStyle = 'rgba(211,255,165,.78)'
        ctx.lineWidth = 0.01
        ctx.stroke()
      })
      orbit(true, time)

      if (greetingActive && motion && greetAge < 1.1) {
        ctx.beginPath()
        ctx.ellipse(
          centerX,
          groundY,
          unit * (0.45 + greetAge * 0.9),
          unit * (0.06 + greetAge * 0.11),
          0,
          0,
          TAU,
        )
        ctx.strokeStyle = `rgba(215,255,132,${(1 - greetAge / 1.1) * 0.4})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
      if (focusMix > 0.03) {
        const scanner = project({ x: -0.75, y: -0.82, z: -0.12 })
        const x = scanner.x - unit * 0.04
        const y = scanner.y + (motion ? Math.sin(time * 2) * unit * 0.15 : 0)
        ctx.strokeStyle = `rgba(192,245,190,${focusMix * 0.62})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y - 13)
        ctx.lineTo(x - 8, y - 13)
        ctx.lineTo(x - 8, y + 13)
        ctx.lineTo(x, y + 13)
        ctx.stroke()
        ctx.fillStyle = `rgba(192,245,190,${focusMix * 0.45})`
        ctx.fillRect(x - 16, y - 0.5, 24, 1)
      }
    }

    function canDraw() {
      return !disposed && visible && !document.hidden && width > 0 && height > 0
    }
    function tick(stamp: number) {
      frame = 0
      if (!canDraw()) return
      const moving = !settings.current.paused && !reduced.matches
      const delta = lastStamp ? stamp - lastStamp : 25
      if (!dirty && moving && delta < 25) {
        frame = requestAnimationFrame(tick)
        return
      }
      if (moving) clock += Math.min(delta, 70) / 1000
      lastStamp = stamp
      dirty = false
      draw(clock, moving)
      if (moving) frame = requestAnimationFrame(tick)
    }
    function schedule() {
      dirty = true
      if (!frame && canDraw()) frame = requestAnimationFrame(tick)
    }
    function policyChanged() {
      cancelAnimationFrame(frame)
      frame = 0
      lastStamp = 0
      schedule()
    }
    function resize() {
      if (disposed) return
      width = element!.clientWidth
      height = element!.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      element!.width = Math.round(width * dpr)
      element!.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Changing the bitmap dimensions clears it even while paused or out of view.
      // Preserve one static snapshot; only schedule() may start a visible animation loop.
      if (width > 0 && height > 0) draw(clock, false)
      schedule()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const bounds = hitArea.getBoundingClientRect()
      target.x = clamp(((event.clientX - bounds.left) / bounds.width - 0.5) * 2, -1, 1)
      target.y = clamp(((event.clientY - bounds.top) / bounds.height - 0.5) * 2, -1, 1)
      schedule()
    }
    const leave = () => {
      target.x = 0
      target.y = 0
      schedule()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        policyChanged()
      },
      { threshold: 0.02 },
    )
    intersection.observe(element)
    hitArea.addEventListener('pointermove', move)
    hitArea.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', policyChanged)
    reduced.addEventListener('change', policyChanged)
    redraw.current = policyChanged
    resize()
    setReady(true)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      intersection.disconnect()
      hitArea.removeEventListener('pointermove', move)
      hitArea.removeEventListener('pointerleave', leave)
      document.removeEventListener('visibilitychange', policyChanged)
      reduced.removeEventListener('change', policyChanged)
      redraw.current = null
    }
  }, [])

  const description =
    greeting > 0
      ? greeting % 2
        ? '收到。X-01 向你挥手致意。'
        : '又见面了。X-01 已准备好。'
      : MODES.find((item) => item.id === mode)!.description
  return (
    <div className="xo-observatory" data-mode={mode} data-canvas-ready={ready}>
      <div className="xo-identity" aria-hidden="true">
        <span className="xo-identity-mark">✦</span>
        <span>
          X–01 <small>FIELD COMPANION</small>
        </span>
      </div>
      <button
        ref={stage}
        className="xo-stage"
        type="button"
        aria-label="与 X-01 领航员打招呼"
        aria-describedby={captionId}
        onClick={() => setGreeting((count) => count + 1)}
      >
        <svg className="xo-fallback" viewBox="0 0 540 400" aria-hidden="true">
          <defs>
            <radialGradient id={`${gradientId}-metal`} cx="30%" cy="22%" r="90%">
              <stop stopColor="#fff" />
              <stop offset=".45" stopColor="#bdcbc5" />
              <stop offset=".8" stopColor="#4c6260" />
              <stop offset="1" stopColor="#243a36" />
            </radialGradient>
            <linearGradient id={`${gradientId}-glass`} x2=".8" y2="1">
              <stop stopColor="#37564c" />
              <stop offset=".55" stopColor="#071511" />
              <stop offset="1" stopColor="#11271d" />
            </linearGradient>
          </defs>
          <ellipse cx="270" cy="350" rx="75" ry="9" fill="#c5ff8c" opacity=".09" />
          <ellipse
            cx="270"
            cy="215"
            rx="149"
            ry="50"
            stroke="#c3ff84"
            strokeOpacity=".2"
            fill="none"
            transform="rotate(-20 270 215)"
          />
          <g fill={`url(#${gradientId}-metal)`} stroke="#dcefe2" strokeOpacity=".3">
            <ellipse cx="224" cy="255" rx="15" ry="27" transform="rotate(18 224 255)" />
            <ellipse cx="317" cy="255" rx="15" ry="27" transform="rotate(-18 317 255)" />
            <ellipse cx="249" cy="320" rx="19" ry="16" />
            <ellipse cx="291" cy="320" rx="19" ry="16" />
            <ellipse cx="270" cy="263" rx="40" ry="48" />
            <path d="M270 108v-22" stroke="#bdcdc2" strokeWidth="4" />
            <ellipse cx="270" cy="86" rx="7" ry="7" fill="#d7ff84" />
            <ellipse cx="207" cy="166" rx="11" ry="21" />
            <ellipse cx="333" cy="166" rx="11" ry="21" />
            <ellipse cx="270" cy="165" rx="64" ry="54" />
          </g>
          <rect
            x="219"
            y="131"
            width="102"
            height="63"
            rx="28"
            fill={`url(#${gradientId}-glass)`}
            stroke="#bfdbca"
            strokeOpacity=".5"
          />
          <rect x="243" y="153" width="13" height="15" rx="5" fill="#d7ff84" />
          <rect x="285" y="153" width="13" height="15" rx="5" fill="#d7ff84" />
          <path
            d="M264 180q6 5 12 0"
            fill="none"
            stroke="#d7ff84"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="249" y="238" width="42" height="44" rx="17" fill="#19352a" />
          <g stroke="#d7ff84" fill="none" strokeWidth="1.5">
            <ellipse cx="270" cy="257" rx="6" ry="12" transform="rotate(40 270 257)" />
            <ellipse cx="270" cy="257" rx="6" ry="12" transform="rotate(-40 270 257)" />
          </g>
        </svg>
        <canvas ref={canvas} className="x-orb-canvas xo-canvas" aria-hidden="true" />
        <span className="xo-touch-hint" aria-hidden="true">
          <span />
          点一下，和我打招呼
        </span>
      </button>
      <p id={captionId} className="xo-caption" role="status" aria-live="polite">
        {description}
      </p>
      <div className="xo-modes" role="group" aria-label="X-01 领航员状态">
        {MODES.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => {
              controls.current[index] = el
            }}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => {
              setMode(item.id)
              setGreeting(0)
            }}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % MODES.length
                  : event.key === 'ArrowLeft'
                    ? (index + MODES.length - 1) % MODES.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? MODES.length - 1
                        : -1
              if (next < 0) return
              event.preventDefault()
              setMode(MODES[next].id)
              setGreeting(0)
              controls.current[next]?.focus()
            }}
          >
            <span className="xo-mode-number">{item.code}</span>
            <span>{item.label}</span>
            <span className="xo-mode-indicator" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
