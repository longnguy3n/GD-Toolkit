import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBanner,simulate,validate,clone} from '../core/engine.mjs';
import {tierColor,tierForeground,setTierColors} from '../core/tiers.mjs';
import {tierBadge,pullLog} from '../ui/features.mjs';
import {upgradeWorkspace,addBanner,validateWorkspace} from '../core/workspace.mjs';
test('tier palette applies by exact trimmed name, is isolated per banner and preserved in history',()=>{
 const c=emptyBanner();c.root.children=[{id:'a',name:'A',weight:1,tier:'SSR'},{id:'b',name:'B',weight:1,tier:'SSR'}];
 const before=simulate(c,100);setTierColors(c,['SSR'],'#FBBF24');validate(c);
 assert.equal(tierColor(c,' SSR '),'#fbbf24');assert.equal(tierColor(c,'SR'),null);assert.deepEqual(simulate(c,100).sequence,before.sequence);
 const d=upgradeWorkspace({version:1,config:c,history:[simulate(c,3)]});const copy=addBanner(d,'Copy',c);
 setTierColors(copy.config,['SSR'],'#60a5fa');assert.equal(tierColor(d.config,'SSR'),'#fbbf24');
 setTierColors(d.config,['SSR'],'#f472b6');validateWorkspace(d);
 const restored=upgradeWorkspace(JSON.parse(JSON.stringify(d)));assert.equal(tierColor(restored.history[0].config,'SSR'),'#fbbf24');assert.match(pullLog(restored.history[0],0,3),/background:#fbbf24/);
 setTierColors(d.config,['SSR'],'');assert.equal(tierColor(d.config,'SSR'),null);
});
test('tier palette validation prevents invalid CSS and preserves plain/old labels',()=>{
 const c=emptyBanner();c.root.children=[{id:'a',name:'A',weight:1,tier:'SSR'}];
 for(const colors of [null,[],{SSR:'red'},{SSR:'#fff'},{SSR:'#ff0000;display:none'},{' ': '#ff0000'},{SSR:3}]){c.tierColors=colors;assert.throws(()=>validate(c),/tier/);}
 delete c.tierColors;assert.equal(tierBadge('SSR',c),tierBadge('SSR'));
 setTierColors(c,['__proto__','<SSR>'],'#ffffff');validate(c);assert.equal(tierColor(c,'__proto__'),'#ffffff');assert.match(tierBadge('<SSR>',c),/Tier: &lt;SSR&gt;/);assert.equal({}.polluted,undefined);
 const old=clone(c.tierColors);assert.throws(()=>setTierColors(c,['SSR'],'url(bad)'));assert.deepEqual(c.tierColors,old);
});
test('tier labels choose readable foreground for light and dark colors',()=>{
 assert.equal(tierForeground('#000000'),'#ffffff');assert.equal(tierForeground('#ffffff'),'#000000');assert.equal(tierForeground('#fbbf24'),'#000000');assert.equal(tierForeground('#1e1b4b'),'#ffffff');
});
test('hard and soft wins have distinct labels; misses are not marked as pity wins',()=>{
 const c=emptyBanner();c.root.children=[{id:'a',name:'A',weight:0},{id:'b',name:'B',weight:1}];c.root.pity={enabled:true,target:'a',hard:3,soft:2,step:1,start:0};
 let r=simulate(c,2);assert.match(pullLog(r,1,1),/soft-pull/);assert.doesNotMatch(pullLog(r,0,1),/class="pull soft-pull/);
 c.root.pity.soft=0;r=simulate(c,3);const html=pullLog(r,2,1);assert.match(html,/TRÚNG HARD PITY/);assert.match(html,/ĐÃ NHẬN BẢO ĐẢM/);assert.match(html,/class="pity-event-hard"/);
});
