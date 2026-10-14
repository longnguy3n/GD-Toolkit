const RELEASE_URL='https://github.com/longnguy3n/GD-Toolkit/releases/latest';

// Small state machine around electron-updater, independent of renderer and testable with a fake transport.
function createUpdateController({updater,version,enabled,onState=()=>{},beforeCheck=async()=>{},beforeInstall=async()=>{}}){
  let state={status:enabled?'idle':'unsupported',currentVersion:version,version:null,percent:0,error:null,releaseUrl:RELEASE_URL};
  let checking=null,downloading=null,installing=false;
  function set(patch){state={...state,...patch};onState({...state});}
  function fail(){set({status:'error',error:'Không thể cập nhật. Kiểm tra kết nối mạng hoặc thử lại sau. File tải lỗi sẽ không được cài.'});}
  updater.autoDownload=false;
  updater.autoInstallOnAppQuit=false;
  updater.allowPrerelease=false;
  updater.allowDowngrade=false;
  updater.disableWebInstaller=true;
  updater.on('checking-for-update',()=>set({status:'checking',error:null}));
  updater.on('update-available',info=>set({status:'available',version:info.version,percent:0,error:null}));
  updater.on('update-not-available',()=>set({status:'current',version:null,error:null}));
  updater.on('download-progress',p=>set({status:'downloading',percent:Math.max(0,Math.min(100,Number(p.percent)||0))}));
  updater.on('update-downloaded',info=>set({status:'ready',version:info.version,percent:100,error:null}));
  updater.on('error',fail);
  return {
    getState:()=>({...state}),
    async check(){
      if(!enabled)return {...state};
      if(checking)return checking;
      if(['downloading','ready','installing'].includes(state.status))return {...state};
      checking=(async()=>{try{set({status:'checking',error:null});await beforeCheck();await updater.checkForUpdates();}catch(e){fail(e);}finally{checking=null;}return {...state};})();
      return checking;
    },
    async download(){
      if(downloading)return downloading;
      if(!enabled||state.status!=='available')throw Error('Hãy kiểm tra và chọn một bản cập nhật mới trước.');
      downloading=(async()=>{try{set({status:'downloading',percent:0,error:null});await updater.downloadUpdate();}catch(e){fail(e);}finally{downloading=null;}return {...state};})();
      return downloading;
    },
    async install(){
      if(!enabled||state.status!=='ready'||installing)throw Error('Bản cập nhật chưa sẵn sàng cài đặt.');
      installing=true;
      try{await beforeInstall();set({status:'installing',error:null});updater.quitAndInstall(false,true);}
      catch(e){installing=false;set({status:'ready',error:'Chưa cài cập nhật: '+e.message});throw e;}
    }
  };
}
module.exports={createUpdateController,RELEASE_URL};
