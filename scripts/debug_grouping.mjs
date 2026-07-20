import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\8a882376-e5ee-4183-bab2-9e5de78e3d87\\.system_generated\\steps\\2411\\content.md', 'utf8').split('\n').filter(l => l.startsWith('{')).join(''));

const branchDetections = data.anomalyDetections.filter(d => d.entityType === "BRANCH" || d.outletCode);
console.log(`Total detections: ${data.anomalyDetections.length}`);
console.log(`Branch detections: ${branchDetections.length}`);

for (const outletCode of ["SMA-YMH-BTG", "SMA-YMH-MLK", "SMA-YMH-SGT"]) {
  const oDetections = branchDetections.filter(d => d.outletCode === outletCode);
  console.log(`Outlet ${outletCode} has ${oDetections.length} detections.`);
}
