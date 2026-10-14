import {tierColor,tierForeground} from '../core/tiers.mjs';
import {esc,tierBadge} from './features.mjs';
const palette=[['Xám','#94a3b8'],['Xanh lá','#34d399'],['Xanh dương','#60a5fa'],['Tím','#a78bfa'],['Vàng','#fbbf24'],['Hồng','#f472b6']];
export function tierColorEditor(config,names){
  const tiers=[...new Set(names.map(n=>(n||'').trim()).filter(Boolean))];
  if(!tiers.length)return '<p class="rng-details full">Nhập tên tier để chọn màu hiển thị.</p>';
  const colors=tiers.map(t=>tierColor(config,t)),mixed=colors.some(c=>c!==colors[0]),value=mixed?'#a78bfa':colors[0]||'#a78bfa',data=esc(JSON.stringify(tiers));
  return `<div class="tier-color-editor full"><h3>Màu tier${tiers.length>1?' · '+tiers.length+' tier':''}</h3><div class="tier-color-preview">${tiers.map(t=>tierBadge(t,config)).join('')}</div><label class="inline tier-color-input">Chọn màu<input type="color" data-tier-colors="${data}" value="${value}" aria-label="Chọn màu tier"><small>${mixed?'Nhiều màu':colors[0]||'Mặc định'}</small></label><div class="tier-swatches">${palette.map(([name,color])=>`<button class="tier-swatch" data-action="tier-color" data-tiers="${data}" data-value="${color}" aria-label="Màu tier ${name}" title="${name} · ${color}" aria-pressed="${!mixed&&colors[0]===color}" style="background:${color};color:${tierForeground(color)}">${!mixed&&colors[0]===color?'✓':''}</button>`).join('')}<button class="small" data-action="tier-color" data-tiers="${data}" data-value="">Màu mặc định</button></div><small>Màu dùng chung cho mọi item có cùng tên tier trong banner này. History đã lưu giữ màu cũ.</small></div>`;
}
