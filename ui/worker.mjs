import {simulate} from '../core/engine.mjs';
import {forecast} from '../core/forecast.mjs';
self.onmessage=e=>{try{const {type,args}=e.data;const progress=p=>self.postMessage({progress:p});const result=type==='analyze'?forecast(...args,progress):simulate(args[0],args[1],{...args[2],onProgress:progress});self.postMessage({result});}catch(error){self.postMessage({error:error.message});}};
