const assert=require('node:assert/strict');

module.exports=async({win,js,waitFor,change,capture,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),setTheme})=>{
  const current=`const d=await window.desktop.load(),p=d.profiles.find(p=>p.id===d.activeProfileId),s=p.flowLab?.scenarios.find(s=>s.id===p.flowLab.activeScenarioId);`;
  const scenario=()=>js(`(async()=>{${current}return s;})()`);
  const saved=condition=>waitFor(`(async()=>{${current}return !!s&&(${condition});})()`);
  const click=selector=>js(`document.querySelector(${JSON.stringify(selector)}).click()`);
  setTheme??=async theme=>{
    await click('.side-tool[data-tab=settings]');await waitFor("!!document.querySelector('[data-setting=theme]')");
    await change('[data-setting=theme]',theme);await waitFor(`window.desktop.load().then(d=>d.settings.theme===${JSON.stringify(theme)})`);
    await click('.side-tool[data-tab=flow]');
  };
  const bounds=selector=>js(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  async function reload(){const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));win.webContents.reload();await loaded;await waitFor("!!document.querySelector('.tree-list')");}
  async function pointerClick(selector,modifiers=[]){
    const r=await bounds(selector),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
    win.webContents.sendInputEvent({type:'mouseMove',x,y,modifiers});await sleep(30);
    win.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1,modifiers});await sleep(30);
    win.webContents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount:1,modifiers});await sleep(90);
  }
  async function dragNode(id,left,top){
    const selector=`[data-gc-node="${id}"]`,r=await bounds(selector),zoom=await js("new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-gc-stage]')).transform).a"),before=await scenario();
    const x=Math.round(r.x+55*zoom),y=Math.round(r.y+32*zoom),dx=left-r.x,dy=top-r.y;
    const selected=await js("[...document.querySelectorAll('.gc-node.selected')].map(e=>e.dataset.gcNode)"),ids=selected.includes(id)?selected:[id];
    const expected=Object.fromEntries(ids.map(key=>[key,{x:before.canvas.positions[key].x+(Math.round(x+dx)-x)/zoom,y:before.canvas.positions[key].y+(Math.round(y+dy)-y)/zoom}]));
    win.webContents.sendInputEvent({type:'mouseMove',x,y});await sleep(25);
    win.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});await sleep(25);
    for(let i=1;i<=5;i++){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(x+dx*i/5),y:Math.round(y+dy*i/5),button:'left'});await sleep(25);}
    win.webContents.sendInputEvent({type:'mouseUp',x:Math.round(x+dx),y:Math.round(y+dy),button:'left',clickCount:1});
    await saved(`Object.entries(${JSON.stringify(expected)}).every(([id,p])=>s.canvas?.positions[id]&&Math.abs(s.canvas.positions[id].x-p.x)<1.5&&Math.abs(s.canvas.positions[id].y-p.y)<1.5)`);
    const moved=await bounds(selector);assert.ok(Math.abs(moved.x-left)<3,`Node ${id} dragged horizontally: ${moved.x} vs ${left}`);assert.ok(Math.abs(moved.y-top)<3,`Node ${id} dragged vertically: ${moved.y} vs ${top}`);
  }
  async function create(kind,name,col,row,drop=false){
    const before=await scenario(),count=before.resources.length+before.rules.length;
    if(drop){
      await js(`(()=>{const palette=document.querySelector('[data-gc-create="${kind}"]'),v=document.querySelector('[data-gc-viewport]'),r=v.getBoundingClientRect(),dataTransfer=new DataTransfer(),x=r.x+20+(r.width-260)/2*${col},y=r.y+85+${row}*215;palette.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));v.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer,clientX:x,clientY:y}));v.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer,clientX:x,clientY:y}));})()`);
    }else await click(`[data-gc-create="${kind}"]`);
    await waitFor(`document.querySelectorAll('[data-gc-node]').length===${count+1}`);
    await saved(`s.resources.length+s.rules.length===${count+1}`);
    await change('[data-gc-field=name]',name);await saved(`s.${kind==='resource'?'resources':'rules'}.some(x=>x.name===${JSON.stringify(name)})`);
    const s=await scenario(),id=(kind==='resource'?s.resources:s.rules).find(x=>x.name===name).id;
    const area=await bounds('[data-gc-viewport]'),step=(area.width-260)/2;
    if(!drop)await dragNode(id,area.x+20+step*col,area.y+85+row*215);
    else{const placed=await bounds(`[data-gc-node="${id}"]`);assert.ok(Math.abs(placed.x-(area.x+20+step*col))<3);assert.ok(Math.abs(placed.y-(area.y+85+row*215))<3);}
    return id;
  }
  async function connect(from,to,amount,drag=false){
    const before=(await scenario()).rules.reduce((n,r)=>n+r.inputs.length+r.outputs.length,0);
    if(drag){
      const a=await bounds(`[data-gc-node-id="${from}"][data-gc-port=out]`),b=await bounds(`[data-gc-node-id="${to}"][data-gc-port=in]`),x=Math.round(a.x+a.width/2),y=Math.round(a.y+a.height/2),tx=Math.round(b.x+b.width/2),ty=Math.round(b.y+b.height/2);
      win.webContents.sendInputEvent({type:'mouseMove',x,y});await sleep(25);win.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});await sleep(25);
      for(let i=1;i<=5;i++){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(x+(tx-x)*i/5),y:Math.round(y+(ty-y)*i/5),button:'left'});await sleep(25);}
      win.webContents.sendInputEvent({type:'mouseUp',x:tx,y:ty,button:'left',clickCount:1});await sleep(90);
    }else{await pointerClick(`[data-gc-node-id="${from}"][data-gc-port=out]`);await pointerClick(`[data-gc-node-id="${to}"][data-gc-port=in]`);}
    await waitFor(`document.querySelectorAll('[data-gc-edge]').length===${before+1}`);
    await waitFor("!!document.querySelector('[data-gc-field=edge-amount]')");
    await change('[data-gc-field=edge-amount]',amount);
    await saved(`s.rules.some(r=>(r.id===${JSON.stringify(from)}&&r.outputs.some(x=>x.resource===${JSON.stringify(to)}&&x.amount===${amount}))||(r.id===${JSON.stringify(to)}&&r.inputs.some(x=>x.resource===${JSON.stringify(from)}&&x.amount===${amount})))`);
  }

  // Start from an isolated clean workspace; create the empty scenario via UI.
  await js(`(async()=>{const w=await import('../core/workspace.mjs'),d=w.upgradeWorkspace(null);d.settings.theme='dark';d.settings.rng='custom';d.settings.seed=42;await window.desktop.save(d);})()`);
  await reload();win.setSize(1600,1040);await sleep(100);
  await click('.side-tool[data-tab=flow]');await click('[data-action=flow-new][data-template=blank]');
  await waitFor("!!document.querySelector('[data-gc-editor]')");
  const scenarioId=await js("document.querySelector('[data-gc-editor]').dataset.scenarioId");
  await saved(`s.id===${JSON.stringify(scenarioId)}&&s.resources.length===0&&s.rules.length===0`);
  assert.equal(await js("document.querySelectorAll('[data-gc-node]').length"),0);
  await js("document.querySelector('[data-gc-editor]').scrollIntoView({block:'start'})");
  const ore=await create('resource','Quặng QA',1,0,true),income=await create('source','Khai thác QA',0,0),craft=await create('converter','Chế tạo QA',2,0),sword=await create('resource','Kiếm QA',1,1),drain=await create('drain','Tiêu hao QA',2,1);
  assert.equal(await js("document.querySelectorAll('.gc-node.incomplete').length"),3);
  assert.equal((await scenario()).resources.length,2);assert.equal((await scenario()).rules.length,3);
  await waitFor("document.querySelector('#save-state').textContent.includes('Đã lưu')");
  await pointerClick(`[data-gc-node="${ore}"] .gc-node-name`);await pointerClick(`[data-gc-node="${income}"] .gc-node-name`,['shift']);
  assert.equal(await js("document.querySelectorAll('.gc-node.selected').length"),2);
  const grouped=await scenario(),oreRect=await bounds(`[data-gc-node="${ore}"]`);
  await dragNode(ore,oreRect.x+15,oreRect.y+20);
  const groupMoved=await scenario();
  for(const id of [ore,income]){assert.ok(Math.abs(groupMoved.canvas.positions[id].x-grouped.canvas.positions[id].x-15)<2);assert.ok(Math.abs(groupMoved.canvas.positions[id].y-grouped.canvas.positions[id].y-20)<2);}

  // Drafts persist safely, but cannot silently run as free sources or no-ops.
  await click('[data-action=flow-view][data-view=results]');await click('[data-action=flow-run]');
  await waitFor("document.querySelector('#toast').textContent.includes('chưa nối đủ')");
  assert.equal(await js("!!document.querySelector('.flow-result')"),false);
  await click('[data-action=flow-view][data-view=build]');await js("document.querySelector('[data-gc-editor]').scrollIntoView({block:'start'})");
  const scroll=await js('scrollY');
  await connect(income,ore,10);assert.ok(Math.abs(await js('scrollY')-scroll)<3,'Connecting ports preserves page scroll');

  // Edit an edge, undo and redo through the same commands users see.
  await change('[data-gc-field=edge-amount]',12);await saved(`s.rules.find(r=>r.id==='${income}').outputs[0].amount===12`);
  await click('[data-gc-command=undo]');await saved(`s.rules.find(r=>r.id==='${income}').outputs[0].amount===10`);
  await click('[data-gc-command=redo]');await saved(`s.rules.find(r=>r.id==='${income}').outputs[0].amount===12`);
  await click('[data-gc-command=undo]');await saved(`s.rules.find(r=>r.id==='${income}').outputs[0].amount===10`);
  await connect(ore,craft,3,true);await connect(craft,sword,2);await connect(sword,drain,1);
  assert.equal(await js("document.querySelectorAll('.gc-node.incomplete').length"),0);

  // Editing the same model in the table invalidates stale canvas Undo snapshots.
  await pointerClick(`[data-gc-node="${ore}"] .gc-node-name`);await change('[data-gc-field=initial]',1);await saved(`s.resources.find(r=>r.id==='${ore}').initial===1`);
  assert.equal(await js("document.querySelector('[data-gc-command=undo]').disabled"),false);
  await click('[data-action=flow-editor][data-editor=form]');await change(`[data-flow-resource="${ore}"] [data-flow-field=initial]`,0);await saved(`s.resources.find(r=>r.id==='${ore}').initial===0`);
  await click('[data-action=flow-editor][data-editor=canvas]');await js("document.querySelector('[data-gc-editor]').scrollIntoView({block:'start'})");
  assert.equal(await js("document.querySelector('[data-gc-command=undo]').disabled"),true);

  // Canvas view is independently persistent and must survive navigation/reload.
  const beforeZoom=(await scenario()).canvas.viewport.zoom;
  await click('[data-gc-command=zoom-out]');await saved(`s.canvas.viewport.zoom<${beforeZoom}`);
  const wheelBefore=(await scenario()).canvas.viewport.zoom,area=await bounds('[data-gc-viewport]');
  win.webContents.sendInputEvent({type:'mouseWheel',x:Math.round(area.x+area.width/2),y:Math.round(area.y+area.height/2),deltaY:-70,canScroll:true});
  await waitFor(`document.querySelector('[data-gc-zoom-label]').textContent!==${JSON.stringify(`${Math.round(wheelBefore*100)}%`)}`);
  const wheelLabel=await js("document.querySelector('[data-gc-zoom-label]').textContent");assert.notEqual(wheelLabel,`${Math.round(wheelBefore*100)}%`);
  await click('[data-action=flow-view][data-view=results]');await saved(`s.canvas.viewport.zoom!==${wheelBefore}`);
  await click('[data-action=flow-view][data-view=build]');await js("document.querySelector('[data-gc-editor]').scrollIntoView({block:'start'})");
  assert.equal(await js("document.querySelector('[data-gc-zoom-label]').textContent"),wheelLabel);
  const snapshot=await scenario();await capture('economy-canvas-dark.png');
  await setTheme('light');await js("document.querySelector('[data-gc-editor]').scrollIntoView({block:'start'})");await capture('economy-canvas-light.png');
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
  win.setSize(900,800);await sleep(120);assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);win.setSize(1600,1040);
  await waitFor("document.querySelector('#save-state').textContent.includes('Đã lưu')");
  await reload();await click('.side-tool[data-tab=flow]');
  await waitFor("document.querySelectorAll('[data-gc-node]').length===5");
  assert.deepEqual((await scenario()).canvas,snapshot.canvas);
  assert.equal(await js("document.querySelector('[data-gc-zoom-label]').textContent"),`${Math.round(snapshot.canvas.viewport.zoom*100)}%`);
  assert.equal(await js("document.querySelectorAll('[data-gc-edge]').length"),4);

  // The diagram uses the real simulator with order and quantities intact.
  await click('[data-action=flow-view][data-view=results]');await change('[data-flow-option=days]',4);await change('[data-flow-option=players]',3);await click('[data-action=flow-run]');
  await waitFor("!!document.querySelector('.flow-result')");
  const result=await js("(async()=>(await import('./flow-lab.mjs')).flowState.result)()");
  assert.equal(result.resources.find(r=>r.id===ore).mean,28);assert.equal(result.resources.find(r=>r.id===sword).mean,4);assert.ok(result.rules.every(r=>r.executions===12));
  await click('[data-action=flow-view][data-view=build]');await js("document.querySelector('[data-gc-editor]').scrollIntoView({block:'start'})");
  // Selecting a diagram edge opens its inspector; deleting a required connection
  // creates a visible draft, and Undo restores the complete runnable graph.
  await pointerClick(`[data-gc-node="${craft}"] .gc-node-name`);
  await click(`[data-gc-select-edge="${craft}:input:${ore}"]`);await waitFor("!!document.querySelector('[data-gc-field=edge-amount]')");
  await click('[data-gc-command=disconnect]');await saved(`s.rules.find(r=>r.id==='${craft}').inputs.length===0`);
  assert.equal(await js("document.querySelectorAll('.gc-node.incomplete').length"),1);
  await click('[data-gc-command=undo]');await saved(`s.rules.find(r=>r.id==='${craft}').inputs.length===1`);
  assert.equal(await js("document.querySelectorAll('.gc-node.incomplete').length"),0);
  console.log('PASS canvas: empty UI creation, real pointer drag and port connections, edge editing, draft guard, undo/redo, view persistence, simulation equivalence, themes and responsive layout.');
};

