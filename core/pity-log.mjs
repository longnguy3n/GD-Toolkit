import {findNode,probabilities} from './engine.mjs';
// Sparse logs store only visits. Binary search recovers untouched pool counters on any roll.
export function pityAtRoll(result,roll) {
  if(!result.pityLog)return null;
  return result.pityLog.pools.map(log=>{
    const pool=findNode(result.config.root,log.id),p=pool.pity;
    let lo=0,hi=log.rolls.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(log.rolls[mid]<=roll)lo=mid+1;else hi=mid;}
    const i=lo-1,visited=i>=0&&log.rolls[i]===roll;
    const after=i>=0?log.after[i]:p.start,before=visited?(i>0?log.after[i-1]:p.start):after;
    const idx=pool.children.findIndex(c=>c.id===p.target),flags=visited?log.flags[i]:0;
    return {id:pool.id,name:pool.name,visited,before,after,remaining:p.hard-after,hard:!!(flags&1),soft:!!(flags&2),hit:!!(flags&4),reset:!!(flags&8),rate:visited?probabilities(pool,before)[idx]:null};
  });
}
