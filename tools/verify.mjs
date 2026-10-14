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

const offlineRoot=path.join(root,'docs/离线补全');
if(fs.existsSync(offlineRoot)){
  const offlineIndex=read(path.join(offlineRoot,'evidence-index.json'));
  check(offlineIndex.appVersion==='8.72.0'&&offlineIndex.records.length===9,'离线静态证据计数');
  for(const record of offlineIndex.records){
    const file=path.join(offlineRoot,record.file);
    check(fs.existsSync(file),'离线静态证据缺失：'+record.id);
    if(fs.existsSync(file))check(digest(fs.readFileSync(file))===record.publicSha256,'离线静态证据摘要：'+record.id);
    if(record.sourceFile){
      const source=path.join(offlineRoot,record.sourceFile);
      check(fs.existsSync(source)&&digest(fs.readFileSync(source))===record.sourceSha256,'离线方法源码摘要：'+record.id);
    }
  }
  const emulator=read(path.join(offlineRoot,'emulator-observations.json'));
  check(emulator.observationCount===17&&emulator.observations.length===17,'模拟器观察计数');
  check(emulator.settingsRestored===true,'模拟器设置未恢复');
  check(emulator.fontExperiment?.cycles===3,'模拟器字号对照轮次');
  check(emulator.observations.some(o=>o.id==='E017-final-home'&&o.page==='home'),'模拟器最终首页记录');
}
const writingManifest=process.argv.includes('--write-manifest');
const round2Root=path.join(offlineRoot,'第二轮');
let round2Summary=null;
if(fs.existsSync(round2Root)){
  const index=read(path.join(round2Root,'evidence-index.json'));
  check(index.appVersion==='8.72.0'&&index.records.length===55,'第二轮证据计数或版本');
  check(new Set(index.records.map(r=>r.id)).size===index.records.length,'第二轮编号重复');
  const methods=index.records.filter(r=>r.operation==='inspect_android_method');
  check(methods.length===39&&methods.filter(r=>r.bodyStatus==='available').length===36&&methods.filter(r=>r.bodyStatus==='not_available').length===3,'第二轮方法查询状态');
  check(index.auxiliary.length===20&&index.counts.reaEvidence===55&&index.counts.auxiliary===20,'第二轮辅助记录计数');
  for(const r of index.records){
    const file=path.join(round2Root,r.file),ev=read(file);
    check(digest(fs.readFileSync(file))===r.publicSha256,'第二轮公开证据摘要：'+r.id);
    check(ev.evidence_id===r.evidenceId&&ev.subject.digest.sha256===index.apkSha256&&r.artifactSha256===index.apkSha256,'第二轮证据身份：'+r.id);
    check(/^[a-f0-9]{64}$/.test(r.originalSha256)&&ev._public_export?.originalFileSha256===r.originalSha256,'第二轮原件摘要：'+r.id);
    if(r.sourceFile){
      const text=fs.readFileSync(path.join(round2Root,r.sourceFile));
      const normalized=ev.normalized_result.source.text.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'');
      check(digest(text)===r.sourceSha256&&text.toString('utf8')===normalized,'第二轮方法文本：'+r.id);
      check(r.bodyStatus===ev.normalized_result.body_status&&r.sourceStatus===ev.normalized_result.source.status,'第二轮方法状态：'+r.id);
    }
  }
  for(const r of index.auxiliary){
    check(digest(fs.readFileSync(path.join(round2Root,r.file)))===r.publicSha256,'第二轮辅助摘要：'+r.id);
    check(r.isReaEvidence===false&&r.runtimeObserved===false&&r.apkSha256===index.apkSha256,'第二轮辅助来源边界：'+r.id);
  }
  const e=read(path.join(round2Root,'emulator-observations.json'));
  check(e.observationCount===18&&e.observations.length===18&&new Set(e.observations.map(o=>o.id)).size===18,'第二轮模拟器有效观察');
  check(e.excludedObservations.length===1&&e.excludedObservations[0].id==='E022-gallery-open'&&!e.observations.some(o=>o.id==='E022-gallery-open'),'第二轮排除观察');
  for(const o of e.observations){
    check(o.appVersion==='8.72.0'&&o.kind==='emulator_observation','第二轮观察版本和类型：'+o.id);
    check(['observation','screenshot','hierarchy'].every(k=>/^[a-f0-9]{64}$/.test(o.sourceHashes[k])),'第二轮观察原件摘要：'+o.id);
  }
  const final=e.observations.find(o=>o.id==='E036-final-home-restored');
  check(e.settingsRestored===true&&final?.page==='home'&&final.environment.size==='Physical size: 1080x1920'&&final.environment.density==='Physical density: 280'&&final.environment.fontScale==='1.0','第二轮设置恢复');
  check(e.resume.sameObservedPid===true&&e.resume.processDeathTested===false&&e.keyboardSeries.fullSoftKeyboardVisible===false,'第二轮后台与键盘测试边界');
  round2Summary={staticEvidence:index.records.length,auxiliary:index.auxiliary.length,emulatorObservations:e.observations.length,excludedObservations:e.excludedObservations.length};
}
const round3Root=path.join(offlineRoot,'第三轮');
let round3Summary=null;
if(fs.existsSync(round3Root)){
  const index=read(path.join(round3Root,'evidence-index.json'));
  check(index.appVersion==='8.72.0'&&index.records.length===81,'第三轮证据计数或版本');
  check(new Set(index.records.map(r=>r.id)).size===81,'第三轮证据编号重复');
  const methods=index.records.filter(r=>r.operation==='inspect_android_method');
  check(methods.length===60&&methods.filter(r=>r.bodyStatus==='available').length===57&&methods.filter(r=>r.bodyStatus==='not_available').length===3,'第三轮方法状态');
  check(index.counts.reaEvidence===81&&index.counts.methodQueries===60&&index.counts.availableBodies===57&&index.counts.unavailableBodies===3,'第三轮索引方法计数');
  check(index.auxiliary.length===20&&index.counts.auxiliary===20&&index.derived.length===2,'第三轮辅助和派生文件计数');
  check(index.counts.newRuntimeObservations===0&&index.counts.reusedRuntimeObservations===2,'第三轮运行边界');
  for(const r of index.records){
    const file=path.join(round3Root,r.file),ev=read(file);
    check(digest(fs.readFileSync(file))===r.publicSha256,'第三轮证据摘要：'+r.id);
    check(ev.evidence_id===r.evidenceId&&ev.subject.digest.sha256===index.apkSha256&&r.artifactSha256===index.apkSha256,'第三轮证据身份：'+r.id);
    check(/^[a-f0-9]{64}$/.test(r.originalSha256)&&ev._public_export?.originalFileSha256===r.originalSha256,'第三轮原件摘要：'+r.id);
    if(r.sourceFile){
      const source=fs.readFileSync(path.join(round3Root,r.sourceFile));
      check(digest(source)===r.sourceSha256&&source.toString('utf8')===ev.normalized_result.source.text.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,indent=>indent.replace(/\t/g,'    ')),'第三轮方法文本：'+r.id);
      check(r.bodyStatus===ev.normalized_result.body_status&&r.sourceStatus===ev.normalized_result.source.status,'第三轮方法来源状态：'+r.id);
    }
  }
  for(const r of index.auxiliary){
    check(digest(fs.readFileSync(path.join(round3Root,r.file)))===r.publicSha256,'第三轮辅助摘要：'+r.id);
    check(r.apkSha256===index.apkSha256&&r.isReaEvidence===false&&r.runtimeObserved===false&&/^[a-f0-9]{64}$/.test(r.originalSha256),'第三轮辅助来源：'+r.id);
  }
  for(const r of index.derived){
    const data=read(path.join(round3Root,r.file));
    check(digest(fs.readFileSync(path.join(round3Root,r.file)))===r.publicSha256&&/^[a-f0-9]{64}$/.test(r.originalSha256),'第三轮派生摘要：'+r.file);
    check(data.appVersion===index.appVersion&&data.apkSha256===index.apkSha256,'第三轮派生版本：'+r.file);
    for(const source of data.sources){
      const a=index.auxiliary.find(a=>a.file===source.file);
      check(a&&a.publicSha256===source.publicSha256&&a.originalSha256===source.originalSha256,'第三轮派生来源：'+source.file);
    }
  }
  const font=read(path.join(round3Root,'font-condition-table.json'));
  check(font.checks.baseEnumCount===37&&font.checks.expandedEnumCount===111&&font.checks.mapEntriesCrossCheckedAgainstDex===111&&font.checks.allValuesMatched===true,'第三轮字体表对照');
  check(font.runtimeObserved===false&&font.selectedTokens.length===6&&font.detailAttribute.title===3&&font.detailAttribute.body===10,'第三轮字体映射和边界');
  check(JSON.stringify(font.selectedTokens.map(t=>[t.ordinal,t.size,t.lineHeight]))===JSON.stringify([[3,18,26],[10,15,22],[40,20,29],[47,17,25],[77,22,32],[84,19,28]]),'第三轮详情字体数值');
  check(JSON.stringify(font.selection.modeRows.map(r=>[r.mode,r.offset,r.unit]))===JSON.stringify([[-1,0,'sp'],[0,0,'dp'],[1,37,'dp'],[2,74,'dp']]),'第三轮字体单位');
  const comments=read(path.join(round3Root,'comment-layout-rules.json'));
  check(comments.newRuntimeObservations===0&&comments.comparison.observations.length===2,'第三轮评论复用观察');
  check(comments.comparison.predictedPrimaryStartPx===157&&comments.comparison.predictedReplyStartPx===226&&comments.comparison.predictedBodyRightPx===933,'第三轮评论几何');
  check(comments.footerWrap.longTextCollapseThreshold===null&&comments.typography.runtimeTypefaceAndSizeConfirmed===false,'第三轮未验证项边界');
  for(const o of comments.comparison.observations)check(o.kind==='reused-prior-device-observation'&&o.containsUserText===false&&Object.values(o.sourceHashes).every(h=>/^[a-f0-9]{64}$/.test(h)),'第三轮旧观察来源：'+o.id);
  round3Summary={staticEvidence:index.records.length,auxiliary:index.auxiliary.length,fontEntriesCrossChecked:111,reusedObservations:2,newRuntimeObservations:0};
}
if(writingManifest&&!problems.length){
  const manifest={schemaVersion:1,title:'帖子软件排版与逻辑',scope:'Public derived repository; .git and this manifest are excluded.',files:files.map(p=>({file:relative(p),bytes:fs.statSync(p).size,sha256:digest(fs.readFileSync(p))}))};
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
}
if(!writingManifest&&fs.existsSync(manifestFile)){
  const manifest=read(manifestFile);
  check(manifest.files.length===files.length,'公开清单与当前文件数量不同');
  const indexed=new Set(manifest.files.map(e=>e.file));
  check(indexed.size===manifest.files.length&&files.every(p=>indexed.has(relative(p))),'公开清单成员不同');
  for(const e of manifest.files){
    const p=path.join(root,e.file);
    check(fs.existsSync(p)&&fs.statSync(p).size===e.bytes&&digest(fs.readFileSync(p))===e.sha256,'仓库摘要不匹配：'+e.file);
  }
}else if(!writingManifest) check(false,'缺少 public-manifest.json');
console.log(JSON.stringify({status:problems.length?'FAIL':'PASS',files:files.length+Number(fs.existsSync(manifestFile)),importedResearchFiles:provenance.records.length,jsonFiles,localLinks:links,layoutMetrics:layout.metrics.length,coreEvidence:core.records.length,round2:round2Summary,round3:round3Summary,issues:problems},null,2));
if(problems.length)process.exitCode=1;
