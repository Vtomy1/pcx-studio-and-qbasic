export interface SamplePreset {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  description: string;
  generator: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'demomake-sunset',
    name: 'Demomaking Sunset',
    category: 'Synthwave / Demoscene',
    width: 320,
    height: 200,
    description: 'Neon retro sun, wireframe mountains, and perspective horizon grid.',
    generator: (ctx, width, height) => {
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
      skyGrad.addColorStop(0, '#0a001a');
      skyGrad.addColorStop(0.5, '#3b0066');
      skyGrad.addColorStop(0.85, '#990066');
      skyGrad.addColorStop(1, '#ff3366');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const sx = (Math.sin(i * 99) * 0.5 + 0.5) * width;
        const sy = (Math.cos(i * 33) * 0.5 + 0.5) * (height * 0.6);
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
      }

      // Sun
      const sunX = width / 2;
      const sunY = height * 0.5;
      const sunRadius = 45;

      const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
      sunGrad.addColorStop(0, '#ffff00');
      sunGrad.addColorStop(0.5, '#ff5500');
      sunGrad.addColorStop(1, '#ff0055');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // Sun horizontal Venetian blind stripes
      ctx.fillStyle = '#1e0033';
      for (let y = sunY - 10; y < sunY + sunRadius; y += 6) {
        const h = Math.max(1, (y - sunY + 10) / 10);
        ctx.fillRect(sunX - sunRadius, y, sunRadius * 2, h);
      }

      // Mountains silhouette
      ctx.fillStyle = '#110524';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.68);
      ctx.lineTo(40, height * 0.52);
      ctx.lineTo(80, height * 0.62);
      ctx.lineTo(130, height * 0.48);
      ctx.lineTo(180, height * 0.64);
      ctx.lineTo(240, height * 0.50);
      ctx.lineTo(290, height * 0.63);
      ctx.lineTo(width, height * 0.55);
      ctx.lineTo(width, height * 0.68);
      ctx.closePath();
      ctx.fill();

      // Neon mountain edges
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.68);
      ctx.lineTo(40, height * 0.52);
      ctx.lineTo(80, height * 0.62);
      ctx.lineTo(130, height * 0.48);
      ctx.lineTo(180, height * 0.64);
      ctx.lineTo(240, height * 0.50);
      ctx.lineTo(290, height * 0.63);
      ctx.lineTo(width, height * 0.55);
      ctx.stroke();

      // Ground plane
      const groundGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
      groundGrad.addColorStop(0, '#0a001a');
      groundGrad.addColorStop(1, '#001a33');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, height * 0.65, width, height * 0.35);

      // Perspective grid lines
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 1;
      const vanishingX = width / 2;
      const horizonY = height * 0.65;

      for (let x = -width; x <= width * 2; x += 30) {
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal grid lines with perspective spacing
      for (let i = 1; i <= 10; i++) {
        const norm = Math.pow(i / 10, 2.2);
        const y = horizonY + norm * (height - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    },
  },
  {
    id: 'vga-test-pattern',
    name: 'VGA / EGA Test Card',
    category: 'Hardware Benchmark',
    width: 320,
    height: 200,
    description: '16 EGA standard colors, 64-step grayscale, RGB ramps, and geometry targets.',
    generator: (ctx, width, height) => {
      // Dark slate background
      ctx.fillStyle = '#101018';
      ctx.fillRect(0, 0, width, height);

      // 16 EGA colors bar at top
      const egaHexes = [
        '#000000', '#0000aa', '#00aa00', '#00aaaa',
        '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
        '#555555', '#5555ff', '#55ff55', '#55ffff',
        '#ff5555', '#ff55ff', '#ffff55', '#ffffff'
      ];
      const barW = width / 16;
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = egaHexes[i];
        ctx.fillRect(i * barW, 0, barW, 25);
      }

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('IBM PC VGA TEST 320x200', 80, 42);

      // Color Ramps
      const rampY = 52;
      const rampH = 12;
      for (let x = 0; x < width; x++) {
        const ratio = x / width;
        const val = Math.round(ratio * 255);

        // Red ramp
        ctx.fillStyle = `rgb(${val}, 0, 0)`;
        ctx.fillRect(x, rampY, 1, rampH);

        // Green ramp
        ctx.fillStyle = `rgb(0, ${val}, 0)`;
        ctx.fillRect(x, rampY + 14, 1, rampH);

        // Blue ramp
        ctx.fillStyle = `rgb(0, 0, ${val})`;
        ctx.fillRect(x, rampY + 28, 1, rampH);

        // Gray ramp
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, rampY + 42, 1, rampH);
      }

      // Circular alignment target
      const cx = width / 2;
      const cy = 145;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffff00';
      ctx.beginPath();
      ctx.moveTo(cx - 45, cy);
      ctx.lineTo(cx + 45, cy);
      ctx.moveTo(cx, cy - 45);
      ctx.lineTo(cx, cy + 45);
      ctx.stroke();

      // Checkerboard / dither stress test
      for (let by = 120; by < 175; by += 2) {
        for (let bx = 20; bx < 85; bx += 2) {
          ctx.fillStyle = ((bx + by) % 4 === 0) ? '#ffffff' : '#000000';
          ctx.fillRect(bx, by, 2, 2);
        }
      }

      for (let by = 120; by < 175; by += 2) {
        for (let bx = width - 85; bx < width - 20; bx += 2) {
          ctx.fillStyle = ((bx + by) % 4 === 0) ? '#ff55ff' : '#00aaaa';
          ctx.fillRect(bx, by, 2, 2);
        }
      }

      // Bottom footer info
      ctx.fillStyle = '#8888aa';
      ctx.font = '10px monospace';
      ctx.fillText('COLOR DISSOLUTION & SCAN ALIGNMENT', 55, 192);
    },
  },
  {
    id: 'pixel-dungeon-rpg',
    name: 'Retro RPG Sprite',
    category: 'Game Pixel Art',
    width: 320,
    height: 200,
    description: 'Old-school 16-color style pixel warrior inside a torchlit dungeon vault.',
    generator: (ctx, width, height) => {
      // Dungeon brick background
      ctx.fillStyle = '#222233';
      ctx.fillRect(0, 0, width, height);

      // Stone blocks
      ctx.strokeStyle = '#111122';
      ctx.lineWidth = 2;
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        const xOffset = (y % 40 === 0) ? 0 : 25;
        for (let x = xOffset; x < width; x += 50) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 20);
          ctx.stroke();
        }
      }

      // Torches on walls
      const drawTorch = (tx: number, ty: number) => {
        // Torch bracket
        ctx.fillStyle = '#665544';
        ctx.fillRect(tx - 3, ty, 6, 18);
        ctx.fillStyle = '#887755';
        ctx.fillRect(tx - 5, ty - 4, 10, 6);

        // Torch flame
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(tx, ty - 10, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(tx, ty - 8, 6, 0, Math.PI * 2);
        ctx.fill();

        // Light glow
        const glow = ctx.createRadialGradient(tx, ty - 8, 5, tx, ty - 8, 45);
        glow.addColorStop(0, 'rgba(255, 200, 50, 0.45)');
        glow.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(tx, ty - 8, 45, 0, Math.PI * 2);
        ctx.fill();
      };

      drawTorch(60, 60);
      drawTorch(width - 60, 60);

      // Floor stone
      ctx.fillStyle = '#3a3a4c';
      ctx.fillRect(0, 150, width, 50);
      ctx.fillStyle = '#55556a';
      ctx.fillRect(0, 150, width, 4);

      // Pixel Art Hero Knight in center (scaled 4x)
      const px = width / 2 - 20;
      const py = 95;

      // Shield
      ctx.fillStyle = '#0088cc';
      ctx.fillRect(px - 14, py + 12, 12, 24);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(px - 10, py + 20, 4, 8);

      // Helmet & Visor
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(px, py, 24, 20);
      ctx.fillStyle = '#555555';
      ctx.fillRect(px + 4, py + 8, 16, 4);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(px + 8, py + 9, 8, 2); // Glowing visor

      // Chestplate armor
      ctx.fillStyle = '#888888';
      ctx.fillRect(px - 2, py + 20, 28, 26);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(px + 6, py + 22, 12, 4); // Gold trim

      // Sword
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(px + 28, py - 10, 4, 38);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 29, py - 8, 2, 34); // Blade shine
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(px + 24, py + 28, 12, 4); // Hilt
      ctx.fillStyle = '#884400';
      ctx.fillRect(px + 28, py + 32, 4, 8); // Handle

      // Legs / Boots
      ctx.fillStyle = '#555555';
      ctx.fillRect(px + 2, py + 46, 8, 16);
      ctx.fillRect(px + 14, py + 46, 8, 16);
      ctx.fillStyle = '#333333';
      ctx.fillRect(px, py + 58, 10, 6);
      ctx.fillRect(px + 14, py + 58, 10, 6);
    },
  },
  {
    id: 'cyberpunk-city',
    name: 'Cyberpunk Metropolis',
    category: 'Sci-Fi Scene',
    width: 320,
    height: 200,
    description: 'Skyscrapers with glowing neon windows, searchlights, and rain.',
    generator: (ctx, width, height) => {
      // Midnight sky
      ctx.fillStyle = '#050711';
      ctx.fillRect(0, 0, width, height);

      // Deep city haze
      const haze = ctx.createLinearGradient(0, 50, 0, height);
      haze.addColorStop(0, '#100b2b');
      haze.addColorStop(0.5, '#2e0854');
      haze.addColorStop(1, '#00ffcc');
      ctx.fillStyle = haze;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(0, 50, width, height - 50);
      ctx.globalAlpha = 1.0;

      // Searchlight beams
      ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(80, height);
      ctx.lineTo(20, 0);
      ctx.lineTo(60, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 0, 150, 0.08)';
      ctx.beginPath();
      ctx.moveTo(250, height);
      ctx.lineTo(290, 0);
      ctx.lineTo(320, 0);
      ctx.closePath();
      ctx.fill();

      // Background silhouettes
      ctx.fillStyle = '#0f1426';
      const bldgX = [0, 35, 75, 120, 160, 210, 260, 290];
      const bldgW = [30, 45, 38, 45, 55, 45, 35, 35];
      const bldgH = [120, 150, 110, 170, 140, 160, 130, 100];

      for (let i = 0; i < bldgX.length; i++) {
        const x = bldgX[i];
        const w = bldgW[i];
        const h = bldgH[i];
        const y = height - h;
        ctx.fillRect(x, y, w, h);

        // Windows
        for (let wy = y + 8; wy < height - 10; wy += 8) {
          for (let wx = x + 4; wx < x + w - 4; wx += 6) {
            if ((wx * 17 + wy * 31) % 5 === 0) {
              const colors = ['#ffff55', '#00ffff', '#ff00aa', '#55ff55'];
              ctx.fillStyle = colors[(wx + wy) % colors.length];
              ctx.fillRect(wx, wy, 3, 4);
            }
          }
        }
      }

      // Neon Billboard
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(125, 60, 35, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DOS', 133, 71);

      // Rain streaks
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 70; i++) {
        const rx = (i * 29) % width;
        const ry = (i * 47) % height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 12);
        ctx.stroke();
      }
    },
  },
];
