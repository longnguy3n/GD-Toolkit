// Opt-in integration test against the published stable GitHub release. Never runs an installer.
const {app}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {NsisUpdater}=require('electron-updater');
const {createUpdateController}=require('../desktop/updates.cjs');
const version=require('../package.json').version;
const output=path.resolve(__dirname,'../test-output/live-update');
app.setPath('userData',path.join(output,'profile'));
app.whenReady().then(async()=>{
  try{
    await fs.mkdir(output,{recursive:true});
    const config=path.join(output,'app-update.yml');
    await fs.writeFile(config,'provider: github\nowner: longnguy3n\nrepo: GD-Toolkit\nupdaterCacheDirName: gd-toolkit-live-test\n');
    const updater=new NsisUpdater();
    updater.forceDevUpdateConfig=true;updater.updateConfigPath=config;
    Object.defineProperty(updater.app,'baseCachePath',{value:path.join(output,'cache')});
    updater.logger=null;updater.disableDifferentialDownload=true;
    let last=0;
    const controller=createUpdateController({updater,version,enabled:true,
      beforeCheck:async()=>updater.setFeedURL({provider:'github',owner:'longnguy3n',repo:'GD-Toolkit'}),
      onState:s=>{if(s.status==='downloading'&&s.percent-last>=20){last=s.percent;console.log('Download verified release: '+Math.round(s.percent)+'%');}}
    });
    updater.currentVersion=new updater.currentVersion.constructor(version);
    let state=await controller.check();assert.equal(state.status,'current',JSON.stringify(state));
    console.log('PASS public feed: current version '+version+' recognized, no credentials.');
    updater.currentVersion=new updater.currentVersion.constructor('0.1.0');
    state=await controller.check();assert.equal(state.status,'available',JSON.stringify(state));assert.equal(state.version,version);
    state=await controller.download();assert.equal(state.status,'ready',JSON.stringify(state));assert.equal(state.version,version);
    console.log('PASS old-version update: found '+version+', downloaded installer, passed electron-updater SHA-512 validation. Installer was not executed.');
    app.exit(0);
  }catch(e){console.error(e.message);app.exit(1);}
});
