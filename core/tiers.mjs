export const validTierColor=color=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color);
export function tierColor(config,tier){const name=String(tier||'').trim(),colors=config?.tierColors;return colors&&Object.hasOwn(colors,name)&&validTierColor(colors[name])?colors[name].toLowerCase():null;}
export function tierForeground(color){
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#000000':'#ffffff';
}
export function validateTierColors(colors){
  if(colors===undefined)return;
  if(!colors||typeof colors!=='object'||Array.isArray(colors)||Object.keys(colors).length>1000)throw Error('Bảng màu tier không hợp lệ (tối đa 1.000 tier).');
  for(const [tier,color] of Object.entries(colors))if(!tier.trim()||tier!==tier.trim()||tier.length>40||!validTierColor(color))throw Error('Màu tier cần tên tier 1–40 ký tự và màu dạng #RRGGBB.');
}
export function setTierColors(config,tiers,color){
  if(!Array.isArray(tiers)||!tiers.length||tiers.some(t=>typeof t!=='string'||!t.trim()||t.trim().length>40)||color!==''&&!validTierColor(color))throw Error('Chọn tier và màu hợp lệ.');
  let colors={...config.tierColors};
  for(const name of tiers){const tier=name.trim();if(color==='')delete colors[tier];else colors={...colors,[tier]:color.toLowerCase()};}
  validateTierColors(colors);config.tierColors=colors;
}
