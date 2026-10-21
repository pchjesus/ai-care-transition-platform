import {EMBEDDED_DEMO_PDF} from './pdf-assets.js';
export function createDemoPdfUrl(){const b=atob(EMBEDDED_DEMO_PDF);const arr=new Uint8Array(b.length);for(let i=0;i<b.length;i++)arr[i]=b.charCodeAt(i);return URL.createObjectURL(new Blob([arr],{type:'application/pdf'}));}
