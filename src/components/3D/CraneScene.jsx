import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows, Environment, Html } from '@react-three/drei'
import { useCraneStore } from '../../store/craneStore'
import { statusColor } from '../../utils/format'

export default function CraneScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [16, 11, 16], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', 35, 100]} />

      <hemisphereLight args={['#ffffff', '#e8e8e8', 0.6]} />
      <directionalLight position={[12, 20, 8]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-8, 10, -6]} intensity={0.35} />

      <Suspense fallback={<Html center><span className="text-black/60 text-sm">Caricamento scena…</span></Html>}>
        <Environment preset="city" />
        <Ground />
        <Crane />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2 - 0.04}
        target={[0, 2, 0]}
      />
    </Canvas>
  )
}

// ──────────────────────────────────────────────────────────────────
// Ground
// ──────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <>
      <Grid
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#e5e5e5"
        sectionSize={5}
        sectionThickness={1.0}
        sectionColor="#bdbdbd"
        fadeDistance={60}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.28} scale={50} blur={2.8} far={25} />
    </>
  )
}

// ──────────────────────────────────────────────────────────────────
// Top-level crane assembly
// ──────────────────────────────────────────────────────────────────

function Crane() {
  const model = useCraneStore((s) => s.model)
  const config = useCraneStore((s) => s.config)
  const safety = useCraneStore((s) => s.safety)

  const statusCol = statusColor(safety?.status ?? 'safe')

  return (
    <group>
      {/* Static carrier + outriggers */}
      <TruckCarrier />
      <Outriggers model={model} config={config} statusCol={statusCol} />

      {/* Rotating superstructure (slewing) */}
      <group
        position={[0, model.turret.pivotHeight, 0]}
        rotation={[0, -degToRad(config.rotationDeg), 0]}
      >
        <SlewingBase />
        <Counterweight />
        <TelescopicBoom model={model} config={config} statusCol={statusCol} />
      </group>

      {/* Ground load marker */}
      {safety && <LoadMarker safety={safety} loadKg={config.loadKg} color={statusCol} />}
    </group>
  )
}

// ──────────────────────────────────────────────────────────────────
// Truck carrier — body, cab, wheels, tool boxes
// ──────────────────────────────────────────────────────────────────

const ORANGE  = '#EC6726'
const DARK    = '#1a1a1a'
const MID     = '#2e2e2e'
const DARKGRAY = '#3a3a3a'

