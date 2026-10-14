# GitHub 资料筛选：保留可定位线索，舍弃仿写参数

核验日期：2026-10-14。目的仅为补充手机端非购物功能的研究数据，本轮不开展软件开发或技术栈选型。

## 筛选结论

重点核验 8 个候选仓库的目录、说明及相关文件，**没有找到可以直接补进本库的小红书手机端排版、字体、动效时长或跨机型适配实测参数**。其中 7 个不纳入研究来源；1 份第三方逆向报告只保留 2 条待核实的代码定位线索。没有导入候选项目源码、图片或演示数据，没有运行其项目，也没有增加小红书已验证行为或完整用例数量。

这只是本轮候选的筛选结果，不代表 GitHub 上不存在其他有用资料。检索包括小红书仿制、Android/Compose、reverse engineering，以及“小红书＋布局/动效/适配”；排除内容运营、海报生成和采集工具的关键词误命中。下表按具体文件判断，不以星数、仓库名字或“高仿”自述作为证据。

## 8 个候选的取舍

“舍弃”指不作为本研究的数据来源，不评价项目的一般开发价值，也没有删除任何既有研究文件。

| 项目与固定版本 | 实际核对内容 | 对当前研究的决定 |
| --- | --- | --- |
| [RedBookComposeDemo · 12ce269](https://github.com/Loren-Moon/RedBookComposeDemo/tree/12ce2696b20ad72741bb77e30b90f28b5b72013d) | [分页数据源](https://github.com/Loren-Moon/RedBookComposeDemo/blob/12ce2696b20ad72741bb77e30b90f28b5b72013d/core/data/src/main/java/com/loren/redbook/data/source/CommonPagingSource.kt#L37)使用随机 ID、随机互动数和模拟延迟；[首页](https://github.com/Loren-Moon/RedBookComposeDemo/blob/12ce2696b20ad72741bb77e30b90f28b5b72013d/feature/home/src/main/java/com/loren/redbook/home/HomeMain.kt#L201)自定双列和 4dp 间距，并有占位栏目；[详情](https://github.com/Loren-Moon/RedBookComposeDemo/blob/12ce2696b20ad72741bb77e30b90f28b5b72013d/feature/home/src/main/java/com/loren/redbook/home/HomeDetail.kt#L41)为简化内容及共享元素示例。 | **舍弃。** 这些数值属于仿写工程，不能补作原 App 的分页、布局或转场数据。撤回将其推荐为本研究后续基础的建议。 |
| [XiaoShiLiu · 2a499ff](https://github.com/ZTMYO/XiaoShiLiu/tree/2a499ffe55ffa5a40bb102c14681fa96199300df) | [瀑布流组件](https://github.com/ZTMYO/XiaoShiLiu/blob/2a499ffe55ffa5a40bb102c14681fa96199300df/vue3-project/src/components/WaterfallFlow.vue#L106)按浏览器宽度配置 2–5 列；[帖子接口](https://github.com/ZTMYO/XiaoShiLiu/blob/2a499ffe55ffa5a40bb102c14681fa96199300df/express-project/routes/posts.js#L145)采用自行编写的热度/新鲜度评分和前 20% 过滤。也检查了评论、搜索及导航相关文件。 | **舍弃。** 自有网页布局、接口模型与推荐规则不能回答原 Android App 如何排版或推荐。 |
| [fast-transition · bc6ff14](https://github.com/Arcns/fast-transition/tree/bc6ff143f15d418eb7fac34dff9886b1e3bea920) | [说明](https://github.com/Arcns/fast-transition/blob/bc6ff143f15d418eb7fac34dff9886b1e3bea920/README.md#L7)定位为类似小红书/Lemon8 的共享元素工具；[示例配置](https://github.com/Arcns/fast-transition/blob/bc6ff143f15d418eb7fac34dff9886b1e3bea920/README.md#L94)有库自身的 150ms 默认时长。核对了配置文件和示例目录。 | **舍弃。** 不能用工具库默认值覆盖我们已经记录的整页进退样本，也不能据此确认目标版本采用共享元素。 |
| [Springboot-vue-xiaohongshu · 4f562ae](https://github.com/xiaozhao-66/Springboot-vue-xiaohongshu/tree/4f562ae0cec5894aa577ec7b07f3955fdb14c177) | 目录包含 uni-app、独立后端和第三方组件；[说明](https://github.com/xiaozhao-66/Springboot-vue-xiaohongshu/blob/4f562ae0cec5894aa577ec7b07f3955fdb14c177/README.md#L26)列出自有架构与待重做模块，推荐模型另有未上传依赖。 | **舍弃。** 在已查范围内没有目标 App 版本、原始测量或方法映射，不能补当前研究缺口。 |
| [vue-redbk · cb4e206](https://github.com/wenqiii/vue-redbk/tree/cb4e206cf26d4548e19da34a82bf97f005f00cbd) | [说明](https://github.com/wenqiii/vue-redbk/blob/cb4e206cf26d4548e19da34a82bf97f005f00cbd/README.md#L16)明确使用本地 mock 数据，[待实现项](https://github.com/wenqiii/vue-redbk/blob/cb4e206cf26d4548e19da34a82bf97f005f00cbd/README.md#L44)包含搜索和评论展示。 | **舍弃。** 无法作为当前手机端真实行为数据。 |
| [FlingBehavior · a036abd](https://github.com/gm365066360/FlingBehavior/tree/a036abd2f1bd881acbcc09351a9a73dcbcb5837c) | README 自述参考反编译结果；[实际类](https://github.com/gm365066360/FlingBehavior/blob/a036abd2f1bd881acbcc09351a9a73dcbcb5837c/app/src/main/java/com/gaom/flingbehaviordemo/FlingBehavior.java#L18)处理嵌套惯性滚动，并用首个子项位置是否大于 3 改写 consumed。核验提交日期为 2017-11-30。 | **舍弃。** 已查文件没有小红书样本版本、摘要和原方法对应关系；不能把该阈值登记为 8.72.0 或 9.49.1 的行为。 |
| [StickyLayout · d1ee9ef](https://github.com/jinhuizxc/StickyLayout/tree/d1ee9ef191f6001ddc4f38a3c487c37a15d17bd4) | [说明](https://github.com/jinhuizxc/StickyLayout/blob/d1ee9ef191f6001ddc4f38a3c487c37a15d17bd4/README.md)同样自述反编译参考；目录为布局演示工程，核验提交日期为 2018-10-14。 | **舍弃。** 当前说明及目录没有可复核样本身份，不能当作前一项目的独立佐证；本轮未进一步运行或逐类审计。 |
| [mobile-app-reverse-reports · 125fbf6](https://github.com/Reverse-Engineered-Android/mobile-app-reverse-reports/tree/125fbf679544cd292b5f45ae4d6793789e0a7552/apps/xiaohongshu) | 核对样本指纹、证据索引、本地存储和上传下载章节；包含可以继续查找的完整类名与字段。 | **仅保留下列 2 条外部线索。** 报告结论未由本项目独立复现，不计为已确认机制；其他主题不引入。 |

提交日期采用所审阅分支的提交记录，不能把 GitHub 的 `updated_at` 当成最近代码更新时间。以上均是定向文件审阅，不构成全库质量或安全审计。

## 唯一保留报告的来源边界

上游提交：`125fbf679544cd292b5f45ae4d6793789e0a7552`。上游声明代码样本为 **9.37.0**，base APK SHA-256 为 `0de5ed7daf838bf379d5c069b225910128109e8af132e63b13fc6765c0f7991c`，另使用 **9.47.0 / 9.48.0** 的存储快照作对照。来源：[样本说明](https://github.com/Reverse-Engineered-Android/mobile-app-reverse-reports/blob/125fbf679544cd292b5f45ae4d6793789e0a7552/apps/xiaohongshu/README.md#L3)、[指纹表](https://github.com/Reverse-Engineered-Android/mobile-app-reverse-reports/blob/125fbf679544cd292b5f45ae4d6793789e0a7552/apps/xiaohongshu/evidence.md#L3)。

本轮仅确认上游文件包含这些记录，**没有取得并核验它的 APK、设备或数据库**。它与本库 8.72.0 真机、8.84.5.5 早期静态、9.49.1 局部静态的基线不同，不能合并为同版结论。

### GH01：本地存储入口

- 外部定位：[storage.md 的 WCDB 章节](https://github.com/Reverse-Engineered-Android/mobile-app-reverse-reports/blob/125fbf679544cd292b5f45ae4d6793789e0a7552/apps/xiaohongshu/storage.md#L46)和[证据索引](https://github.com/Reverse-Engineered-Android/mobile-app-reverse-reports/blob/125fbf679544cd292b5f45ae4d6793789e0a7552/apps/xiaohongshu/evidence.md#L128)指向 `com.xingin.xhs.xhsstorage.safe.WCDBOpenHelperFactory`。
- 本地交叉检查：[已有类清单](../证据包/classes-all.txt)第 28546 行，以及 [8.72.0 的 K005 记录](../深度研究/机制/raw/K005-gallery-classes.json)中的类清单包含这个全名。K005 的 Evidence ID 为 `ev_e09b61573d0119caf72ab330126a740cbc9c2a890f4886f7be7052e72b6c45d9`，目标摘要为 `44b2c6ee8247d4f21ef58974bfe3f4f18318b5918ff01857b18d84827d2f05a5`。这只证明已有记录中存在名称，没有验证类体、调用者或运行时行为。
- 保留价值：后续研究进程重建、内容缓存和状态恢复时，有了一个具体的静态查询入口，可以核对哪些业务数据真正进入持久化层。
- 待核实：各版本的类体、业务数据库调用关系，以及它与列表锚点、草稿、搜索条件的实际关系。当前不能声称这些状态已持久化，也不沿用上游设备的表计数或加密配置。

### GH02：媒体上传配置

- 外部定位：[transfer.md 的 UploadConfig 章节](https://github.com/Reverse-Engineered-Android/mobile-app-reverse-reports/blob/125fbf679544cd292b5f45ae4d6793789e0a7552/apps/xiaohongshu/transfer.md#L5)指向 `com.xingin.compose.service.upload.UploadConfig`，列出 `contentType`、`filePaths`、`tokenConfig`、`openMultipart`、`retryCount`、`needCopyFile`、`keepImageExif`。
- 本地交叉检查：对现有公开 `.json` / `.txt` 证据检索，未命中该完整类名。这是对已有导出资料的有限搜索，**不是完整 APK 查询，也不证明当前包不存在同类实现**。
- 保留价值：后续研究图文创作及上传失败恢复时，可针对完整类名、字段及调用位置查证，减少盲目搜索。
- 待核实：目标版本是否存在该类、默认值、真正使用这些字段的分支、与草稿保存及提交状态的关系。字段叫 `retryCount` 不等于已经知道重试次数；`needCopyFile` 也不能证明复制何时发生。

两条均标记为“外部线索，待本库样本核实”。本轮没有提取账号私有数据、发起内容上传或调用小红书服务端接口。

## 研究数据不变的部分

本轮新增的是筛选记录和定位入口，未新增原 App 的排版尺寸、字体资源、动画参数或设备适配规则。现有 84 项排版指标、28 项参数/未知项、77 份深度机制证据及 31 部分 / 69 待测 / 0 全分支完成的历史覆盖统计均不变。

前述仿写项目不再作为当前研究的优先收集对象。继续收集时优先处理[适配静态追踪](../离线补全/02-设备适配静态追踪.md)和[实测缺口](../新版研究/06-实测覆盖与待补测.md)中明确的问题；外部资料须能提供具体新增证据或可定位入口，重复演示和无来源常量不入库。
