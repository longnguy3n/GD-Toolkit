import {showModalStable} from './view-state.mjs';
// Native dialog.close() queues its close event. Serialize reuse so a delayed
// close event cannot resolve or clean up the next dialog shown in the same element.
let pending=Promise.resolve();
export function withDialog(setup) {
  const run=pending.then(()=>new Promise((resolve,reject)=>{
    const dialog=document.querySelector('#dialog');
    let onClose;
    try{
      const read=setup(dialog);
      onClose=()=>{
        try{resolve(read(dialog.returnValue));}catch(error){reject(error);}
        finally{dialog.classList.remove('bulk-dialog');}
      };
      dialog.addEventListener('close',onClose,{once:true});
      dialog.returnValue='cancel';showModalStable(dialog);
    }catch(error){if(onClose)dialog.removeEventListener('close',onClose);dialog.classList.remove('bulk-dialog');reject(error);}
  }));
  pending=run.catch(()=>{});return run;
}
