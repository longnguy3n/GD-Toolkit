const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {replaceFile}=require('./storage.cjs');
let win,saveQueue=Promise.resolve(),updates;
const {createUpdateController,RELEASE_URL}=require('./updates.cjs');
const dataPath=()=>path.join(app.getPath('userData'),'workspace.json');
app.setName('GD Toolkit');
if(process.env.GD_TOOLKIT_TEST!=='1'&&!app.commandLine.hasSwitch('user-data-dir'))app.setPath('userData',path.join(app.getPath('appData'),'GD Toolkit'));
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
async function validDocument(doc){
  if(!doc||typeof doc!=='object')throw Error('Workspace không hợp lệ.');
  const {upgradeWorkspace,validateWorkspace}=await import('../core/workspace.mjs');
  if(doc.version===3)validateWorkspace(doc);else upgradeWorkspace(doc);
}
ipcMain.handle('load',async()=>{try{return JSON.parse(await fs.readFile(dataPath(),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw Error('Không đọc được workspace. Dữ liệu cũ được giữ nguyên; hãy kiểm tra thư mục dữ liệu.');}});
ipcMain.handle('save',async(_,doc)=>{await validDocument(doc);const job=saveQueue.catch(()=>{}).then(async()=>{await fs.mkdir(app.getPath('userData'),{recursive:true});const file=dataPath(),temp=file+'.tmp';if(doc.version===3){try{const old=JSON.parse(await fs.readFile(file,'utf8'));if(old.version===1||old.version===2)await fs.copyFile(file,file+'.v'+old.version+'.backup',require('node:fs').constants.COPYFILE_EXCL);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}await fs.writeFile(temp,JSON.stringify(doc),'utf8');await replaceFile(fs.rename,temp,file);});saveQueue=job;await job;return true;});
ipcMain.handle('export',async(_,value,name)=>{const result=await dialog.showSaveDialog(win,{defaultPath:String(name).replace(/[^a-zA-Z0-9._-]/g,'_'),filters:[{name:'JSON',extensions:['json']}]});if(result.canceled)return false;await fs.writeFile(result.filePath,JSON.stringify(value,null,2),'utf8');return true;});
ipcMain.handle('export-text',async(_,value,name)=>{if(typeof value!=='string'||value.length>20000000)throw Error('Nội dung CSV vượt giới hạn 20 MB.');const result=await dialog.showSaveDialog(win,{defaultPath:String(name).replace(/[^a-zA-Z0-9._-]/g,'_').replace(/\.[^.]*$/,'')+'.csv',filters:[{name:'CSV',extensions:['csv']}]});if(result.canceled)return false;await fs.writeFile(result.filePath,'\uFEFF'+value,'utf8');return true;});
ipcMain.handle('import',async()=>{const result=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});if(result.canceled)return null;const file=result.filePaths[0];if((await fs.stat(file)).size>100000000)throw Error('File vượt 100 MB.');return JSON.parse(await fs.readFile(file,'utf8'));});
ipcMain.handle('open-data',()=>shell.openPath(app.getPath('userData')));
ipcMain.handle('update-state',()=>updates.getState());
ipcMain.handle('update-check',()=>updates.check());
ipcMain.handle('update-download',()=>updates.download());
ipcMain.handle('update-install',()=>updates.install());
ipcMain.handle('update-releases',()=>shell.openExternal(RELEASE_URL));
ipcMain.handle('unity-script',async()=>{const r=await dialog.showSaveDialog(win,{defaultPath:'GDToolkitRandomExporter.cs',filters:[{name:'C#',extensions:['cs']}]});if(r.canceled)return false;await fs.copyFile(path.join(__dirname,'../unity/GDToolkitRandomExporter.cs'),r.filePath);return true;});
app.whenReady().then(()=>{
  const testing=!app.isPackaged&&process.env.GD_TOOLKIT_TEST==='1';
  const {autoUpdater}=require('electron-updater');
  autoUpdater.logger={info:()=>{},warn:()=>{},error:()=>{},debug:()=>{}};
  updates=createUpdateController({updater:autoUpdater,version:require('../package.json').version,enabled:app.isPackaged&&process.platform==='win32',
    beforeCheck:async()=>{autoUpdater.setFeedURL({provider:'github',owner:'longnguy3n',repo:'GD-Toolkit'});},
    onState:state=>{if(win&&!win.isDestroyed())win.webContents.send('update-status',state);},
    beforeInstall:async()=>{await saveQueue;}
  });
  win=new BrowserWindow({width:1440,height:960,minWidth:1020,minHeight:720,show:!testing,backgroundColor:'#11121a',title:'GD Toolkit',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,offscreen:testing}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'../ui/index.html'));
  if(app.isPackaged){const timer=setTimeout(()=>updates.check(),8000);timer.unref();}
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',event=>{if(saveQueue){event.preventDefault();const pending=saveQueue;saveQueue=null;pending.finally(()=>app.quit());}});
