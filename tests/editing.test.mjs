import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,emptyBanner,clone,walk,findNode,validate} from '../core/engine.mjs';
import {duplicatePool,parseItems,appendItems,editNodes} from '../core/editing.mjs';

test('pool copies have independent IDs, nested pity targets, tiers and counters',()=>{
  const c=preset();findNode(c.root,'featured').tier='SSR';findNode(c.root,'legend').pity.start=1;
  findNode(c.root,'standard').pity={enabled:true,target:'lyra',hard:3,soft:0,step:0,start:2};
  const before=clone(c),r=duplicatePool(c,'legend','Legend copy'),copy=findNode(r.config.root,r.id);
  const originalIds=new Set();walk(c.root,n=>originalIds.add(n.id));
  walk(copy,n=>assert.ok(!originalIds.has(n.id)));
  assert.equal(copy.pity.target,copy.children[0].id);assert.equal(copy.pity.start,1);
  assert.equal(copy.children[1].pity.target,copy.children[1].children[0].id);
  assert.equal(copy.children[1].pity.start,2);assert.equal(copy.children[0].tier,'SSR');
  assert.equal(r.config.root.children[1].id,copy.id);assert.equal(r.config.root.pity.target,'legend');
  copy.children[0].weight=123;assert.equal(c.root.children[0].children[0].weight,50);assert.deepEqual(c,before);
  assert.throws(()=>duplicatePool(c,'featured','No'));assert.throws(()=>duplicatePool(c,'root','No'));
});

test('paste parsing supports CRLF, blank lines, duplicate names and spreadsheet columns',()=>{
  assert.equal(parseItems('Tiny',{weight:1e-7})[0].weight,1e-7);
  assert.deepEqual(parseItems(' A\r\n\r\nB\nA ',{weight:2,tier:'R'}),[
    {name:'A',weight:2,tier:'R'},{name:'B',weight:2,tier:'R'},{name:'A',weight:2,tier:'R'}
  ]);
  assert.deepEqual(parseItems('Sword\t0,5\tSSR\nBow\t\t\nGem',{weight:2,tier:'R'}),[
    {name:'Sword',weight:.5,tier:'SSR'},{name:'Bow',weight:2,tier:''},{name:'Gem',weight:2,tier:'R'}
  ]);
  for(const text of ['', ' \n ', '\t2\tSSR', 'Bad\tno', 'Bad\t-1', 'Bad\t1\tR\textra', 'x'.repeat(121), 'A\t1\t'+'R'.repeat(41)])assert.throws(()=>parseItems(text));
});

test('batch additions are atomic, respect banner size and can populate an empty banner',()=>{
  const c=emptyBanner(),items=parseItems('A\nB'),r=appendItems(c,'root',items);
  assert.equal(r.ids.length,2);assert.notEqual(...r.ids);assert.equal(c.root.children.length,0);validate(r.config);
  const full=appendItems(c,'root',Array.from({length:199},(_,i)=>({name:'I'+i,weight:1,tier:''}))).config;
  assert.throws(()=>appendItems(full,'root',items),/200/);assert.equal(full.root.children.length,199);
  assert.throws(()=>appendItems(c,'root',[{name:'Zero',weight:0}]),/weight/);
  assert.throws(()=>appendItems(r.config,r.ids[0],items),/pool/);
  const deep=preset();deep.root.children.push(...Array.from({length:185},(_,i)=>({id:'extra'+i,name:'X',weight:1})));
  assert.throws(()=>duplicatePool(deep,'legend','Copy'),/200/);assert.equal(deep.root.children.length,188);
});

test('multi-edit changes only selected fields and nodes, including mixed pool/item selections',()=>{
  const c=preset(),before=clone(c),r=editNodes(c,['legend','featured','featured'],{weight:2,tier:' SSR '});
  assert.equal(findNode(r.root,'legend').weight,2);assert.equal(findNode(r.root,'legend').tier,undefined);
  assert.equal(findNode(r.root,'featured').weight,2);assert.equal(findNode(r.root,'featured').tier,'SSR');
  assert.equal(findNode(r.root,'standard').weight,50);assert.equal(findNode(r.root,'lyra').tier,undefined);
  assert.deepEqual(findNode(r.root,'legend').pity,findNode(c.root,'legend').pity);assert.deepEqual(c,before);
  assert.equal(findNode(editNodes(r,['featured'],{tier:''}).root,'featured').tier,'');
  for(const [ids,patch] of [[['legend','epic','common'],{weight:0}],[['legend'],{tier:'SSR'}],[['root'],{weight:1}],[['gone'],{weight:1}],[['featured'],{name:'x'}]])assert.throws(()=>editNodes(c,ids,patch));
  assert.deepEqual(c,before);
});
