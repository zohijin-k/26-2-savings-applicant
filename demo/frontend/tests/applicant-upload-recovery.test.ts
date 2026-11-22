import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadDocumentWithProgress } from '../src/api.ts'
class Request {
 static latest: Request
 upload: {onprogress?: (e: {lengthComputable:boolean;loaded:number;total:number}) => void;onload?:()=>void} = {}
 onload?:()=>void;onerror?:()=>void;onabort?:()=>void;ontimeout?:()=>void
 timeout=0;status=0;response:unknown;responseText='';responseType=''
 constructor(){Request.latest=this}
 open(){} send(){} abort(){this.onabort?.()}
}
function upload() {return uploadDocumentWithProgress(7,'resident_abstract',new File(['synthetic'],'FAKE.pdf'),'',{signal:new AbortController().signal,onProgress:()=>{},onSent:()=>{}})}
test('upload response timeout is bounded and does not produce a success', async()=>{
 const original=globalThis.XMLHttpRequest;globalThis.XMLHttpRequest=Request as unknown as typeof XMLHttpRequest
 try {const result=upload();assert.equal(Request.latest.timeout,120000);Request.latest.ontimeout?.();await assert.rejects(result,{name:'TimeoutError'})} finally {globalThis.XMLHttpRequest=original}
})
for(const status of [400,401,403,409,503]) test(`upload keeps HTTP ${status} for applicant recovery`,async()=>{
 const original=globalThis.XMLHttpRequest;globalThis.XMLHttpRequest=Request as unknown as typeof XMLHttpRequest
 try {const result=upload();Request.latest.status=status;Request.latest.response={detail:'SYNTHETIC private diagnostic'};Request.latest.responseText=JSON.stringify(Request.latest.response);Request.latest.onload?.();await assert.rejects(result,(error: unknown)=>typeof error==='object'&&error!==null&&'status'in error&&error.status===status)} finally {globalThis.XMLHttpRequest=original}
})
