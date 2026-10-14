// Integration checks against real Electron renderer + IPC in an isolated userData directory.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../test-output');
app.setPath('userData',path.join(output,'profile'));
app.disableHardwareAcceleration();
process.env.GD_TOOLKIT_TEST='1';
require(process.env.GD_TOOLKIT_PACKAGED_SOURCE||'../desktop/main.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  try{
    await fs.mkdir(output,{recursive:true});
    const win=BrowserWindow.getAllWindows()[0];
    async function capture(name){await sleep(400);await fs.writeFile(path.join(output,name),(await win.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG());}
    let errors=[];win.webContents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message);});
    const js=async code=>{try{return await win.webContents.executeJavaScript(code);}catch(e){throw Error(code+'\n'+e.message);}};
    async function waitFor(code){for(let i=0;i<200;i++){if(await js(code))return;await sleep(100);}console.log(await js("document.querySelector('#toast').textContent+' | '+document.querySelector('dialog').outerHTML"));throw Error('Timeout: '+code);}
    await waitFor("!!document.querySelector('.tree-row')");
    // Reset test config without interacting with any real user profile.
    await js("(async()=>window.desktop.save({version:1, config: (await import('../core/engine.mjs')).preset(),history:[]}))()");
    win.webContents.reload();await sleep(250);await waitFor("!!document.querySelector('.tree-row')");
    assert.equal(await js("document.querySelectorAll('.tree-row').length"),13);
    await sleep(500);
    await capture('setup.png');
    await js("document.querySelector('#theme-toggle').click()");
    await waitFor("document.documentElement.dataset.theme==='light' && document.querySelector('#save-state').textContent.includes('Đã lưu')");
    await capture('setup-light.png');
    let themeDoc=JSON.parse(await fs.readFile(path.join(output,'profile/workspace.json'),'utf8'));
    assert.equal(themeDoc.settings.theme,'light');
    win.webContents.reload();await sleep(250);await waitFor("!!document.querySelector('.tree-row')");
    assert.equal(await js("document.documentElement.dataset.theme"),'light');
    await js("document.querySelector('#update-button').click()");await waitFor("document.querySelector('#update-dialog').open");
    assert.ok((await js("document.querySelector('#update-dialog').textContent")).includes('GitHub Releases'));
    await js("document.querySelector('[data-action=update-close]').click();document.querySelector('#theme-toggle').click()");
    await waitFor("document.documentElement.dataset.theme==='dark'");
    await js("document.querySelector('[data-weight=featured]').value='75';document.querySelector('[data-weight=featured]').dispatchEvent(new Event('change',{bubbles:true}));");
    await waitFor("document.querySelector('#save-state').textContent.includes('Đã lưu')");
    let saved=JSON.parse(await fs.readFile(path.join(output,'profile/workspace.json'),'utf8'));
    assert.equal(saved.config.root.children[0].children[0].weight,75);
    await js("document.querySelector('[data-weight=featured]').value='50';document.querySelector('[data-weight=featured]').dispatchEvent(new Event('change',{bubbles:true}));");
    await js("document.querySelector('[data-action=add-item]').click()");await waitFor("document.querySelector('dialog').open");
    await js("document.querySelector('dialog input[name=name]').value='QA item';document.querySelector('dialog .primary').click()");
    await waitFor("document.querySelectorAll('.tree-row').length===14");
    await js("document.querySelector('[data-action=delete-node]').click()");await waitFor("document.querySelector('dialog').open");
    await js("document.querySelector('dialog .primary').click()");await waitFor("document.querySelectorAll('.tree-row').length===13");
    await js("document.querySelector('[data-action=add-item]').click()");await waitFor("document.querySelector('dialog').open");
    await js("document.querySelector('dialog button[value=cancel]').click()");await waitFor("!document.querySelector('dialog').open");
    assert.equal(await js("document.querySelectorAll('.tree-row').length"),13);
    await js("document.querySelector('.tabs [data-tab=calculate]').click();document.querySelector('[data-action=analyze]').click()");
    await waitFor("!!document.querySelector('.result-kpis')");
    const text=await js("document.querySelector('.result-kpis').textContent");assert.ok(text.includes('100%'));assert.ok(!text.includes('NaN'));
    await capture('calculate.png');
    await js("document.querySelector('[data-action=quick-rate]').click()");assert.ok((await js("document.querySelector('#quick-result').textContent")).includes('95%'));
    await js("document.querySelector('.tabs [data-tab=simulate]').click();document.querySelector('[data-action=simulate]').click()");
    await waitFor("!!document.querySelector('[data-action=save-result]')");
    assert.equal(await js("document.querySelectorAll('tbody tr').length"),8);
    await capture('simulate.png');
    await js("document.querySelector('[data-action=save-result]').click()");await waitFor("document.querySelector('[data-action=save-result]').disabled");
    saved=JSON.parse(await fs.readFile(path.join(output,'profile/workspace.json'),'utf8'));
    assert.equal(saved.history.length,1);assert.equal(saved.history[0].sequence.length,10000);
    win.webContents.reload();await sleep(250);await waitFor("!!document.querySelector('.tree-row')");
    await js("document.querySelector('.tabs [data-tab=simulate]').click();document.querySelector('[data-action=sim-tab][data-value=history]').click()");
    assert.equal(await js("document.querySelectorAll('.history-card').length"),1);
    await js("document.querySelector('[data-action=view-history]').click()");assert.equal(await js("document.querySelectorAll('.pull').length"),48);
    await js("document.querySelector('[data-action=page][data-value=\"1\"]').click()");assert.ok((await js("document.querySelector('.pull').textContent")).includes('#49'));
    await js("document.querySelector('[data-action=history-back]').click();document.querySelector('[data-action=delete-history]').click()");await waitFor("document.querySelector('dialog').open");
    await js("document.querySelector('dialog .primary').click()");await waitFor("document.querySelectorAll('.history-card').length===0");
    saved=JSON.parse(await fs.readFile(path.join(output,'profile/workspace.json'),'utf8'));assert.equal(saved.history.length,0);
    // Resize and check the application doesn't create horizontal page overflow.
    win.setSize(1020,760);await sleep(200);await js("document.querySelector('.tabs [data-tab=setup]').click()");
    assert.equal(await js("document.documentElement.scrollWidth > window.innerWidth"),false);
    await capture('setup-small.png');
    assert.deepEqual(errors,[]);
    console.log('PASS desktop: render, edit weight, add/delete item, calculate worker, simulate worker, save/reload/delete history, pagination, responsive layout, no console errors.');
    app.exit(0);
  }catch(e){console.error(e);app.exit(1);}
});
