import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const {createUpdateController}=createRequire(import.meta.url)('../desktop/updates.cjs');
function setup(overrides={}){const updater=new EventEmitter();let checked=0,downloaded=0,installed=0;
  updater.checkForUpdates=async()=>{checked++;updater.emit('update-available',{version:'0.3.0'});};
  updater.downloadUpdate=async()=>{downloaded++;updater.emit('download-progress',{percent:55});updater.emit('update-downloaded',{version:'0.3.0'});};
  updater.quitAndInstall=()=>{installed++;};
  const states=[],controller=createUpdateController({updater,version:'0.2.0',enabled:true,onState:s=>states.push(s),...overrides});
  return {updater,controller,states,counts:()=>({checked,downloaded,installed})};
}
test('update check never downloads or installs without user action',async()=>{const {updater,controller,counts}=setup();assert.equal(updater.autoDownload,false);assert.equal(updater.autoInstallOnAppQuit,false);assert.equal(updater.allowDowngrade,false);assert.equal((await controller.check()).status,'available');assert.deepEqual(counts(),{checked:1,downloaded:0,installed:0});});
test('complete download then wait for save before installation',async()=>{let saved=false;const {updater,controller,states}=setup({beforeInstall:async()=>{await new Promise(r=>setTimeout(r,15));saved=true;}});updater.quitAndInstall=(silent,restart)=>{assert.equal(saved,true);assert.equal(silent,false);assert.equal(restart,true);};await controller.check();await controller.download();assert.equal(controller.getState().status,'ready');assert.ok(states.some(s=>s.percent===55));await controller.install();assert.equal(controller.getState().status,'installing');});
test('network failures are recoverable and never expose transport secrets',async()=>{const {updater,controller}=setup();updater.checkForUpdates=async()=>{throw Error('offline Bearer private-token');};await controller.check();assert.equal(controller.getState().status,'error');assert.ok(!controller.getState().error.includes('private-token'));updater.checkForUpdates=async()=>updater.emit('update-not-available',{});await controller.check();assert.equal(controller.getState().status,'current');});
test('failed download never enables install',async()=>{const {updater,controller,counts}=setup();await controller.check();updater.downloadUpdate=async()=>{throw Error('sha512 checksum mismatch');};await controller.download();assert.equal(controller.getState().status,'error');await assert.rejects(()=>controller.install(),/chưa sẵn sàng/);assert.equal(counts().installed,0);});
test('failed persistence blocks install and preserves downloaded state',async()=>{const {controller,counts}=setup({beforeInstall:async()=>{throw Error('Disk full');}});await controller.check();await controller.download();await assert.rejects(()=>controller.install(),/Disk full/);assert.equal(controller.getState().status,'ready');assert.equal(counts().installed,0);});
test('concurrent checks reuse one operation; downloaded update is not discarded',async()=>{const {controller,counts}=setup();await Promise.all([controller.check(),controller.check()]);assert.equal(counts().checked,1);await controller.download();await controller.check();assert.equal(controller.getState().status,'ready');assert.equal(counts().checked,1);});
test('development builds do not contact GitHub or run installers',async()=>{const {controller,counts}=setup({enabled:false});await controller.check();assert.equal(controller.getState().status,'unsupported');assert.deepEqual(counts(),{checked:0,downloaded:0,installed:0});await assert.rejects(()=>controller.download());await assert.rejects(()=>controller.install());});
