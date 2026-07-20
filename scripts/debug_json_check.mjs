import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\8a882376-e5ee-4183-bab2-9e5de78e3d87\\.system_generated\\steps\\2411\\content.md', 'utf8').split('\n').filter(l => l.startsWith('{')).join(''));

const btgProfiles = data.branchRiskProfiles.filter(b => b.outletCode === "SMA-YMH-BTG");
console.log("Number of BTG profiles:", btgProfiles.length);
console.log(JSON.stringify(btgProfiles, null, 2));
