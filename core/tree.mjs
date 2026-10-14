import {effective} from './engine.mjs';

// Weights are local to each parent. Only direct children contribute to banner weight;
// only leaves contribute to total probability, so nested pools are never double-counted.
export function treeSummary(config) {
  const rates=new Map();let baseRate=0,realRate=0;
  function visit(pool,base,real) {
    const sum=pool.children.reduce((n,c)=>n+c.weight,0),actual=effective(pool,config.pityReset);
    pool.children.forEach((child,i)=>{
      const local=child.weight/sum,entry={local,base:base*local,real:real*actual[i]};
      rates.set(child.id,entry);
      if(child.children)visit(child,entry.base,entry.real);
      else{baseRate+=entry.base;realRate+=entry.real;}
    });
  }
  visit(config.root,1,1);
  return {rates,weight:config.root.children.reduce((n,c)=>n+c.weight,0),baseRate,realRate};
}
