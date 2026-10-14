// Maintainer helper. Credentials stay in process memory; use the existing Git credential manager.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const owner='longnguy3n',repo='GD-Toolkit',base=`https://api.github.com/repos/${owner}/${repo}`;
async function main(){
  const credential=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',stdio:['pipe','pipe','pipe']});
  const token=credential.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);
  if(!token)throw Error('GitHub credential manager did not provide a credential.');
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'GD-Toolkit-release'};
  async function api(url,method='GET',body){const r=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined});if(!r.ok){const text=await r.text();throw Error(`GitHub ${r.status}: ${text.slice(0,400)}`);}return r.json();}
  const meta=await api(base);console.log(JSON.stringify({repository:meta.full_name,private:meta.private,permissions:meta.permissions,defaultBranch:meta.default_branch}));
  if(process.argv[2]==='make-public'){const updated=await api(base,'PATCH',{private:false});console.log(JSON.stringify({repository:updated.full_name,private:updated.private,url:updated.html_url}));return;}
  if(process.argv[2]==='status'){
    const runs=await api(`${base}/actions/runs?per_page=3`);
    console.log(JSON.stringify({runs:runs.workflow_runs.map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha}))}));
    const releases=await api(`${base}/releases?per_page=3`);
    console.log(JSON.stringify({releases:releases.map(r=>({tag:r.tag_name,draft:r.draft,url:r.html_url,assets:r.assets.map(a=>({name:a.name,bytes:a.size,url:a.browser_download_url}))}))}));return;
  }
  if(process.argv[2]!=='publish')return;
  const root=path.resolve(__dirname,'..'),pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')),tag='v'+pkg.version;
  const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',cwd:root}).trim();
  const remote=execFileSync('git',['ls-remote','origin','refs/heads/main'],{encoding:'utf8',cwd:root}).split(/\s/)[0];
  if(commit!==remote)throw Error('Push the exact current commit to origin/main first.');
  const tagRef=await api(`${base}/git/ref/tags/${tag}`);
  if(tagRef.object.sha!==commit)throw Error('Release tag does not point directly to the current pushed commit.');
  const notes=await fs.readFile(path.join(root,'RELEASE_NOTES.md'),'utf8');
  let release;
  const existing=await fetch(`${base}/releases/tags/${tag}`,{headers});
  if(existing.ok){release=await existing.json();if(!release.draft)throw Error('Release is already published; do not overwrite published binaries.');}
  else if(existing.status===404)release=await api(`${base}/releases`,'POST',{tag_name:tag,target_commitish:commit,name:'GD Toolkit '+tag,body:notes,draft:true,prerelease:false});
  else throw Error('Could not inspect existing release: '+existing.status);
  const names=[`GD-Toolkit-Setup-${pkg.version}-x64.exe`,`GD-Toolkit-Setup-${pkg.version}-x64.exe.blockmap`,'latest.yml'];
  for(const name of names){
    if(release.assets?.some(a=>a.name===name))throw Error(`Draft already contains ${name}; inspect before replacing.`);
    const body=await fs.readFile(path.join(root,'releases',name));
    const url=release.upload_url.split('{')[0]+'?name='+encodeURIComponent(name);
    const response=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream'},body});
    if(!response.ok)throw Error('Upload failed: '+name+' HTTP '+response.status);
    const asset=await response.json();if(asset.size!==body.length)throw Error('Uploaded asset size mismatch.');
    console.log(JSON.stringify({uploaded:asset.name,bytes:asset.size}));
  }
  const published=await api(`${base}/releases/${release.id}`,'PATCH',{draft:false,make_latest:'true'});
  console.log(JSON.stringify({release:published.html_url,draft:published.draft,assets:published.assets.map(a=>({name:a.name,size:a.size,url:a.browser_download_url}))}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
