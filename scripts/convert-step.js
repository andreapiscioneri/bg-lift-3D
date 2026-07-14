import fs from 'fs';
import path from 'path';
import occtimportjs from 'occt-import-js';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// GLTFExporter's binary path uses FileReader, which doesn't exist in Node.
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
};

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/convert-step.js <input.step> <output.glb>');
  process.exit(1);
}

const occt = await occtimportjs();
const fileBuffer = fs.readFileSync(inputPath);
const isIges = /\.igs$|\.iges$/i.test(inputPath);
const readParams = {
  linearUnit: 'meter',
  linearDeflection: 0.3,
  angularDeflection: 0.3,
};
const result = isIges
  ? occt.ReadIgesFile(new Uint8Array(fileBuffer), readParams)
  : occt.ReadStepFile(new Uint8Array(fileBuffer), readParams);

if (!result.success) {
  console.error('Failed to read STEP file');
  process.exit(1);
}

console.log(`Parsed ${result.meshes.length} meshes from STEP file`);

// Costruisce i THREE.Mesh una sola volta; verranno agganciati all'albero
// dei sotto-assiemi (result.root) cosi' la gerarchia vista nel CAD (es.
// "BR0089", "MR0003S_Chiuso", ...) resta accessibile per nome nel GLB.
const meshObjects = result.meshes.map((meshData, i) => {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(meshData.attributes.position.array), 3)
  );

  if (meshData.attributes.normal) {
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(meshData.attributes.normal.array), 3)
    );
  } else {
    geometry.computeVertexNormals();
  }

  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.index.array), 1));

  const color = meshData.color
    ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2])
    : new THREE.Color(0x8899aa);

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.6,
    roughness: 0.5,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = meshData.name || `part_${i}`;
  return mesh;
});

function sanitizeName(name, fallback) {
  return (name && name.trim()) || fallback;
}

let groupCounter = 0;

function buildNode(node) {
  const group = new THREE.Group();
  group.name = sanitizeName(node.name, `group_${groupCounter++}`);
  for (const meshIndex of node.meshes) {
    group.add(meshObjects[meshIndex]);
  }
  for (const child of node.children) {
    group.add(buildNode(child));
  }
  return group;
}

const scene = new THREE.Scene();
scene.add(buildNode(result.root));

const exporter = new GLTFExporter();

exporter.parse(
  scene,
  (glb) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(glb));
    console.log(`Written ${outputPath} (${(glb.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  },
  (error) => {
    console.error('GLTFExporter error:', error);
    process.exit(1);
  },
  { binary: true }
);