// Standalone smoke runner uses a separate userData directory; the main desktop
// suite imports the same function into its existing isolated window.
if(require.main===module||process.argv[1]&&require('node:path').resolve(process.argv[1]).toLowerCase()===__filename.toLowerCase()){
  const {app,BrowserWindow}=require('electron'),path=require('node:path'),fs=require('node:fs/promises');
  const output=path.resolve(__dirname,'../test-output'),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  // Optional fault injection checks that UI rendering cannot outrun disk-based
  // assertions on slower Windows runners. Only this standalone test process is affected.
  const saveDelay=Number(process.env.GD_CANVAS_TEST_SAVE_DELAY_MS||0);
  if(saveDelay>0){const rename=fs.rename;fs.rename=async(...args)=>{if(String(args[1]).endsWith('workspace.json'))await sleep(saveDelay);return rename(...args);};}
  app.setPath('userData',path.join(output,'canvas-profile'));app.disableHardwareAcceleration();process.env.GD_TOOLKIT_TEST='1';require('../desktop/main.cjs');
  app.whenReady().then(async()=>{
    try{
      await fs.mkdir(output,{recursive:true});const win=BrowserWindow.getAllWindows()[0],errors=[];
      win.webContents.on('console-message',event=>{if(event.level==='error'||event.level>=3)errors.push(event.message);});
      const js=code=>win.webContents.executeJavaScript(code);
      async function waitFor(code){for(let i=0;i<200;i++){if(await js(code))return;await sleep(100);}throw Error(`Timeout: ${code}\n${await js("document.querySelector('#toast').textContent")}`);}
      async function change(selector,value){await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await waitFor("document.querySelector('#save-state').textContent.includes('Đã lưu')");}
      async function capture(name){await sleep(300);await fs.writeFile(path.join(output,name),(await win.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG());}
      await waitFor("!!document.querySelector('.tree-list')");await module.exports({win,js,waitFor,change,capture,sleep});assert.deepEqual(errors,[]);app.exit(0);
    }catch(error){console.error(error);app.exit(1);}
  });
}
