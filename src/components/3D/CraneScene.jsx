import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows, Environment, Html } from '@react-three/drei'
import { useCraneStore } from '../../store/craneStore'
import { statusColor } from '../../utils/format'

/**
 * Scena 3D principale — tema chiaro coerente con il sito bglift.com.
 * La gru è volutamente schematica: cilindri e box, niente CAD —
 * lo scopo è dare riscontro visivo immediato dei valori della configurazione.
 */
export default function CraneScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [14, 10, 14], fov: 45, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', 30, 90]} />

      <hemisphereLight args={['#ffffff', '#e5e5e5', 0.65]} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

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
        maxDistance={45}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 2, 0]}
      />
    </Canvas>
  )
}

// ------------------------------------------------------------------
// Ground & griglia (chiari)
// ------------------------------------------------------------------

function Ground() {
  return (
    <>
      <Grid
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#e5e5e5"
        sectionSize={5}
        sectionThickness={1.0}
        sectionColor="#bdbdbd"
        fadeDistance={55}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.32}
        scale={40}
        blur={2.6}
        far={20}
      />
    </>
  )
}

// ------------------------------------------------------------------
// Gru semplificata
// ------------------------------------------------------------------

function Crane() {
  const model = useCraneStore((s) => s.model)
  const config = useCraneStore((s) => s.config)
  const safety = useCraneStore((s) => s.safety)

  const accentColor = statusColor(safety?.status ?? 'safe')

  return (
    <group>
      <Chassis />
      <Outriggers model={model} config={config} highlight={accentColor} />

      {/* Torretta + braccio: rotazione attorno all'asse Y */}
      <group position={[0, model.turret.pivotHeight, 0]} rotation={[0, -degToRad(config.rotationDeg), 0]}>
        <Turret />
        <Boom model={model} config={config} highlight={accentColor} />
      </group>

      {/* Hook del carico — posizionato in base al raggio calcolato dal worker */}
      {safety && <LoadHook safety={safety} loadKg={config.loadKg} color={accentColor} />}
    </group>
  )
}

function Chassis() {
  return (
    <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
      <boxGeometry args={[2.4, 1.0, 6.0]} />
      {/* Chassis arancio brand BGLift */}
      <meshStandardMaterial color="#EC6726" metalness={0.25} roughness={0.55} />
    </mesh>
  )
}

function Turret() {
  return (
    <mesh castShadow position={[0, 0.3, 0]}>
      <cylinderGeometry args={[0.9, 1.1, 0.6, 24]} />
      {/* Torretta nera per contrasto sul bianco */}
      <meshStandardMaterial color="#111111" metalness={0.4} roughness={0.55} />
    </mesh>
  )
}

function Boom({ model, config, highlight }) {
  const length = config.mainBoomLengthM
  const angleRad = degToRad(config.mainBoomAngleDeg)

  return (
    <group position={[0, 0, model.mainBoom.pivot.z]}>
      <group rotation={[Math.PI / 2 - angleRad, 0, 0]}>
        <mesh castShadow position={[0, length / 2, 0]}>
          <cylinderGeometry args={[0.18, 0.22, length, 14]} />
          <meshStandardMaterial color={highlight} metalness={0.45} roughness={0.4} />
        </mesh>

        {/* Jib opzionale alla punta */}
        {model.jib?.available && config.jibLengthM > 0 && (
          <group position={[0, length, 0]} rotation={[degToRad(config.jibAngleDeg), 0, 0]}>
            <mesh castShadow position={[0, config.jibLengthM / 2, 0]}>
              <cylinderGeometry args={[0.12, 0.15, config.jibLengthM, 12]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.55} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}

function Outriggers({ model, config, highlight }) {
  return (
    <group>
      {Object.entries(model.outriggers.positions).map(([name, base]) => {
        const ext = config.outriggerExtensionM?.[name] ?? 0
        const side = Math.sign(base.x) || 1
        const x = side * (Math.abs(base.x) + ext)
        return (
          <group key={name}>
            {/* Braccio dello stabilizzatore (nero, coerente col tema chiaro) */}
            <mesh position={[(x + (side * Math.abs(base.x))) / 2, 0.25, base.z]}>
              <boxGeometry args={[Math.abs(x - side * Math.abs(base.x)) + 0.3, 0.18, 0.22]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            {/* Pad — colore semaforico */}
            <mesh position={[x, 0.02, base.z]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.05, 18]} />
              <meshStandardMaterial color={highlight} metalness={0.2} roughness={0.7} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function LoadHook({ safety, loadKg, color }) {
  // Marker a terra del punto di applicazione del carico.
  const rotRad = 0
  const x = Math.sin(rotRad) * safety.radiusM
  const z = Math.cos(rotRad) * safety.radiusM

  return (
    <group>
      <mesh position={[x, 0.05, z]}>
        <ringGeometry args={[0.35, 0.45, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {loadKg > 0 && (
        <Html
          position={[x, 0.6, z]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="px-2 py-1 rounded bg-white border border-line text-xs font-semibold text-black shadow-panel">
            {Math.round(loadKg).toLocaleString('it-IT')} kg
          </div>
        </Html>
      )}
    </group>
  )
}

function degToRad(d) {
  return (d * Math.PI) / 180
}
