// Draws the home screen icons from the brand mark: the mark in bone and foil on
// ink. Run again if the mark changes. Writes to apps/member/public/icons.
const sharp = require("sharp");
const path = require("path");

const INK = "#14120F";
const BONE = "#FBF7F0";
const FOIL = "#C9A455";

// The mark, on a 100 by 100 grid, scaled into the middle of the icon.
function svg(size, scale) {
  const s = (size * scale) / 100;
  const o = (size - size * scale) / 2;
  const mark = `
    <circle cx="50" cy="50" r="20" stroke="${BONE}" stroke-width="2.4" fill="none"/>
    ${[[50, 18], [72.6, 27.4], [82, 50], [72.6, 72.6], [50, 82], [27.4, 72.6], [18, 50]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${BONE}"/>`)
      .join("")}
    <circle cx="27.4" cy="27.4" r="4.2" fill="${FOIL}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${INK}"/>
    <g transform="translate(${o} ${o}) scale(${s})">${mark}</g></svg>`;
}

(async () => {
  const out = path.join(__dirname, "..", "apps", "member", "public", "icons");
  const jobs = [
    ["icon-192.png", 192, 0.82],
    ["icon-512.png", 512, 0.82],
    // Maskable: the mark stays inside the safe zone, so a round crop never cuts it.
    ["icon-maskable-512.png", 512, 0.6],
    ["apple-touch-icon.png", 180, 0.82],
  ];
  for (const [name, size, scale] of jobs) {
    await sharp(Buffer.from(svg(size, scale))).png().toFile(path.join(out, name));
    console.log("wrote", name);
  }
})();
