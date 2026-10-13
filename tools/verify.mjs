import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifestFile=path.join(root,'public-manifest.json');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const relative=p=>path.relative(root,p).replaceAll('\\','/');
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    if(['.git','node_modules','.cache'].includes(e.name))return [];
    if(e.isSymbolicLink())throw new Error('不允许符号链接：'+relative(path.join(dir,e.name)));
    return e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)];
  });
}
const files=walk(root).filter(p=>p!==manifestFile).sort();
const problems=[];
const check=(condition,message)=>{if(!condition)problems.push(message);};
let jsonFiles=0,links=0;
for(const file of files){
  const name=relative(file),ext=path.extname(file).toLowerCase();
  check(!['.apk','.dex','.so','.zip','.partial'].includes(ext),'不应公开的文件类型：'+name);
  if(ext==='.xml')check(name==='docs/证据包/AndroidManifest.xml','未知 XML：'+name);
  if(ext==='.mp4')check(name==='docs/深度研究/动效/R31/motion-app-only.mp4','未知录像：'+name);
  check(!/^(?:screen|before|after)\.png$/.test(path.basename(file)),'原始截图：'+name);
  check(fs.statSync(file).size<50*1024*1024,'单文件超出研究库大小预算：'+name);
  if(['.md','.json','.txt','.xml','.mjs'].includes(ext)){
    const text=fs.readFileSync(file,'utf8');
    check(!/\b[A-Za-z]:[\\/]/.test(text),'残留主机绝对路径：'+name);
    check(!/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,}|sk-[A-Za-z0-9_-]{25,})\b/.test(text),'疑似凭据格式：'+name);
    if(ext==='.json'){try{read(file);jsonFiles++;}catch{problems.push('JSON 无法解析：'+name);}}
    if(ext==='.md'){
      check((text.match(/^```/gm)??[]).length%2===0,'代码围栏不成对：'+name);
      for(const m of text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)){
        const href=m[1].replace(/^<|>$/g,'');
        if(/^(?:[a-z]+:|#)/i.test(href))continue;
        links++;
        const target=path.resolve(path.dirname(file),decodeURIComponent(href.split('#')[0]));
        check(target.startsWith(root+path.sep),'链接越出仓库：'+name);
        if(target===manifestFile&&process.argv.includes('--write-manifest'))continue;
        check(fs.existsSync(target),'失效链接：'+name+' → '+href);
      }
    }
  }
}
const provenance=read(path.join(root,'provenance.json'));
for(const entry of provenance.records){
  const file=path.join(root,entry.file);
  check(fs.existsSync(file),'缺少导入文件：'+entry.file);
  if(fs.existsSync(file))check(fs.statSync(file).size===entry.bytes&&digest(fs.readFileSync(file))===entry.publicSha256,'公开来源摘要不匹配：'+entry.file);
  check(/^[a-f0-9]{64}$/.test(entry.originalSha256),'原始摘要无效：'+entry.file);
}
const core=read(path.join(root,'docs/深度研究/机制/evidence-index.json'));
check(core.records.length===77,'静态机制证据计数变化');
for(const record of core.records){
  const raw=path.join(root,'docs/深度研究/机制',record.rawEvidenceFile),ev=read(raw);
  check(digest(fs.readFileSync(raw))===record.rawEvidenceSha256,'静态证据摘要：'+record.id);
  check(ev.evidence_id===record.evidenceId&&ev.subject.digest.sha256===record.artifactSha256,'静态证据身份：'+record.id);
  if(record.sourceFile)check(digest(fs.readFileSync(path.join(root,'docs/深度研究/机制',record.sourceFile)))===record.sourceSha256,'方法源码摘要：'+record.id);
}
const previous=read(path.join(root,'docs/证据包/index.json'));
for(const entry of previous.entries)check(digest(fs.readFileSync(path.resolve(root,'docs/证据包',entry.file)))===entry.sha256,'早期静态证据摘要：'+entry.alias);
const layout=read(path.join(root,'docs/深度研究/排版/metrics.json'));
check(layout.metrics.length===84&&new Set(layout.metrics.map(m=>m.id)).size===84,'排版指标计数');
for(const a of layout.annotations)check(digest(fs.readFileSync(path.join(root,'docs/深度研究/排版',a.file)))===a.sha256,'标注图摘要：'+a.file);
const motion=read(path.join(root,'docs/深度研究/动效/export-manifest.json'));
for(const a of motion.assets){
  const file=path.join(root,'docs/深度研究',a.file);
  check(fs.statSync(file).size===a.bytes&&digest(fs.readFileSync(file))===a.sha256,'动效文件摘要：'+a.file);
}
check(read(path.join(root,'docs/深度研究/复刻参数.json')).items.length===28,'参数计数变化');
if(process.argv.includes('--write-manifest')&&!problems.length){
  const manifest={schemaVersion:1,title:'帖子软件排版与逻辑',scope:'Public derived repository; .git and this manifest are excluded.',files:files.map(p=>({file:relative(p),bytes:fs.statSync(p).size,sha256:digest(fs.readFileSync(p))}))};
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
}
if(fs.existsSync(manifestFile)){
  const manifest=read(manifestFile);
  check(manifest.files.length===files.length,'公开清单与当前文件数量不同');
  const indexed=new Set(manifest.files.map(e=>e.file));
  check(indexed.size===manifest.files.length&&files.every(p=>indexed.has(relative(p))),'公开清单成员不同');
  for(const e of manifest.files){
    const p=path.join(root,e.file);
    check(fs.existsSync(p)&&fs.statSync(p).size===e.bytes&&digest(fs.readFileSync(p))===e.sha256,'仓库摘要不匹配：'+e.file);
  }
}else check(false,'缺少 public-manifest.json');
console.log(JSON.stringify({status:problems.length?'FAIL':'PASS',files:files.length+Number(fs.existsSync(manifestFile)),importedResearchFiles:provenance.records.length,jsonFiles,localLinks:links,layoutMetrics:layout.metrics.length,coreEvidence:core.records.length,issues:problems},null,2));
if(problems.length)process.exitCode=1;
