# RealFit

RealFit is a web fitting room for comparing jeans on a measurement-driven 3D mannequin.

## Run in VS Code

Open this folder in VS Code. In its terminal, use Node.js 22.12 or later and run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite in a WebGL 2 browser. Use `npm run build` to create the production files in `dist/`.

## Code

- `src/main.js` connects the measurement form, garment comparison, and viewer.
- `src/pattern.js` defines measurement ranges and sample garment dimensions in inches.
- `src/viewer.js` generates the mannequin and jeans meshes and animates a knee bend.

The jeans use illustrative W34 and W36 dimensions. The viewer reserves clearance around the body mesh when a garment is smaller than the mannequin. Use the signed garment-room figures to see those shortfalls. Fabric motion uses a damped response and procedural folds. Brand-specific fit requires a measured sewing pattern, fabric properties, a calibrated drape simulation, and comparison with physical try-ons.
