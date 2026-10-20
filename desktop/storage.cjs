// Windows may briefly hold the destination while a reader or indexer has it open.
// Keep the old workspace intact and retry the atomic replacement; never unlink it.
async function replaceFile(rename,from,to,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=6}={}){
  for(let attempt=0;;attempt++){
    try{return await rename(from,to);}
    catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt+1>=attempts)throw error;await wait(25*2**attempt);}
  }
}
module.exports={replaceFile};