function TruckCarrier() {
  // Carrier body: z from -4.0 (rear) to +4.2 (front of cab area)
  // Cab: z from +3.0 to +5.2
  // Width: 2.4 m (± 1.2 from centre), matching trackWidth in JSON
  return (
    <group>
      {/* Main carrier frame / body */}
      <mesh castShadow receiveShadow position={[0, 0.7, -0.3]}>
        <boxGeometry args={[2.4, 1.4, 8.8]} />
        <meshStandardMaterial color={ORANGE} metalness={0.2} roughness={0.55} />
      </mesh>

      {/* Cab */}
      <mesh castShadow position={[0, 1.6, 3.6]}>
        <boxGeometry args={[2.35, 1.9, 2.4]} />
        <meshStandardMaterial color="#c25112" metalness={0.15} roughness={0.5} />
      </mesh>

      {/* Windshield glass */}
      <mesh position={[0, 1.9, 4.79]}>
        <boxGeometry args={[2.0, 0.9, 0.07]} />
        <meshStandardMaterial color="#1b3a5a" transparent opacity={0.72} metalness={0.1} roughness={0.4} />
      </mesh>

      {/* Side windows — left */}
      <mesh position={[-1.19, 1.9, 3.6]}>
        <boxGeometry args={[0.07, 0.7, 1.8]} />
        <meshStandardMaterial color="#1b3a5a" transparent opacity={0.65} metalness={0.1} roughness={0.4} />
      </mesh>
      {/* Side windows — right */}
      <mesh position={[1.19, 1.9, 3.6]}>
        <boxGeometry args={[0.07, 0.7, 1.8]} />
        <meshStandardMaterial color="#1b3a5a" transparent opacity={0.65} metalness={0.1} roughness={0.4} />
      </mesh>

      {/* Front grille / bumper */}
      <mesh position={[0, 0.5, 4.9]}>
        <boxGeometry args={[2.3, 0.45, 0.15]} />
        <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Rear bumper */}
      <mesh position={[0, 0.4, -4.7]}>
        <boxGeometry args={[2.3, 0.3, 0.12]} />
        <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Exhaust stack */}
      <mesh castShadow position={[0.95, 2.4, 3.2]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.9, 10]} />
        <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Wheels — 4 axles */}
      {[
        { z: -3.2, dual: true  },
        { z: -1.4, dual: true  },
        { z:  1.6, dual: false },
        { z:  3.5, dual: false },
      ].map(({ z, dual }, ai) =>
        [-1.28, 1.28].map((x, si) => (
          <WheelSet key={`w-${ai}-${si}`} x={x} y={0.42} z={z} dual={dual} outboard={x > 0} />
        ))
      )}

      {/* Side equipment boxes */}
      {[-1.26, 1.26].map((x, i) => (
        <mesh key={`box${i}`} castShadow position={[x, 0.7, -1.0]}>
          <boxGeometry args={[0.11, 0.65, 4.2]} />
          <meshStandardMaterial color={DARKGRAY} metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function WheelSet({ x, y, z, dual, outboard }) {
  const outer = outboard ? 0.14 : -0.14
  return (
    <group position={[x, y, z]}>
      {/* Outer tyre */}
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 0.22, 20]} />
        <meshStandardMaterial color={DARK} roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Inner tyre (dual rear) */}
      {dual && (
        <mesh castShadow rotation={[0, 0, Math.PI / 2]} position={[outboard ? -0.25 : 0.25, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.22, 20]} />
          <meshStandardMaterial color={DARK} roughness={0.9} metalness={0.05} />
        </mesh>
      )}
      {/* Hubcap */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[outer, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ──────────────────────────────────────────────────────────────────
// Slewing base (turntable on top of carrier)
// ──────────────────────────────────────────────────────────────────

function SlewingBase() {
  return (
    <>
      {/* Slewing ring plate */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.1, 24]} />
        <meshStandardMaterial color={MID} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Crane body / turret base */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.88, 1.05, 0.74, 24]} />
        <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Upper crane body box (boom foot area) */}
      <mesh castShadow position={[0, 0.88, 0.2]}>
        <boxGeometry args={[1.1, 0.55, 1.4]} />
        <meshStandardMaterial color={DARK} metalness={0.35} roughness={0.55} />
      </mesh>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────
// Counterweight
// ──────────────────────────────────────────────────────────────────

function Counterweight() {
  return (
    <mesh castShadow position={[0, 0.55, -1.6]}>
      <boxGeometry args={[1.7, 0.9, 1.4]} />
      <meshStandardMaterial color="#222222" metalness={0.35} roughness={0.6} />
    </mesh>
  )
}

// ──────────────────────────────────────────────────────────────────
// Outriggers — H-frame: housing → beam → vertical jack → pad
// ──────────────────────────────────────────────────────────────────

function Outriggers({ model, config, statusCol }) {
  return (
    <group>
      {Object.entries(model.outriggers.positions).map(([name, base]) => {
        const ext     = config.outriggerExtensionM?.[name] ?? 0
        const side    = Math.sign(base.x) || 1
        const padX    = side * (Math.abs(base.x) + ext)
        const edgeX   = side * 1.2                           // carrier edge
        const beamLen = Math.abs(padX - edgeX)
        const beamCX  = (padX + edgeX) / 2
        const z       = base.z

        return (
          <group key={name}>
            {/* Outrigger housing on carrier */}
            <mesh castShadow position={[edgeX + side * 0.3, 0.28, z]}>
              <boxGeometry args={[0.55, 0.3, 0.38]} />
              <meshStandardMaterial color={DARKGRAY} metalness={0.3} roughness={0.6} />
            </mesh>

            {/* Horizontal beam */}
            <mesh castShadow position={[beamCX, 0.28, z]}>
              <boxGeometry args={[beamLen, 0.22, 0.28]} />
              <meshStandardMaterial color={MID} metalness={0.4} roughness={0.5} />
            </mesh>

            {/* Vertical jack cylinder */}
            <mesh castShadow position={[padX, 0.18, z]}>
              <cylinderGeometry args={[0.07, 0.10, 0.36, 10]} />
              <meshStandardMaterial color="#505050" metalness={0.55} roughness={0.4} />
            </mesh>

            {/* Ground pad — colour reflects status */}
            <mesh castShadow receiveShadow position={[padX, 0.03, z]}>
              <cylinderGeometry args={[0.34, 0.34, 0.055, 18]} />
              <meshStandardMaterial color={statusCol} metalness={0.15} roughness={0.7} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ──────────────────────────────────────────────────────────────────
// Telescopic boom — 3 visible sections + optional jib
// ──────────────────────────────────────────────────────────────────

function TelescopicBoom({ model, config, statusCol }) {
  const totalLen  = config.mainBoomLengthM
  const angleRad  = degToRad(config.mainBoomAngleDeg)
  const retracted = model.mainBoom.retractedLength   // 8.5 m
  const maxLen    = model.mainBoom.extendedLength    // 24.0 m
  const pivotZ    = model.mainBoom.pivot.z           // 0.6 m

  // How far sections 2 and 3 have extended beyond section 1
  const extRatio = Math.max(0, (totalLen - retracted) / (maxLen - retracted))

  // Visible lengths of the three nested sections
  const s1 = retracted                                        // base (always fixed)
  const s2 = retracted + extRatio * (maxLen - retracted) * 0.55
  const s3 = totalLen                                         // tip section = full boom

  // Radii [top, bottom] for each section
  const R1 = [0.26, 0.32]
  const R2 = [0.19, 0.24]
  const R3 = [0.12, 0.17]

  return (
    // Boom foot is at (0, 0, pivotZ) relative to turret group, then rotated upward
    <group position={[0, 0, pivotZ]}>
      <group rotation={[Math.PI / 2 - angleRad, 0, 0]}>

        {/* Section 1 — outer / base, dark grey */}
        <mesh castShadow position={[0, s1 / 2, 0]}>
          <cylinderGeometry args={[R1[0], R1[1], s1, 14]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.45} roughness={0.45} />
        </mesh>

        {/* Section 2 — mid, slightly lighter */}
        <mesh castShadow position={[0, s2 / 2, 0]}>
          <cylinderGeometry args={[R2[0], R2[1], s2, 12]} />
          <meshStandardMaterial color="#383838" metalness={0.45} roughness={0.42} />
        </mesh>

        {/* Section 3 — tip, status colour */}
        <mesh castShadow position={[0, s3 / 2, 0]}>
          <cylinderGeometry args={[R3[0], R3[1], s3, 10]} />
          <meshStandardMaterial color={statusCol} metalness={0.5} roughness={0.38} />
        </mesh>

        {/* Boom head / tip sheave block */}
        <mesh position={[0, s3, 0]}>
          <boxGeometry args={[0.22, 0.16, 0.22]} />
          <meshStandardMaterial color={DARK} metalness={0.65} roughness={0.3} />
        </mesh>

        {/* Jib */}
        {model.jib?.available && config.jibLengthM > 0 && (
          <Jib
            jibModel={model.jib}
            jibAngleDeg={config.jibAngleDeg}
            jibLengthM={config.jibLengthM}
            boomTipY={s3}
          />
        )}
      </group>
    </group>
  )
}

function Jib({ jibAngleDeg, jibLengthM, boomTipY }) {
  return (
    <group position={[0, boomTipY, 0]} rotation={[-degToRad(jibAngleDeg), 0, 0]}>
      {/* Main jib arm */}
      <mesh castShadow position={[0, jibLengthM / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.10, jibLengthM, 10]} />
        <meshStandardMaterial color={DARKGRAY} metalness={0.35} roughness={0.55} />
      </mesh>
      {/* Jib tip */}
      <mesh position={[0, jibLengthM, 0]}>
        <boxGeometry args={[0.12, 0.10, 0.12]} />
        <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

// ──────────────────────────────────────────────────────────────────
// Load marker on ground
// ──────────────────────────────────────────────────────────────────

function LoadMarker({ safety, loadKg, color }) {
  const x = 0
  const z = safety.radiusM

  return (
    <group>
      <mesh position={[x, 0.06, z]}>
        <ringGeometry args={[0.30, 0.42, 28]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {loadKg > 0 && (
        <Html position={[x, 0.7, z]} center style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 rounded bg-white border border-line text-xs font-semibold text-black shadow-panel">
            {Math.round(loadKg).toLocaleString('it-IT')} kg
          </div>
        </Html>
      )}
    </group>
  )
}

// ──────────────────────────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────────────────────────

function degToRad(d) {
  return (d * Math.PI) / 180
}
