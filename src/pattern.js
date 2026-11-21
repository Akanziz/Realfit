export const fields = [
  ['waist', 'Waist', 34, 22, 65],
  ['hip', 'Hips', 42, 28, 76],
  ['thigh', 'Thigh', 25, 15, 42],
  ['inseam', 'Inseam', 30, 22, 42],
];

// Sample garment circumferences and inseams, in inches.
export const patterns = {
  34: { waist: 35, hip: 43, thigh: 25.5, knee: 17.5, hem: 16, inseam: 30 },
  36: { waist: 37, hip: 45, thigh: 27, knee: 18.5, hem: 17, inseam: 30 },
};

export function ellipse(circumference, depthRatio) {
  // Ellipses of a fixed aspect ratio scale linearly with circumference.
  const sum = 1 + depthRatio;
  const h = ((1 - depthRatio) / sum) ** 2;
  const unitPerimeter = Math.PI * sum * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
  const width = circumference * 0.0254 / unitPerimeter;
  return [width, width * depthRatio];
}
