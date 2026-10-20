import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {replaceFile}=createRequire(import.meta.url)('../desktop/storage.cjs');

test('atomic workspace replacement tolerates transient Windows file locks',async()=>{
  let tries=0;const waits=[];
  await replaceFile(async(from,to)=>{assert.equal(from,'pending');assert.equal(to,'workspace');if(++tries<3)throw Object.assign(Error('busy'),{code:'EPERM'});},'pending','workspace',{wait:async ms=>waits.push(ms)});
  assert.equal(tries,3);assert.deepEqual(waits,[25,50]);
});
test('persistent and unrelated storage errors remain errors without deleting the saved file',async()=>{
  let tries=0;
  await assert.rejects(replaceFile(async()=>{tries++;throw Object.assign(Error('locked'),{code:'EACCES'});},'a','b',{wait:async()=>{}}),/locked/);
  assert.equal(tries,6);tries=0;
  await assert.rejects(replaceFile(async()=>{tries++;throw Object.assign(Error('disk full'),{code:'ENOSPC'});},'a','b',{wait:async()=>{}}),/disk full/);
  assert.equal(tries,1);
});
