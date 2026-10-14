import {analyze,simulate} from '../core/engine.mjs';
self.onmessage=e=>{try{const {type,args}=e.data;const progress=p=>self.postMessage({progress:p});const result=type==='analyze'?analyze(...args,progress):simulate(args[0],args[1],{...args[2],onProgress:progress});self.postMessage({result});}catch(error){self.postMessage({error:error.message});}};
