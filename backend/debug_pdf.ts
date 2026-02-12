import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
console.log('Type of pdfParse:', typeof pdfParse);
console.log('Is Array?', Array.isArray(pdfParse));
console.log('Keys:', Object.keys(pdfParse));
console.log('pdfParse:', pdfParse);
try {
    console.log('Default export:', pdfParse.default);
} catch (e) { console.log('No default export access'); }
