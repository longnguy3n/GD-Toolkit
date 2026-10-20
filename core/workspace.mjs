import {emptyBanner,validate,clone,walk} from './engine.mjs';
import {defaultEconomy,validateEconomy} from './economy.mjs';
import {allRuleEntries} from './pity-rules.mjs';
import {validatePlayerHistory} from './players.mjs';

export function profileConfig(config) {
  const c=clone(config);delete c.rng;delete c.seed;c.version=c.root.pities?3:2;
  c.economy??=defaultEconomy();c.pityReset??={onTarget:true};return c;
}
export const activeProfile = d => d.profiles.find(p=>p.id===d.activeProfileId);
export const activeBanner = d => activeProfile(d)?.banners.find(b=>b.id===activeProfile(d).activeBannerId);
export const runConfig = d => ({...d.config,rng:d.settings.rng,seed:d.settings.seed});
export function attachConfig(d) {
  Object.defineProperty(d,'config',{configurable:true,get(){return activeBanner(this).config;},set(c){activeBanner(this).config=profileConfig(c);}});
  return d;
}
export function upgradeWorkspace(input) {
  if(!input)input={version:1,config:emptyBanner(),history:[]};
  let d=clone(input);
  if(d.version===1){
    validate(d.config,{allowEmpty:true});const id=crypto.randomUUID();
    d={version:2,settings:{theme:d.settings?.theme||'dark',rng:d.config.rng,seed:d.config.seed},activeProfileId:id,profiles:[{id,config:d.config,collapsed:[]}],history:Array.isArray(d.history)?d.history.map(h=>({...h,profileId:id})):d.history};
  }
  if(d.version===2){
    const id=crypto.randomUUID();
    d={version:3,settings:d.settings,activeProfileId:id,profiles:[{id,name:'Profile mặc định',activeBannerId:d.activeProfileId,banners:d.profiles?.map(b=>({...b,config:profileConfig(b.config)}))}],history:Array.isArray(d.history)?d.history.map(h=>({...h,bannerId:h.profileId,profileId:id,profileName:'Profile mặc định'})):d.history};
  }
  validateWorkspace(d);return attachConfig(d);
}
export function validateWorkspace(d) {
  if(!d||d.version!==3||!Array.isArray(d.profiles)||!d.profiles.length||d.profiles.length>50||!Array.isArray(d.history)||d.history.length>30)throw Error('Workspace cần 1–50 profile và tối đa 30 lịch sử.');
  if(!d.settings||!['dark','light'].includes(d.settings.theme))throw Error('Theme không hợp lệ.');
  if(d.playerHistory!==undefined){
    if(!Array.isArray(d.playerHistory)||d.playerHistory.length>20||new Set(d.playerHistory.map(h=>h?.id)).size!==d.playerHistory.length)throw Error('Tối đa 20 lịch sử Players, không trùng ID.');
    d.playerHistory.forEach(validatePlayerHistory);
  }
  const ids=new Set();
  const checkId=id=>{if(typeof id!=='string'||!/^[-\w]{1,80}$/.test(id)||ids.has(id))throw Error('ID profile/banner không hợp lệ.');ids.add(id);};
  for(const p of d.profiles){
    checkId(p.id);validName(p.name,'profile');
    if(!Array.isArray(p.banners)||!p.banners.length||p.banners.length>50)throw Error('Mỗi profile cần 1–50 banner.');
    for(const b of p.banners){
      checkId(b.id);validate({...b.config,rng:d.settings.rng,seed:d.settings.seed},{allowEmpty:true});validateEconomy(b.config.economy);
      if(!Array.isArray(b.collapsed)||b.collapsed.length>200||b.collapsed.some(id=>typeof id!=='string'))throw Error('Trạng thái thu gọn pool không hợp lệ.');
    }
    if(!p.banners.some(b=>b.id===p.activeBannerId))throw Error('Banner hiện tại không tồn tại.');
  }
  if(!d.profiles.some(p=>p.id===d.activeProfileId))throw Error('Profile hiện tại không tồn tại.');
  for(const h of d.history){
    validate(h.config);
    if(!Number.isInteger(h.pulls)||h.pulls<1||h.pulls>1000000||!Array.isArray(h.sequence)||h.sequence.length!==h.pulls)throw Error('Lịch sử không hợp lệ.');
    if(h.pityLog){
      if(![1,2].includes(h.pityLog.version)||!Array.isArray(h.pityLog.pools)||h.pityLog.pools.length>208)throw Error('Log pity không hợp lệ.');
      const pools=new Map(allRuleEntries(h.config).map(e=>[e.id,{pity:e.rule}]));
      for(const l of h.pityLog.pools){const p=pools.get(l.id);if(!p||!Array.isArray(l.rolls)||!Array.isArray(l.after)||!Array.isArray(l.flags)||l.rolls.length!==l.after.length||l.rolls.length!==l.flags.length||l.rolls.length>h.pulls)throw Error('Log pity không hợp lệ.');
        for(let i=0;i<l.rolls.length;i++)if(!Number.isInteger(l.rolls[i])||l.rolls[i]<1||l.rolls[i]>h.pulls||(i>0&&l.rolls[i]<=l.rolls[i-1])||!Number.isInteger(l.after[i])||l.after[i]<0||l.after[i]>=p.pity.hard||!Number.isInteger(l.flags[i])||l.flags[i]<0||l.flags[i]>(h.pityLog.version===2?31:15))throw Error('Counter trong log pity không hợp lệ.');
        pools.delete(l.id);
      }
      if(pools.size)throw Error('Log pity thiếu pool.');
    }
  }
  if(JSON.stringify(d).length>100000000)throw Error('Workspace vượt 100 MB. Hãy xuất và xóa bớt lịch sử.');return d;
}
function validName(name,label){if(typeof name!=='string'||!name.trim()||name.length>120)throw Error(`Tên ${label} phải có 1–120 ký tự.`);}
function newBanner(d,name,source){validName(name,'banner');const b={id:crypto.randomUUID(),config:profileConfig(source),collapsed:[]};b.config.name=name.trim();validate({...b.config,rng:d.settings.rng,seed:d.settings.seed},{allowEmpty:true});return b;}
export function addBanner(d,name,source=emptyBanner()) {
  const p=activeProfile(d);if(p.banners.length>=50)throw Error('Tối đa 50 banner mỗi profile.');
  const b=newBanner(d,name,source);p.banners.push(b);return b;
}
export function removeBanner(d,id) {
  const p=activeProfile(d);if(p.banners.length===1)throw Error('Cần giữ ít nhất một banner trong profile.');
  if(!p.banners.some(b=>b.id===id))throw Error('Không tìm thấy banner.');
  p.banners=p.banners.filter(b=>b.id!==id);if(p.activeBannerId===id)p.activeBannerId=p.banners[0].id;
}
export function addProfile(d,name,source=null) {
  if(d.profiles.length>=50)throw Error('Tối đa 50 profile.');validName(name,'profile');
  const banners=source?source.banners.map(b=>({...newBanner(d,b.config.name||'Banner',b.config),collapsed:[...b.collapsed]})):[newBanner(d,'Banner đầu tiên',emptyBanner())];
  const p={id:crypto.randomUUID(),name:name.trim(),activeBannerId:banners[0].id,banners};d.profiles.push(p);return p;
}
export function removeProfile(d,id) {
  if(d.profiles.length===1)throw Error('Cần giữ ít nhất một profile.');
  if(!d.profiles.some(p=>p.id===id))throw Error('Không tìm thấy profile.');
  d.profiles=d.profiles.filter(p=>p.id!==id);if(d.activeProfileId===id)d.activeProfileId=d.profiles[0].id;
}
export function deleteNodes(config,selected) {
  const ids=new Set(selected),next=clone(config);let removed=0,disabledPity=0;
  if(ids.has(next.root.id))throw Error('Không thể xóa pool gốc.');
  function visit(n){if(!n.children)return;
    n.children=n.children.filter(c=>{if(!ids.has(c.id))return true;walk(c,()=>removed++);return false;});
    if(n.pity?.target&&!n.children.some(c=>c.id===n.pity.target)){if(n.pity.enabled)disabledPity++;n.pity={...n.pity,target:n.children[0]?.id,enabled:false};}
    for(const p of n.pities||[])if(!n.children.some(c=>c.id===p.target)){if(p.enabled)disabledPity++;p.enabled=false;p.target=n.children[0]?.id;}
    n.children.forEach(visit);
  }
  visit(next.root);validate(next,{allowEmpty:true});return {config:next,removed,disabledPity};
}
