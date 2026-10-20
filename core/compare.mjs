import {clone,validate,leaves} from './engine.mjs';
import {forecast} from './forecast.mjs';
export function compareBanners(entries,copies,pulls,onProgress=()=>{}){
  if(!Array.isArray(entries)||entries.length<2||entries.length>6)throw Error('Chọn từ 2 đến 6 banner để so sánh.');
  if(new Set(entries.map(e=>e.bannerId)).size!==entries.length)throw Error('Mỗi banner chỉ được chọn một lần.');
  if(!Number.isInteger(copies)||copies<1||copies>50||!Number.isInteger(pulls)||pulls<1||pulls>10000)throw Error('Số bản sao 1–50; số lượt 1–10.000.');
  for(const e of entries){validate(e.config);if(!leaves(e.config.root).some(n=>n.id===e.target))throw Error(`Chọn item mục tiêu cho banner ${e.config.name}.`);}
  const rows=entries.map((e,i)=>{
    onProgress({banner:i+1,total:entries.length,name:e.config.name,examined:0});
    const result=forecast(e.config,e.target,copies,pulls,p=>onProgress({banner:i+1,total:entries.length,name:e.config.name,...p}));
    return {...clone(e),result};
  });
  return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),copies,pulls,rows};
}
