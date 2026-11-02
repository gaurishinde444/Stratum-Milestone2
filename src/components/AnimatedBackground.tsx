import { useEffect, useRef } from 'react'

/**
 * Full-screen animated background for the sign-in pages: a drifting, mouse-reactive network of
 * glowing nodes (think "agents connecting") and slow aurora lights.
 * Purely decorative — hidden from screen readers, paused when the tab is hidden, and drawn as a
 * single still frame for users who prefer reduced motion.
 */

// One calm colour family (blue · indigo · sky) keeps the effect professional rather than playful.
// The light theme uses deeper shades so the network stays visible on a light background.
const PALETTES = {
  dark: { nodes: ['96, 165, 250', '129, 140, 248', '56, 189, 248'], spot: '59, 130, 246', trail: 'rgba(147, 197, 253, .5)', core: '#dbeafe', glow: 'rgba(96, 165, 250, 1)', streak: '191, 219, 254' },
  light: { nodes: ['37, 99, 235', '79, 70, 229', '2, 132, 199'], spot: '37, 99, 235', trail: 'rgba(37, 99, 235, .45)', core: '#1d4ed8', glow: 'rgba(37, 99, 235, .7)', streak: '37, 99, 235' },
}
const currentPalette = () => PALETTES[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark']
const LINK_DISTANCE = 140
const MOUSE_DISTANCE = 200
const SPOTLIGHT_RADIUS = 320

interface Node { x: number; y: number; vx: number; vy: number; r: number; tone: number }
/** A bright signal travelling along a link from node `from` to node `to` (t: 0 → 1). */
interface Pulse { from: number; to: number; t: number; speed: number }
/** A light streak gliding across the screen. */
interface Streak { x: number; y: number; len: number; speed: number; life: number }

const MAX_PULSES = 14
const STREAK_EVERY_MS = 2600

/** Closest node to `index` within link range (optionally skipping one), or -1. */
function nearestNeighbour(nodes: Node[], index: number, skip = -1) {
  const a = nodes[index]
  let best = -1, bestDist = LINK_DISTANCE
  nodes.forEach((b, i) => {
    if (i === index || i === skip) return
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (d < bestDist && Math.random() > .25) { best = i; bestDist = d }
  })
  return best
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mouse = { x: -9999, y: -9999 }
    // The spotlight eases towards the cursor instead of snapping, which reads as smoother.
    const spot = { x: -9999, y: -9999 }
    let nodes: Node[] = []
    let pulses: Pulse[] = []
    let streaks: Streak[] = []
    let lastStreak = 0
    let palette = currentPalette()
    // Re-colour instantly when the theme preference changes.
    const themeObserver = new MutationObserver(() => { palette = currentPalette(); if (reduceMotion) draw() })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    let width = 0, height = 0, frame = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(110, Math.max(36, (width * height) / 13000)))
      pulses = []
      streaks = []
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .5,
        vy: (Math.random() - .5) * .5,
        r: .9 + Math.random() * 1.6,
        tone: Math.floor(Math.random() * 3),
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      if (mouse.x > -999) {
        spot.x = spot.x < -999 ? mouse.x : spot.x + (mouse.x - spot.x) * .08
        spot.y = spot.y < -999 ? mouse.y : spot.y + (mouse.y - spot.y) * .08
        const glow = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, SPOTLIGHT_RADIUS)
        glow.addColorStop(0, `rgba(${palette.spot}, .13)`)
        glow.addColorStop(1, `rgba(${palette.spot}, 0)`)
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, width, height)
      }
      for (const n of nodes) {
        // Drift, bounce off the edges, and ease away from the cursor.
        const dx = n.x - mouse.x, dy = n.y - mouse.y, dist = Math.hypot(dx, dy)
        if (dist < MOUSE_DISTANCE && dist > 0) { n.x += (dx / dist) * .35; n.y += (dy / dist) * .35 }
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < LINK_DISTANCE) {
            ctx.strokeStyle = `rgba(${palette.nodes[a.tone]}, ${(1 - d / LINK_DISTANCE) * .26})`
            ctx.lineWidth = .8
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y)
        if (md < MOUSE_DISTANCE) {
          ctx.strokeStyle = `rgba(${palette.nodes[a.tone]}, ${(1 - md / MOUSE_DISTANCE) * .35})`
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke()
        }
      }
      // Signals: spawn on random short links, travel along them, then hop on to a neighbour.
      if (pulses.length < MAX_PULSES && Math.random() < .12) {
        const from = Math.floor(Math.random() * nodes.length)
        const to = nearestNeighbour(nodes, from)
        if (to >= 0) pulses.push({ from, to, t: 0, speed: .012 + Math.random() * .014 })
      }
      pulses = pulses.flatMap(p => {
        const a = nodes[p.from], b = nodes[p.to]
        if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) > LINK_DISTANCE * 1.4) return []
        p.t += p.speed
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t
        ctx.strokeStyle = palette.trail
        ctx.lineWidth = 1.4
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke()
        ctx.beginPath()
        ctx.fillStyle = palette.core
        ctx.shadowColor = palette.glow
        ctx.shadowBlur = 14
        ctx.arc(x, y, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        if (p.t < 1) return [p]
        const next = nearestNeighbour(nodes, p.to, p.from)
        return next >= 0 && Math.random() < .7 ? [{ ...p, from: p.to, to: next, t: 0 }] : []
      })

      // Streaks: an occasional thin beam of light gliding diagonally across the screen.
      const now = performance.now()
      if (now - lastStreak > STREAK_EVERY_MS) {
        lastStreak = now
        streaks.push({ x: Math.random() * width * .6, y: -40, len: 140 + Math.random() * 120, speed: 7 + Math.random() * 4, life: 1 })
      }
      streaks = streaks.filter(s => {
        s.x += s.speed; s.y += s.speed * .55; s.life -= .006
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.len, s.y - s.len * .55)
        g.addColorStop(0, `rgba(${palette.streak}, ${.55 * s.life})`)
        g.addColorStop(1, `rgba(${palette.streak}, 0)`)
        ctx.strokeStyle = g
        ctx.lineWidth = 1.6
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.len, s.y - s.len * .55); ctx.stroke()
        return s.life > 0 && s.x - s.len < width && s.y - s.len < height
      })

      for (const n of nodes) {
        ctx.beginPath()
        ctx.fillStyle = `rgba(${palette.nodes[n.tone]}, .75)`
        ctx.shadowColor = `rgba(${palette.nodes[n.tone]}, .8)`
        ctx.shadowBlur = 6
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    const loop = () => { draw(); frame = requestAnimationFrame(loop) }
    const start = () => { cancelAnimationFrame(frame); if (reduceMotion) draw(); else loop() }
    const onVisibility = () => { if (document.hidden) cancelAnimationFrame(frame); else start() }
    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; spot.x = -9999; spot.y = -9999 }
    const onResize = () => { resize(); start() }

    resize()
    start()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(frame)
      themeObserver.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="animated-bg" aria-hidden="true">
      <span className="aurora aurora-a" />
      <span className="aurora aurora-b" />
      <span className="aurora aurora-c" />
      <span className="bg-grid" />
      <canvas ref={canvasRef} />
      <span className="bg-vignette" />
    </div>
  )
}
