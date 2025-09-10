const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), 'data', 'pokemon-data-cache.json');
if (!fs.existsSync(path.dirname(OUT))) fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, '[]', 'utf-8');
console.log('Initialized data cache at', OUT);
