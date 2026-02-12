
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
    const pdf = require('pdf-parse');
    console.log('Require success:', typeof pdf);
    console.log('Keys:', Object.keys(pdf));
    console.log('Default:', pdf.default);
    console.log('Is function:', typeof pdf === 'function');
} catch(e) {
    console.log('Require failed:', e.message);
}
