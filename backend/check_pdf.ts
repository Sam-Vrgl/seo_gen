
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function test() {
    try {
        const pdfLib = require('pdf-parse');
        const PDFParse = pdfLib.PDFParse || pdfLib.default?.PDFParse || pdfLib;
        
        console.log('PDFParse type:', typeof PDFParse);
        
        const dummyBuffer = Buffer.from('%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000110 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF');
        
        // Try Class usage
        try {
            console.log('Trying new PDFParse({ data: buffer })...');
            const parser = new PDFParse({ data: dummyBuffer });
            console.log('Instantiated parser');
            const data = await parser.getText();
            console.log('Class usage success:', data.text ? 'Has text' : 'No text');
        } catch (e) {
            console.log('Class usage failed:', (e as Error).message);
        }

        // Try Function usage
        try {
            console.log('Trying PDFParse(buffer)...');
            const data = await PDFParse(dummyBuffer);
            console.log('Function usage success:', data.text ? 'Has text' : 'No text');
        } catch (e) {
            console.log('Function usage failed:', (e as Error).message);
        }
        
    } catch(e) {
        console.log('Require failed:', (e as Error).message);
    }
}

test();
