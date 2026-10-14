import {preset,validate,clone,walk} from './engine.mjs';
import {defaultEconomy,validateEconomy} from './economy.mjs';

export function profileConfig(config) {
  const c=clone(config);delete c.rng;delete c.seed;
  c.economy??=defaultEconomy();return c;
}
export const activeProfile = doc => doc.profiles.find(p=>p.id===doc.activeProfileId);
export const runConfig = doc => ({...doc.config,rng:doc.settings.rng,seed:doc.settings.seed});
export function attachConfig(doc) {
  Object.defineProperty(doc,'config',{configurable:true,get(){return activeProfile(this).config;},set(c){activeProfile(this).config=profileConfig(c);}});
  return doc;
}
export function upgradeWorkspace(input) {
  if(!input)input={version:1,config:preset(),history:[]};
  const d=clone(input);
  if(d.version===1){
    validate(d.config);
    const id=crypto.randomUUID();
    const settings={theme:d.settings?.theme||'dark',rng:d.config.rng,seed:d.config.seed};
    const migrated={version:2,settings,activeProfileId:id,profiles:[{id,config:profileConfig(d.config),collapsed:[]}],history:d.history};
    if(Array.isArray(migrated.history))migrated.history=migrated.history.map(h=>({...h,profileId:id}));
    validateWorkspace(migrated);return attachConfig(migrated);
  }
  validateWorkspace(d);return attachConfig(d);
}
export function validateWorkspace(d) {
  if(!d||d.version!==2||!Array.isArray(d.profiles)||!d.profiles.length||d.profiles.length>50||!Array.isArray(d.history)||d.history.length>30)throw Error('Workspace cần 1–50 banner và tối đa 30 lịch sử.');
  if(!d.settings||!['dark','light'].includes(d.settings.theme))throw Error('Theme không hợp lệ.');
  const ids=new Set();
  for(const p of d.profiles){
    if(typeof p.id!=='string'||!/^[-\w]{1,80}$/.test(p.id)||ids.has(p.id))throw Error('ID banner không hợp lệ.');
    ids.add(p.id);
    validate({...p.config,rng:d.settings.rng,seed:d.settings.seed});validateEconomy(p.config.economy);
    if(!Array.isArray(p.collapsed)||p.collapsed.length>200||p.collapsed.some(id=>typeof id!=='string'))throw Error('Trạng thái thu gọn pool không hợp lệ.');
  }
  if(!ids.has(d.activeProfileId))throw Error('Banner hiện tại không tồn tại.');
  for(const h of d.history){validate(h.config);if(!Number.isInteger(h.pulls)||h.pulls<1||h.pulls>1000000||!Array.isArray(h.sequence)||h.sequence.length!==h.pulls)throw Error('Lịch sử không hợp lệ.');}
  if(JSON.stringify(d).length>100000000)throw Error('Workspace vượt 100 MB. Hãy xuất và xóa bớt lịch sử.');
  return d;
}
export function addProfile(d,name,source=preset()) {
  if(d.profiles.length>=50)throw Error('Tối đa 50 banner.');
  if(typeof name!=='string'||!name.trim()||name.length>120)throw Error('Tên banner phải có 1–120 ký tự.');
  const p={id:crypto.randomUUID(),config:profileConfig(source),collapsed:[]};p.config.name=name.trim();
  validate({...p.config,rng:d.settings.rng,seed:d.settings.seed});validateEconomy(p.config.economy);
  d.profiles.push(p);return p;
}
export function removeProfile(d,id) {
  if(d.profiles.length===1)throw Error('Cần giữ ít nhất một banner.');
  if(!d.profiles.some(p=>p.id===id))throw Error('Không tìm thấy banner.');
  d.profiles=d.profiles.filter(p=>p.id!==id);
  if(d.activeProfileId===id)d.activeProfileId=d.profiles[0].id;
  // History keeps its self-contained snapshot even when its banner is deleted.
}
export function deleteNodes(config,selected) {
  const ids=new Set(selected),next=clone(config);let removed=0,disabledPity=0;
  if(ids.has(next.root.id))throw Error('Không thể xóa pool gốc.');
  function visit(n){if(!n.children)return;
    n.children=n.children.filter(c=>{if(!ids.has(c.id))return true;walk(c,()=>removed++);return false;});
    if(n.pity?.target&&!n.children.some(c=>c.id===n.pity.target)){if(n.pity.enabled)disabledPity++;n.pity={...n.pity,target:n.children[0]?.id,enabled:false};}
    n.children.forEach(visit);
  }
  visit(next.root);validate(next);return {config:next,removed,disabledPity};
}
