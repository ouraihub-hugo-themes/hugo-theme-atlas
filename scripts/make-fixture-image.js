// 生成 fixture 用的 PNG。
//
// 为什么不放一张现成的图：fixture 要证明"固有尺寸被正确读出",那就得有一张
// 尺寸已知且写在代码里的图。下载来的图既不可复现，也说不清它该是多大。
//
// 手写 PNG 而不引 sharp/canvas：一张纯色渐变图只需要 zlib，Node 自带。
// 加一个依赖来画矩形是本末倒置。

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const WIDTH = 960;
const HEIGHT = 540;
// 输出路径可给参数：特征图的解析靠文件名（featured*/cover*），所以同一张图要
// 以不同名字落到几个 page bundle 里。默认那份是正文图片的夹具。
const OUT = process.argv[2] ?? "exampleSite/content/docs/components/fixture-960x540.png";

/** PNG 的 chunk：长度、类型、数据、CRC32。 */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 每行：1 字节 filter type + RGB 像素。
//
// 滤波器用 2（Up，与上一行做差）而不是 0（None）：这张图纵向变化极缓，
// 逐行差分后绝大多数字节是 0，deflate 能压到百分之几。None 会让渐变的每个
// 字节都进字典，产物大二十倍。
const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
const rowBytes = 1 + WIDTH * 3;
let prev = Buffer.alloc(WIDTH * 3);
for (let y = 0; y < HEIGHT; y++) {
  const cur = Buffer.alloc(WIDTH * 3);
  for (let x = 0; x < WIDTH; x++) {
    const i = x * 3;
    // 对角渐变 + 网格线：既能看出图有没有被拉伸，也能看出方向。
    const grid = x % 120 < 2 || y % 120 < 2;
    cur[i] = grid ? 0x24 : 0x1d + Math.round((x / WIDTH) * 90);
    cur[i + 1] = grid ? 0x5f : 0x2b + Math.round((y / HEIGHT) * 90);
    cur[i + 2] = grid ? 0x94 : 0x3a + Math.round(((x + y) / (WIDTH + HEIGHT)) * 90);
  }
  const row = y * rowBytes;
  raw[row] = 2;
  for (let b = 0; b < cur.length; b++) raw[row + 1 + b] = (cur[b] - prev[b]) & 0xff;
  prev = cur;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr[8] = 8; // 位深
ihdr[9] = 2; // 颜色类型 2 = truecolor RGB
// 10-12: 压缩、滤波、隔行，全 0

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
console.log(`fixture image: ${OUT} (${WIDTH}x${HEIGHT}, ${(png.length / 1024).toFixed(1)} KB)`);
