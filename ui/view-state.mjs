// Keep view state across DOM replacement. Restore synchronously so a later wheel
// or keyboard scroll is never overwritten by a delayed animation-frame callback.
const scrollTargets='[data-scroll-key],.table-wrap,textarea,dialog';
function scrollKey(el){
  if(el.dataset.scrollKey)return 'scroll:'+el.dataset.scrollKey;
  if(el.id)return 'id:'+el.id;
  const scope=el.closest('[data-view-key]')?.dataset.viewKey||'';
  if(el.matches('.table-wrap'))return scope+'|table:'+Array.from(el.querySelectorAll('thead th'),n=>n.textContent).join('|');
  return scope+'|'+el.tagName+':'+el.getAttribute('name');
}
function focusKey(el){
  if(!el?.matches('input,textarea,select,button,summary,a'))return null;
  if(el.id)return 'id:'+el.id;
  const attrs=Array.from(el.attributes).filter(a=>a.name.startsWith('data-')&&a.name!=='data-shift').map(a=>[a.name,a.value]).sort();
  const scope=el.closest('[data-focus-scope]')?.dataset.focusScope||'';
  if(!attrs.length&&!el.name)return null;
  return JSON.stringify([scope,el.tagName,el.name,attrs]);
}
export function captureView(root=document){
  const x=window.scrollX,y=window.scrollY;
  const targets=()=>[...(root.matches?.(scrollTargets)?[root]:[]),...root.querySelectorAll(scrollTargets)];
  const scrolls=new Map(Array.from(targets(),el=>[scrollKey(el),[el.scrollLeft,el.scrollTop]]));
  const details=new Map(Array.from(root.querySelectorAll('details[data-view-key]'),el=>[el.dataset.viewKey,el.open]));
  const active=document.activeElement,key=root.contains(active)?focusKey(active):null;
  const selection=key&&typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd,active.selectionDirection]:null;
  return {
    restore({content=true,focus=true,page=true,expanded=true}={}){
      if(content){
        if(expanded)for(const el of root.querySelectorAll('details[data-view-key]'))if(details.has(el.dataset.viewKey))el.open=details.get(el.dataset.viewKey);
        if(focus&&key){const el=Array.from(root.querySelectorAll('input,textarea,select,button,summary,a')).find(el=>focusKey(el)===key);if(el&&!el.disabled){el.focus({preventScroll:true});if(selection&&typeof el.setSelectionRange==='function')el.setSelectionRange(...selection);}}
        for(const el of targets()){const pos=scrolls.get(scrollKey(el));if(pos)el.scrollTo({left:pos[0],top:pos[1],behavior:'instant'});}
      }
      if(page)restorePage();
    }
  };
  function restorePage(){window.scrollTo({left:x,top:y,behavior:'instant'});}
}

// Dialog autofocus stays inside the modal; closing returns to the calling view
// without the browser scrolling its opener into view.
export function showModalStable(dialog){
  const view=captureView();
  dialog.addEventListener('close',()=>view.restore({focus:false,expanded:false}),{once:true});
  dialog.showModal();view.restore({content:false});
}
