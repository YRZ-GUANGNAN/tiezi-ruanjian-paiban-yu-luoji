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
const round4Root=path.join(offlineRoot,'第四轮');
let round4Summary=null;
if(fs.existsSync(round4Root)){
  const index=read(path.join(round4Root,'evidence-index.json'));
  const methods=index.records.filter(r=>r.operation==='inspect_android_method');
  check(index.appVersion==='8.72.0'&&index.records.length===37&&new Set(index.records.map(r=>r.id)).size===37,'第四轮精选证据版本或数量');
  check(methods.length===30&&methods.filter(r=>r.bodyStatus==='available').length===28&&methods.filter(r=>r.bodyStatus==='not_available').length===2,'第四轮方法状态');
  check(index.counts.reaEvidence===37&&index.counts.methodQueries===30&&index.counts.availableBodies===28&&index.counts.unavailableBodies===2,'第四轮索引方法计数');
  check(index.auxiliary.length===18&&index.derived.length===2&&index.counts.auxiliary===18&&index.counts.derived===2,'第四轮辅助和派生计数');
  check(index.counts.newRuntimeObservations===0&&index.counts.reusedRawRuntimeObservations===0,'第四轮运行边界');
  check(index.excludedLocalArtifacts.length===33&&index.counts.excludedLocalArtifacts===33,'第四轮排除记录计数');
  for(const r of index.records){
    const file=path.join(round4Root,r.file),ev=read(file);
    check(digest(fs.readFileSync(file))===r.publicSha256,'第四轮证据摘要：'+r.id);
    check(ev.evidence_id===r.evidenceId&&ev.subject.digest.sha256===index.apkSha256&&r.artifactSha256===index.apkSha256,'第四轮证据身份：'+r.id);
    check(/^[a-f0-9]{64}$/.test(r.originalSha256)&&ev._public_export?.originalFileSha256===r.originalSha256,'第四轮原件摘要：'+r.id);
    if(r.sourceFile){
      const source=fs.readFileSync(path.join(round4Root,r.sourceFile));
      const normalized=ev.normalized_result.source.text.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,i=>i.replace(/\t/g,'    '));
      check(digest(source)===r.sourceSha256&&source.toString('utf8')===normalized,'第四轮方法文本：'+r.id);
      check(r.bodyStatus===ev.normalized_result.body_status&&r.sourceStatus===ev.normalized_result.source.status,'第四轮方法来源状态：'+r.id);
    }
  }
  for(const r of index.auxiliary){
    const file=path.join(round4Root,r.file),a=read(file);
    check(digest(fs.readFileSync(file))===r.publicSha256&&/^[a-f0-9]{64}$/.test(r.originalSha256),'第四轮辅助摘要：'+r.id);
    check(r.isReaEvidence===false&&r.runtimeObserved===false&&r.apkSha256===index.apkSha256&&a.apkSha256===index.apkSha256&&a.runtimeObserved===false,'第四轮辅助来源：'+r.id);
  }
  const ids=new Set(index.records.map(r=>r.id.slice(0,4)));
  for(const r of index.derived){
    const file=path.join(round4Root,r.file),data=read(file);
    check(digest(fs.readFileSync(file))===r.publicSha256&&/^[a-f0-9]{64}$/.test(r.originalSha256),'第四轮派生摘要：'+r.file);
    check(data.appVersion===index.appVersion&&data.apkSha256===index.apkSha256&&data.runtimeObserved===false&&data.newRuntimeObservations===0,'第四轮派生边界：'+r.file);
    check(data.evidenceRefs.every(id=>ids.has(id)),'第四轮派生证据引用：'+r.file);
    for(const source of data.sources){
      const a=index.auxiliary.find(a=>a.file===source.file);
      check(a&&a.publicSha256===source.publicSha256&&a.originalSha256===source.originalSha256,'第四轮派生来源：'+source.file);
    }
  }
  const text=read(path.join(round4Root,'comment-text-rules.json'));
  check(text.width.cachedBranch.primaryDeductionDp===110.5&&text.width.cachedBranch.replyDeductionDp===135.5&&text.width.cachedBranch.notEquivalentToMinimumClamp===true&&text.width.runtimeBranchConfirmed===false,'第四轮正文宽度条件');
  check(JSON.stringify(text.width.examples.map(e=>[e.primaryMeasurementWidthPx,e.replyMeasurementWidthPx]))===JSON.stringify([[777,708],[17,100]]),'第四轮宽度算例');
  check(text.longComment.thresholdCharacters===null&&text.longComment.thresholdLines===null&&text.longComment.expandStateRestoration==='unresolved'&&text.longComment.runtimeLongCommentScenarioPerformed===false,'第四轮长评论未知边界');
  const refs=read(path.join(round4Root,'auxiliary/LR302-text-and-expand-references.json'));
  const consumers=refs.matches.filter(m=>m.references.some(r=>r.resourceReference||r.literalResourceId));
  check(consumers.length===1&&consumers[0].class==='Lcom/xingin/matrix/detail/item/video/content/VideoNoteContentView;','第四轮展开全文资源归属');
  const pic=read(path.join(round4Root,'comment-picture-rules.json'));
  check(pic.onlyFirstPicture.configKey==='andr_cmt_pad_multi_opt_switch'&&pic.onlyFirstPicture.callDefault===1&&pic.onlyFirstPicture.currentValueKnown===false,'第四轮首图配置');
  check(pic.multiPictureWidth.source==='WindowManager.getDefaultDisplay().getRealSize(Point).x'&&pic.multiPictureWidth.configurationChangeRefreshObserved===false,'第四轮图片宽度与刷新边界');
  check(pic.image.layoutDefault.cornerRadiusDp===6&&pic.badge.background.cornerRadiusDp===16&&pic.badge.background.fillArgb==='#80303034'&&pic.badge.layoutDefault.textSizeSp===10,'第四轮图片与角标样式');
  check(pic.badge.layoutDefault.marginEndDp===6&&pic.badge.layoutDefault.marginBottomDp===6&&pic.badge.layoutDefault.marginRightDp===undefined,'第四轮角标逻辑末端外距');
  check(pic.image.renderRequests.scale==='CENTER_CROP'&&pic.image.renderRequests.defaultMask===72&&pic.image.actualCropPixelsObserved===false&&pic.image.actualCornerPixelsObserved===false,'第四轮裁切边界');
  check(pic.checks.layoutAttributePairsChecked===4&&pic.image.layoutChecks.length===4,'第四轮图片布局对照数量');
  const rawLayouts=read(path.join(round4Root,'auxiliary/PR303-picture-layout-attributes.json'));
  for(const layout of pic.image.layoutChecks){
    const raw=rawLayouts.matches.find(m=>m.entry===layout.entry),view=raw?.nodes.find(n=>n.element==='com.facebook.drawee.view.SimpleDraweeView');
    check(raw?.entrySha256===layout.entrySha256&&view?.attributes.some(a=>a.resourceId==='0x7f04008e'&&a.data===6)&&view?.attributes.some(a=>a.resourceId==='0x7f0405cb'&&a.dataHex==='0x7f0702e6'),'第四轮图片属性原件：'+layout.entry);
  }
  const dim=read(path.join(round4Root,'auxiliary/PR306-picture-style-resources.json'));
  check(dim.matches.some(m=>m.id==='0x7f0702e6'&&m.value?.decoded==='6dp')&&dim.matches.some(m=>m.id==='0x7f07029c'&&m.value?.decoded==='16dp'),'第四轮两类圆角资源');
  check(pic.badge.text.some(t=>t.value==='共%d张')&&pic.badge.xmlPlaceholderIsNotMaximum===true,'第四轮数量文字边界');
  for(const e of index.excludedLocalArtifacts)check(/^[a-f0-9]{64}$/.test(e.originalSha256)&&!index.records.some(r=>r.id===e.id),'第四轮排除项：'+e.id);
  round4Summary={selectedStaticEvidence:37,auxiliary:18,derived:2,excludedLocalArtifacts:33,newRuntimeObservations:0};
}
const round5Root=path.join(root,'docs/模拟器补测/第五轮');
let round5Summary=null;
if(fs.existsSync(round5Root)){
  const index=read(path.join(round5Root,'evidence-index.json'));
  const data=read(path.join(round5Root,'observations.json'));
  const pixel=read(path.join(round5Root,'pixel-fit.json'));
  check(data.counts.captured===52&&data.counts.selected===35&&data.counts.localOnly===17,'第五轮采集与选择计数');
  check(data.observations.length===35&&data.excludedObservations.length===17&&data.observationCount===35,'第五轮派生观察计数');
  check(index.sourceManifest.length===52&&index.rawArtifactCount===207,'第五轮本地原件清单');
  const selected=new Map(data.observations.map(o=>[o.id,o]));
  check(selected.size===35&&!selected.has('E037')&&selected.has('E088'),'第五轮选择编号或个人页排除');
  check(new Set([...selected.keys(),...data.excludedObservations.map(o=>o.id)]).size===52,'第五轮编号重复或遗漏');
  for(const entry of index.files){
    check(digest(fs.readFileSync(path.join(round5Root,entry.file)))===entry.publicSha256,'第五轮派生文件摘要：'+entry.file);
  }
  for(const o of [...data.observations,...data.excludedObservations]){
    const original=index.sourceManifest.find(r=>r.id===o.id);
    check(original&&JSON.stringify(original.sourceHashes)===JSON.stringify(o.sourceHashes),'第五轮原件摘要映射：'+o.id);
    check(['observation','screenshot','hierarchy'].every(k=>/^[a-f0-9]{64}$/.test(o.sourceHashes[k])),'第五轮原件摘要格式：'+o.id);
  }
  for(const o of data.observations){
    check(o.kind==='emulator_observation'&&o.appVersion==='8.72.0'&&o.versionCode==='8720916','第五轮版本或证据类型：'+o.id);
    check(o.environment.densityDpi===280&&o.environment.fontScale===1&&o.environment.height===1920&&[720,1080].includes(o.environment.width),'第五轮单变量环境：'+o.id);
    check(o.environment.sameObservedPidAsBaseline===true&&o.environment.appFontSetting===null,'第五轮进程和字号边界：'+o.id);
    check(Date.parse(o.capturedAt)<=Date.parse(o.completedAt),'第五轮时间顺序：'+o.id);
  }
  const final=selected.get('E088');
  check(data.settingsRestored&&data.finalObservation==='E088'&&final?.page==='home'&&final.environment.width===1080,'第五轮设置恢复与最终页');
  check(data.processDeathTested===false&&data.allRecordedPidsSame===true&&data.counts.newRecordings===0&&data.counts.newStaticAnalyses===0,'第五轮测试范围');
  check(data.environmentEvidence.length===4&&data.environmentEvidence.every(e=>e.projectionOnly&&/^[a-f0-9]{64}$/.test(e.originalSha256)&&e.evidenceId.startsWith('ev_')),'第五轮环境投影');
  check(data.textMeasurements.length===10,'第五轮完整文字节点数');
  const measurements=new Map(data.textMeasurements.map(m=>[m.observation,m]));
  const expected={E045:[886,214,4],E046:[886,296,6],E049:[886,296,6],E051:[886,296,6],E052:[526,460,10],E055:[526,337,7],E073:[886,214,4],E082:[886,214,4],E083:[886,255,5],E084:[886,214,4]};
  for(const [id,values] of Object.entries(expected)){
    const m=measurements.get(id);
    check(m&&JSON.stringify([m.node.width,m.node.height,m.bodyLines])===JSON.stringify(values)&&m.isClipped===false&&m.metadataLines===1,'第五轮文字测量：'+id);
  }
  check(['E060','E061','E063'].every(id=>selected.get(id)?.purpose==='anomaly'),'第五轮异常没有冒充通过');
  check(data.textEqualityChecks.some(x=>x.a==='E045'&&x.b==='E055'&&x.sameNodeText),'第五轮折叠文字相等证据');
  check(data.pictureMeasurements.every(p=>p.totalImagesKnown===false&&p.observedSlots===1&&p.badgeObserved===false),'第五轮图片数量边界');
  check(pixel.kind==='screenshot_pixel_fit'&&pixel.appVersion==='8.72.0','第五轮像素拟合类别');
  for(const id of ['E073','E074'])check(pixel.sourceHashes[id]===selected.get(id)?.sourceHashes.screenshot,'第五轮拟合源截图：'+id);
  check(pixel.landscape.bestCropMeanAbsoluteRgbError<pixel.landscape.fullImageRescaleMeanAbsoluteRgbError&&pixel.corner.static6dpCandidatePx===10.5,'第五轮拟合比较和静态单位');
  check(/^[a-f0-9]{64}$/.test(index.localPixelAnalysisSha256)&&index.pixelPublicNormalization==='CRLF to LF only; numeric spelling preserved','第五轮像素原件摘要与公开换行规范');
  round5Summary={captured:52,selected:35,localOnly:17,reaEnvironmentEvidence:4,rawArtifacts:207,settingsRestored:true};
}
const round6Root=path.join(root,'docs/模拟器补测/第六轮');
let round6Summary=null;
if(fs.existsSync(round6Root)){
  const index=read(path.join(round6Root,'evidence-index.json'));
  const data=read(path.join(round6Root,'observations.json'));
  const video=read(path.join(round6Root,'video-analysis.json'));
  check(data.appVersion==='8.72.0'&&data.versionCode==='8720916','第六轮基线版本');
  check(data.counts.captured===51&&data.counts.selected===39&&data.counts.localOnly===12,'第六轮采集/精选计数');
  check(data.observations.length===39&&data.excludedObservations.length===12,'第六轮观察数组计数');
  const selected=new Map(data.observations.map(o=>[o.id,o]));
  const all=[...data.observations,...data.excludedObservations];
  check(new Set(all.map(o=>o.id)).size===51&&selected.size===39,'第六轮编号唯一');
  check(index.sourceManifest.length===51&&index.rawObservationArtifactCount===218,'第六轮原件清单计数');
  for(const f of index.files)check(digest(fs.readFileSync(path.join(round6Root,f.file)))===f.publicSha256,'第六轮派生摘要：'+f.file);
  for(const o of all){
    const source=index.sourceManifest.find(r=>r.id===o.id);
    check(source&&JSON.stringify(source.sourceHashes)===JSON.stringify(o.sourceHashes),'第六轮原件映射：'+o.id);
    check(Object.values(o.sourceHashes).every(s=>/^[a-f0-9]{64}$/.test(s)),'第六轮原件摘要格式：'+o.id);
  }
  check(index.sourceManifest.reduce((n,r)=>n+Object.keys(r.sourceHashes).length,0)===218,'第六轮原件计数复算');
  for(const o of data.observations){
    check(o.kind==='emulator_observation'&&o.appVersion==='8.72.0'&&o.versionCode==='8720916','第六轮证据类型/版本：'+o.id);
    check([720,1080].includes(o.environment.width)&&o.environment.height===1920&&o.environment.densityDpi===280&&o.environment.fontScale===1,'第六轮环境：'+o.id);
    check(o.environment.sameObservedPidAsBaseline===true&&o.environment.appFontSetting===null,'第六轮进程/应用字号边界：'+o.id);
    check(Date.parse(o.capturedAt)<=Date.parse(o.completedAt),'第六轮采集时序：'+o.id);
  }
  check(data.settingsRestored&&data.finalObservation==='E139'&&selected.get('E139')?.page==='home'&&selected.get('E139')?.environment.width===1080,'第六轮恢复状态');
  check(data.processDeathTested===false&&data.allRecordedPidsSame===true&&data.counts.newStaticAnalyses===0,'第六轮生命周期/静态边界');
  check(data.environmentEvidence.length===4&&data.environmentEvidence.every(e=>e.projectionOnly&&e.evidenceId.startsWith('ev_')&&/^[a-f0-9]{64}$/.test(e.originalSha256)),'第六轮REA环境投影');
  check(index.excludedToolFailures.length===4&&index.excludedToolFailures.every(e=>/^[a-f0-9]{64}$/.test(e.originalSha256)),'第六轮初次工具失败排除');
  check(data.panelTrials.length===5&&data.panelTrials.every(t=>t.insideReportedButtonBounds&&t.panelPresentInFinalHierarchy),'第六轮面板对照');
  check(data.panelTrials.filter(t=>t.recorded).length===4,'第六轮面板进入录像计数');
  const expected={E101:[526,337,7,0,1],E102:[526,460,10,0,1],E103:[526,337,7,0,1],E112:[886,214,4,0,1],E120:[886,724,15,3,0],E122:[886,724,15,3,0],E123:[886,164,3,1,0],E125:[886,724,15,3,0]};
  check(data.textMeasurements.length===8,'第六轮完整文本测量计数');
  for(const [id,values] of Object.entries(expected)){
    const m=data.textMeasurements.find(m=>m.observation===id);
    check(m&&JSON.stringify([m.node.width,m.node.height,m.bodyNonemptyLines,m.bodyBlankLines,m.metadataLinesInNode])===JSON.stringify(values)&&m.isClipped===false,'第六轮文字几何：'+id);
  }
  for(const c of data.hierarchyEqualityChecks)check(c.sameFullHierarchyDigest&&selected.get(c.a)?.sourceHashes.hierarchy===selected.get(c.b)?.sourceHashes.hierarchy,'第六轮层级复归：'+c.a+'/'+c.b);
  check(data.longCommentState.L3.reopenedState==='expanded'&&data.longCommentState.L3.causalMarkerKnown===false,'第六轮置顶样本状态与因果边界');
  const mp=data.multiPicture;
  check(mp.viewerChecks.map(v=>v.displayedCounter).join(',')==='1/8,2/8,3/8'&&mp.viewerChecks.every(v=>v.totalShownByViewer===8&&!v.sourceArrayInspected),'第六轮多图查看器计数');
  check(mp.layoutIsAnomalous&&mp.pristineProcessBaseline===false&&mp.thumbnailWidthsSuitableAsNormalImplementationDefaults===false&&mp.actualViewClassAndCacheCauseKnown===false,'第六轮异常没有冒充正常参数');
  check(mp.thumbnailCountBadgeObserved===false&&mp.badgeAbsenceProven===false,'第六轮角标未知边界');
  const narrow=mp.measurements.find(m=>m.observation==='E134');
  check(narrow?.reportedImageNodes.length===3&&narrow.reportedImageNodes.filter(n=>n.validReportedRectangle).length===1,'第六轮窄屏报告节点数');
  check(narrow.reportedImageNodes.slice(1).every(n=>n.left===637&&n.right===626&&n.width===-11&&!n.validReportedRectangle),'第六轮无效边界必须原样标记');
  check(JSON.stringify(mp.measurements[0].reportedImageNodes)===JSON.stringify(mp.measurements[2].reportedImageNodes),'第六轮恢复异常几何');
  check(video.recordings.length===7&&video.full_decode_total_frames===1914&&data.counts.newRecordings===7&&data.counts.decodedVideoFrames===1914,'第六轮录像/解码帧计数');
  check(video.recordings.reduce((n,r)=>n+r.decoded_frame_count,0)===1914,'第六轮完整帧计数复算');
  for(const r of video.recordings){
    const o=selected.get(r.id.slice(0,4));
    check(r.decoded_frame_count===r.probe_frame_count&&r.decoder_exit_code===0&&r.pts_strictly_increasing,'第六轮完整解码：'+r.id);
    check(r.sources.find(s=>s.file==='motion.mp4')?.sha256===o?.sourceHashes.movie,'第六轮录像来源：'+r.id);
  }
  check(video._public_export.originalSha256===index.localVideoAnalysisSha256&&video._public_export.rawImageryIncluded===false,'第六轮视频派生关系');
  round6Summary={captured:51,selected:39,localOnly:12,rawObservationArtifacts:218,reaEnvironmentEvidence:4,recordings:7,decodedFrames:1914,multiPictureSamples:1,settingsRestored:true};
}
const round7Root=path.join(root,'docs/模拟器补测/第七轮');
let round7Summary=null;
if(fs.existsSync(round7Root)){
  const index=read(path.join(round7Root,'evidence-index.json'));
  const data=read(path.join(round7Root,'observations.json'));
  const video=read(path.join(round7Root,'video-analysis.json'));
  const visual=read(path.join(round7Root,'visual-analysis.json'));
  const selected=new Map(data.observations.map(o=>[o.id,o]));
  const all=[...data.observations,...data.excludedObservations];
  check(data.appVersion==='8.72.0'&&data.versionCode==='8720916','第七轮版本基线');
  check(data.counts.captured===35&&data.counts.selected===34&&data.counts.excluded===1,'第七轮观察计数');
  check(selected.size===34&&all.length===35&&new Set(all.map(o=>o.id)).size===35,'第七轮观察唯一性');
  check(data.excludedObservations[0]?.id==='E144'&&!selected.has('E144'),'第七轮联系人菜单排除');
  check(index.rawObservationArtifactCount===200&&index.sourceManifest.length===35,'第七轮原件清单');
  check(index.sourceManifest.reduce((n,r)=>n+Object.keys(r.sourceHashes).length,0)===200,'第七轮原件数量复算');
  for(const f of index.files){
    const file=path.join(round7Root,f.file);
    check(fs.existsSync(file)&&digest(fs.readFileSync(file))===f.publicSha256,'第七轮派生摘要：'+f.file);
    check(!fs.readFileSync(file,'utf8').includes('\uFFFD'),'第七轮文本编码：'+f.file);
  }
  for(const o of all){
    const source=index.sourceManifest.find(r=>r.id===o.id);
    check(source&&JSON.stringify(source.sourceHashes)===JSON.stringify(o.sourceHashes),'第七轮来源映射：'+o.id);
    check(Object.values(o.sourceHashes).every(h=>/^[a-f0-9]{64}$/.test(h)),'第七轮摘要格式：'+o.id);
  }
  for(const o of selected.values()){
    check(o.kind==='emulator_observation'&&o.appVersion==='8.72.0'&&o.versionCode==='8720916','第七轮身份：'+o.id);
    check(o.environment.width===1080&&o.environment.height===1920&&o.environment.densityDpi===280&&o.environment.fontScale===1&&o.environment.sameObservedPidAsBaseline,'第七轮恒定环境：'+o.id);
    check(Date.parse(o.capturedAt)<=Date.parse(o.completedAt),'第七轮时序：'+o.id);
  }
  check(data.settingsChanged===false&&data.settingsRestored&&data.finalObservation==='E174'&&selected.get('E174')?.page==='home','第七轮结束状态');
  check(!data.processDeathTested&&data.allRecordedPidsSame&&data.counts.newStaticAnalyses===0,'第七轮未测边界');
  check(data.environmentEvidence.length===4&&data.environmentEvidence.every(e=>e.projectionOnly&&e.evidenceId.startsWith('ev_')&&/^[a-f0-9]{64}$/.test(e.originalSha256)),'第七轮REA环境投影');
  for(const pair of data.hierarchyEqualityChecks)check(selected.get(pair.a)?.sourceHashes.hierarchy===selected.get(pair.b)?.sourceHashes.hierarchy,'第七轮终态对照：'+pair.a+'/'+pair.b);
  const pages={E141:1,E142:2,E143:2,E146:2,E147:1,E148:1,E149:1,E155:1};
  for(const [id,page] of Object.entries(pages))check(selected.get(id)?.imagePage?.index===page&&selected.get(id)?.imagePage?.total===2,'第七轮图集页序：'+id);
  check(data.feedReturn.deltaPx[1]===-639&&data.feedReturn.alignedCardExactPixelFraction===1&&data.feedReturn.directReentryControl.cardDisplacementFromE154Px[1]===0,'第七轮返回位移与反例');
  const measure=(id,role)=>data.nodeMeasures.find(m=>m.id===id&&m.role===role);
  check(['E170','E171','E172'].map(id=>measure(id,'same-first-comment-body')?.top).join(',')==='1159,879,949','第七轮内容滚动几何');
  check(data.panelHandoff.lastSelectedContentOnlyFrame.avatarY===1119&&data.panelHandoff.firstSelectedPanelMovementFrame.titleY===667&&!data.panelHandoff.internalGestureDispatchProven,'第七轮手势交接边界');
  check(data.counts.recordingsCaptured===30&&video.recordings.length===29&&video.totalDecodedFrames===893,'第七轮录屏计数');
  check(new Set(video.recordings.map(v=>v.id)).size===29&&video.recordings.reduce((n,v)=>n+v.decodedFrames,0)===893,'第七轮解码帧复算');
  check(!video.recordings.some(v=>v.id==='E144')&&!video.traces.E144&&!video.rawImageryIncluded,'第七轮录屏隐私边界');
  for(const v of video.recordings){
    check(v.decodedFrames===v.probeFrames&&v.decoderExitCode===0&&v.ptsStrictlyIncreasing,'第七轮完整解码：'+v.id);
    check(v.movieSha256===selected.get(v.id)?.sourceHashes.movie,'第七轮视频原件：'+v.id);
    const rows=video.traces[v.id]?.frames;
    check(rows?.length===v.decodedFrames,'第七轮逐帧数量：'+v.id);
    const times=rows?.map(r=>r.pts_s??r.pts);
    check(times?.every((t,i)=>Number.isFinite(t)&&(i===0||t>times[i-1])),'第七轮PTS复算：'+v.id);
  }
  check(video.recordings.find(v=>v.id==='E146')?.decodedFrames===2&&video.recordings.find(v=>v.id==='E162')?.decodedFrames===2,'第七轮稀疏采样明确保留');
  check(video.independentAudit.galleryIds.length===5&&video.independentAudit.panelIds.length===13&&video.independentAudit.remainingAuditedByPrimary.length===11,'第七轮复核分工');
  check(visual._public_export.rawImageryIncluded===false&&visual.upper_media_scale_fit.accepted===false,'第七轮缩放拟合拒绝');
  check(visual.upper_media_visible_edges.every(r=>r.left===324&&r.right_exclusive===756&&r.width===432),'第七轮视频可见宽度');
  check(Math.abs(visual.composer_dim_fit.candidate_black_overlay_alpha-0.20)<0.001&&visual.composer_dim_fit.mean_abs_error<0.3,'第七轮遮罩拟合');
  check(visual.panel_corner_fit.circle_fit_top5_radius_error_px[0][0]===20.75,'第七轮圆角候选');
  round7Summary={captured:35,selected:34,excluded:1,rawObservationArtifacts:200,reaEnvironmentEvidence:4,recordingsCaptured:30,recordingsAnalyzed:29,decodedFrames:893,settingsUnchanged:true};
}
const round8Root=path.join(root,'docs/模拟器补测/第八轮');
let round8Summary=null;
if(fs.existsSync(round8Root)){
  const index=read(path.join(round8Root,'evidence-index.json'));
  const data=read(path.join(round8Root,'observations.json'));
  const video=read(path.join(round8Root,'video-analysis.json'));
  const returned=read(path.join(round8Root,'return-analysis.json'));
  const selected=new Map(data.observations.map(o=>[o.id,o]));
  const all=[...data.observations,...data.localOnlyObservations];
  check(data.appVersion==='8.72.0'&&data.versionCode==='8720916','第八轮版本');
  check(data.counts.captured===38&&data.counts.selected===35&&data.counts.localOnly===3,'第八轮观察计数');
  check(selected.size===35&&all.length===38&&new Set(all.map(o=>o.id)).size===38,'第八轮观察唯一性');
  check(data.localOnlyObservations.map(o=>o.id).join(',')==='E202,E203,E204','第八轮导航排除范围');
  check(index.rawObservationArtifactCount===198&&index.sourceManifest.length===38,'第八轮来源清单');
  check(index.sourceManifest.reduce((n,r)=>n+Object.keys(r.sourceHashes).length,0)===198,'第八轮原件计数复算');
  for(const f of index.files){
    const file=path.join(round8Root,f.file);
    check(fs.existsSync(file)&&digest(fs.readFileSync(file))===f.publicSha256,'第八轮派生摘要：'+f.file);
    check(!fs.readFileSync(file,'utf8').includes('\uFFFD'),'第八轮编码：'+f.file);
  }
  for(const o of all){
    const s=index.sourceManifest.find(r=>r.id===o.id);
    check(s&&JSON.stringify(s.sourceHashes)===JSON.stringify(o.sourceHashes),'第八轮来源映射：'+o.id);
    check(Object.values(o.sourceHashes).every(h=>/^[a-f0-9]{64}$/.test(h)),'第八轮来源摘要格式：'+o.id);
  }
  for(const o of selected.values()){
    check(o.appVersion==='8.72.0'&&o.versionCode==='8720916'&&o.kind==='emulator_observation','第八轮观察身份：'+o.id);
    check(o.environment.width===1080&&o.environment.height===1920&&o.environment.densityDpi===280&&o.environment.fontScale===1&&o.environment.sameObservedPidAsBaseline,'第八轮恒定环境：'+o.id);
    check(Date.parse(o.capturedAt)<=Date.parse(o.completedAt),'第八轮观察时序：'+o.id);
  }
  check(!data.settingsChanged&&!data.processDeathTested&&data.allRecordedPidsSame&&data.finalObservation==='E212'&&selected.get('E212')?.page==='home','第八轮最终状态与未测边界');
  check(data.environmentEvidence.length===4&&data.environmentEvidence.every(e=>e.projectionOnly&&e.evidenceId.startsWith('ev_')&&/^[a-f0-9]{64}$/.test(e.originalSha256)),'第八轮REA投影');
  for(const group of data.equalityGroups)for(const id of group)check(selected.get(id)?.sourceHashes.hierarchy===selected.get(group[0])?.sourceHashes.hierarchy,'第八轮层级对照：'+id);
  check(selected.get('E185')?.sourceHashes.hierarchy!==selected.get('E188')?.sourceHashes.hierarchy&&data.entryBadgeDifference.beforeNodes===57&&data.entryBadgeDifference.afterNodes===56,'第八轮页码角标状态差异');
  check(data.returnControls.map(c=>c.cardTopDisplacementPx).join(',')==='0,0,-639,-639,-639,-639','第八轮返回位移控制');
  check(data.returnControls.every(c=>!c.matchedDwellTimeAcrossGroups&&c.durationIsNotAnAnimationOrTouchMeasurement),'第八轮时间混杂边界');
  check(JSON.stringify(returned.controls)===JSON.stringify(data.returnControls),'第八轮返回表一致');
  check(data.endpointComparisons.length===6&&data.endpointComparisons.every(c=>c.wholeScreenshotExactlyEqual&&c.fullXmlExactlyEqual&&c.excludingTop40PxMae===0),'第八轮六组终态复算');
  check(video.recordings.length===20&&video.totalDecodedFrames===615&&new Set(video.recordings.map(v=>v.id)).size===20,'第八轮录像计数');
  check(video.recordings.reduce((n,v)=>n+v.decodedFrames,0)===615&&!video.rawImageryIncluded&&!returned.rawImageryIncluded,'第八轮解码总数与隐私范围');
  for(const v of video.recordings){
    check(v.decodedFrames===v.probeFrames&&v.decoderExitCode===0&&v.ptsStrictlyIncreasing,'第八轮完整解码：'+v.id);
    check(v.movieSha256===selected.get(v.id)?.sourceHashes.movie,'第八轮录像原件：'+v.id);
    const rows=video.traces[v.id]?.frames;
    check(rows?.length===v.decodedFrames&&rows.every((r,i)=>Number.isFinite(r.pts)&&(i===0||r.pts>rows[i-1].pts)),'第八轮帧序与PTS：'+v.id);
  }
  check(video.independentAudit.returnIds.length===11&&video.independentAudit.galleryIds.length===3&&video.independentAudit.panelIds.length===5&&video.independentAudit.remainingByPrimary.join(',')==='E201','第八轮独立复核范围');
  for(const [id,min] of [['E198',404],['E199',396],['E200',0]]){
    const fits=video.traces[id].frames.map(r=>r.page2_translation_fit).filter(r=>r.accepted);
    check(Math.min(...fits.map(r=>r.candidate_offset_x_px))===min,'第八轮图集反向：'+id);
  }
  check(video.traces.E200.frames[27].page2_image_mae<=8,'第八轮整页对齐采样');
  const reversal=video.traces.E210.frames.slice(8,11);
  check(reversal.map(r=>r.title.matched_y_px).join(',')==='650,1221,1375'&&reversal.map(r=>r.video_band_nonblack_envelope.width).join(',')==='596,523,708','第八轮分层反向');
  check(!video.traces.E209.frames.some(r=>r.title.matched_y_px===650),'第八轮不同中断阶段');
  round8Summary={captured:38,selected:35,localOnly:3,rawObservationArtifacts:198,reaEnvironmentEvidence:4,recordings:20,decodedFrames:615,independentlyAuditedRecordings:19,settingsUnchanged:true};
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
console.log(JSON.stringify({status:problems.length?'FAIL':'PASS',files:files.length+Number(fs.existsSync(manifestFile)),importedResearchFiles:provenance.records.length,jsonFiles,localLinks:links,layoutMetrics:layout.metrics.length,coreEvidence:core.records.length,round2:round2Summary,round3:round3Summary,round4:round4Summary,round5:round5Summary,round6:round6Summary,round7:round7Summary,round8:round8Summary,issues:problems},null,2));
if(problems.length)process.exitCode=1;
