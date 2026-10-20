const assert=require('node:assert/strict');
const {dialog}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');

module.exports=async({win,js,waitFor,change,capture,sleep})=>{
  await js(`(async()=>{
    const w=await import('../core/workspace.mjs'),f=await import('../core/flow.mjs');
    const d=w.upgradeWorkspace(null),p=w.activeProfile(d);
    d.settings.rng='custom';d.settings.seed=42;d.settings.theme='dark';
    d.config.name='Balance QA';d.config.root={id:'root',name:'Banner',weight:1,children:[{id:'target',name:'SSR Target',weight:1,tier:'SSR'},{id:'other',name:'Common',weight:1,tier:'R'}]};
    const scenario=f.makeFlowScenario('crafting');p.flowLab={...f.makeFlowLab(),scenarios:[scenario],activeScenarioId:scenario.id};
    await window.desktop.save(d);
  })()`);
  win.webContents.reload();await sleep(250);await waitFor("document.querySelectorAll('.tree-row').length===2");win.setSize(1440,960);
  await js("document.querySelector('.side-tool[data-tab=balance]').click()");
  assert.equal(await js("document.querySelectorAll('.side-tool.active').length"),1);
  assert.equal(await js("document.querySelector('.tabs').hidden"),true);
  assert.equal(await js("document.querySelector('.banner-child').hidden"),false);
  await change('[data-balance-field=target]','target');await change('[data-balance-field=copies]',1);await change('[data-balance-field=pulls]',1);await change('[data-balance-field=desired]',75);
  await change('[data-balance-field=parameter]','weight:target');await change('[data-balance-field=min]',1);await change('[data-balance-field=max]',9);await change('[data-balance-field=samples]',9);
  await js("document.querySelector('[data-action=balance-run]').click()");await waitFor("!!document.querySelector('.balance-result')");
  const best=await js("(async()=>{const {balanceState:s}=await import('./balance-lab.mjs');return s.result.rows[s.result.bestIndex]})()");
  assert.equal(best.value,3);assert.equal(best.probability,.75);
  await js("document.querySelector('.balance-result').scrollIntoView({block:'start'})");await capture('balance-dark.png');
  await js("document.querySelector('#theme-toggle').click()");await capture('balance-light.png');
  const before=await js('scrollY');await js("document.querySelector('.balance-best [data-action=balance-apply]').click()");await waitFor("!document.querySelector('.balance-result')");
  await waitFor("document.querySelector('#save-state').textContent.includes('Đã lưu')");
  const data=await js("window.desktop.load()");assert.equal(data.profiles[0].banners[0].config.root.children[0].weight,3);
  assert.ok(await js('scrollY')<=before); // A shorter page may clamp, never focus-jump to an unrelated element.
  win.setSize(900,760);await sleep(150);assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
  win.setSize(1440,960);
  await js("document.querySelector('.side-tool[data-tab=flow]').click()");
  assert.equal(await js("document.querySelector('.banner-child').hidden"),true);
  assert.equal(await js("document.querySelector('#profile-bar').hidden"),false);
  assert.equal(await js("document.querySelectorAll('.side-tool.active').length"),1);
  await capture('economy-builder-light.png');
  await js("document.querySelector('[data-flow-resource=coin] input[data-flow-field=name]').scrollIntoView({block:'center'});document.querySelector('[data-flow-resource=coin] input[data-flow-field=name]').focus({preventScroll:true})");
  const flowScroll=await js('scrollY');await change('[data-flow-resource=coin] input[data-flow-field=name]','Vàng QA');
  assert.equal(await js("document.activeElement.closest('[data-flow-resource]').dataset.flowResource"),'coin');
  assert.ok(Math.abs((await js('scrollY'))-flowScroll)<3);
  await js("document.querySelector('[data-action=flow-undo]').click()");await waitFor("document.querySelector('[data-flow-resource=coin] input[data-flow-field=name]').value==='Vàng'");
  await js("document.querySelector('[data-action=flow-view][data-view=results]').click()");await change('[data-flow-option=days]',30);await change('[data-flow-option=players]',20);
  await js("document.querySelector('[data-action=flow-run]').click()");await waitFor("!!document.querySelector('.flow-result')");
  const flow=await js("(async()=>(await import('./flow-lab.mjs')).flowState.result)()");
  assert.ok(Math.abs(flow.resources.find(r=>r.id==='level').mean-6)<1e-10);
  assert.equal(flow.milestones.find(m=>m.id==='level-five').quantiles[99],25);
  await js("document.querySelector('.flow-result').scrollIntoView({block:'start'})");await capture('economy-result-light.png');
  await js("document.querySelector('#theme-toggle').click()");await capture('economy-result-dark.png');
  win.setSize(900,760);await sleep(150);assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);win.setSize(1440,960);
  await js("document.querySelector('[data-action=flow-save]').click()");await waitFor("document.querySelector('[data-action=flow-save]').disabled && document.querySelector('#save-state').textContent.includes('Đã lưu')");
  assert.equal((await js('window.desktop.load()')).profiles[0].flowLab.history.length,1);
  await js("document.querySelector('[data-action=flow-new][data-template=blank]').click()");await waitFor("!!document.querySelector('[data-flow-resource=currency]')");
  await change('[data-flow-resource=currency] input[data-flow-field=name]','Gem');await change('[data-flow-resource=currency] input[data-flow-field=initial]',1600);
  await js("document.querySelector('[data-action=flow-view][data-view=results]').click();document.querySelector('[data-action=flow-run]').click()");
  await waitFor("document.querySelector('.flow-result')?.textContent.includes('Kịch bản mới')");
  assert.equal(await js("document.querySelector('[data-flow-select=banner]').value"),data.profiles[0].activeBannerId);
  await js("document.querySelector('[data-action=flow-use-pulls]').click()");
  assert.equal(await js("document.querySelector('[data-calc=pulls]').value"),'10');
  await js("document.querySelector('.side-tool[data-tab=flow]').click()");
  // Draft result remains while navigating to Gacha and back; save it before the backup.
  await js("document.querySelector('[data-action=flow-save]').click()");await waitFor("document.querySelector('[data-action=flow-save]').disabled && document.querySelector('#save-state').textContent.includes('Đã lưu')");

  // Exercise actual JSON/CSV IPC exports using dialogs redirected into the isolated test output.
  const originalSave=dialog.showSaveDialog,originalOpen=dialog.showOpenDialog;
  const output=path.resolve(__dirname,'../test-output'),backup=path.join(output,'lab-workspace-backup.json'),csv=path.join(output,'lab-export.csv');
  try{
    dialog.showSaveDialog=async()=>({canceled:false,filePath:backup});
    await js("document.querySelector('.side-tool[data-tab=settings]').click();document.querySelector('[data-action=workspace-export]').click()");
    await waitFor("document.querySelector('#toast').textContent==='Đã xuất JSON.'");
    const exported=JSON.parse(await fs.readFile(backup,'utf8'));assert.equal(exported.profiles[0].flowLab.scenarios.length,2);assert.equal(exported.profiles[0].flowLab.history.length,2);
    dialog.showSaveDialog=async()=>({canceled:false,filePath:csv});
    assert.equal(await js("window.desktop.exportText('Ngày,Mean\\r\\n1,42','test.csv')"),true);
    assert.equal(await fs.readFile(csv,'utf8'),'\uFEFFNgày,Mean\r\n1,42');
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[backup]});
    await js("document.querySelector('[data-action=workspace-import]').click()");await waitFor("document.querySelector('#dialog').open");
    await js("document.querySelector('#dialog .primary').click()");await waitFor("document.querySelector('#toast').textContent==='Đã khôi phục workspace.'");
    assert.equal((await js('window.desktop.load()')).profiles[0].flowLab.scenarios.length,2);
    await js("document.querySelector('.side-tool[data-tab=flow]').click()");
    assert.equal(await js("document.querySelector('[data-action=flow-undo]')===null"),true);
    await js("document.querySelector('[data-action=flow-view][data-view=history]').click();document.querySelector('[data-action=flow-history-open]').click()");
    await waitFor("!!document.querySelector('.flow-result')");
    assert.equal(await js("document.querySelector('[data-action=flow-save]').disabled"),true);
    dialog.showSaveDialog=async()=>({canceled:false,filePath:csv});
    await js("document.querySelector('[data-action=flow-csv]').click()");await waitFor("document.querySelector('#toast').textContent==='Đã xuất CSV.'");
    const csvText=await fs.readFile(csv,'utf8');assert.ok(csvText.startsWith('\uFEFF"Ngày"'));assert.ok(csvText.includes('"Gem"'));assert.ok(csvText.includes('1600'));
    await js("document.querySelector('[data-action=flow-view][data-view=history]').click();document.querySelector('[data-action=flow-history-delete]').click()");
    await waitFor("document.querySelector('#save-state').textContent.includes('Đã lưu')");assert.equal((await js('window.desktop.load()')).profiles[0].flowLab.history.length,1);
  }finally{dialog.showSaveDialog=originalSave;dialog.showOpenDialog=originalOpen;}
  console.log('PASS Economy/Balance: exact sweep/apply, resource simulation, milestones, focus/scroll, history, CSV, budget handoff, workspace backup/restore, responsive themes.');
};
