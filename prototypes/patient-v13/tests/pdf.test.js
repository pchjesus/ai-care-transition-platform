import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMBEDDED_DEMO_PDF,EMBEDDED_PDF_PREVIEW} from '../pdf-assets.js';
import {createDemoPdfUrl} from '../pdf.js';
test('embedded PDF remains byte-identical to the supplied synthetic PDF',()=>{
 assert.deepEqual(Buffer.from(EMBEDDED_DEMO_PDF,'base64'),readFileSync(new URL('../보행_보조기_안내_시연용.pdf',import.meta.url)));
 assert.ok(EMBEDDED_PDF_PREVIEW.startsWith('data:image/png;base64,'));
});
test('PDF resource uses the correct MIME type and can be revoked',async()=>{
 const url=createDemoPdfUrl();try{const response=await fetch(url);assert.equal(response.headers.get('content-type'),'application/pdf');assert.ok((await response.text()).startsWith('%PDF-'));}finally{URL.revokeObjectURL(url);}
});
