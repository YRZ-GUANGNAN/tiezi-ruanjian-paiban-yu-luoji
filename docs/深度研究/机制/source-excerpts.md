# 可引用的反编译节录

这些节录来自已打包客户端的静态分析，不代表真机已经执行该方法。行号指原始 `.java.txt` 文件，绝非原仓库行号。完整字段、限制、Evidence ID 与 SHA-256 见 `evidence-index.json`。

## K111-image-list-setup：图集复用与分页吸附

版本 8.72.0；Evidence `ev_026f2bb5fd8a4374df4fbea0e6a9e6da7ab3344f92afa1693ef8d97d77b885e8`；节录行 12–19。

```java
        recyclerViewB7.setHasFixedSize(true);
        recyclerViewB7.setNestedScrollingEnabled(false);
        PreOnBindViewLinearLayoutManager preOnBindViewLinearLayoutManager = new PreOnBindViewLinearLayoutManager(recyclerViewB7.getContext());
        preOnBindViewLinearLayoutManager.setOrientation(0);
        preOnBindViewLinearLayoutManager.m(100);
        recyclerViewB7.setLayoutManager(preOnBindViewLinearLayoutManager);
        recyclerViewB7.setItemViewCacheSize(3);
        new PagerSnapHelper().attachToRecyclerView(recyclerViewB7);
```

## K112-image-state-subscriptions：现有状态接续后续变更

版本 8.72.0；Evidence `ev_f15e0c29bfe2b87a8d7c93149e144cd08286f0137c9b604bc78066936d739f4a`；节录行 25–29。

```java
        Result<Object> result = eVarN.b().get(t96.z0.class);
        if (result == null || (rVarY0 = tb9.r.b1(Result.m1123boximpl(result.m1133unboximpl()))) == null) {
            rVarY0 = tb9.r.y0();
        }
        bVarT6.a(tb9.r.I(rVarY0, eVarN.a().B0(j.f108357d).d1(q.f108371d)).n1(wb9.a.a()).K1(new j0()));
```

## K114-image-fade-callback：页码淡出参数

版本 8.72.0；Evidence `ev_cd3bcbe3e677a1b6b1d83a353849b0bc2e28555c8a1c0bfbd860fec95721f086`；节录行 5–6。

```java
        ((TextView) noteDetailImageDisplayPresenter.w6().findViewById(l56.n.f224121t0)).animate().alpha(0.0f).setDuration(200L).setInterpolator(new AccelerateInterpolator()).withEndAction(new Runnable() { // from class: t96.m0
            @Override // java.lang.Runnable
```

## K130-indicator-show：页码淡入参数

版本 8.72.0；Evidence `ev_373cd865f2304ca5aa8de25b829583e53c479bf433cb8aa478d71cf0468f2760`；节录行 5–6。

```java
        ((TextView) w6().findViewById(l56.n.f224121t0)).animate().alpha(1.0f).setDuration(200L).setInterpolator(new AccelerateInterpolator()).withStartAction(new Runnable() { // from class: t96.l0
            @Override // java.lang.Runnable
```

## K138-indicator-delay：淡入完成后安排隐藏

版本 8.72.0；Evidence `ev_12cf1bc88c24b495e4b7a106bc94559e7650f8120b9cfce8a36d3c7efc4e3c5e`；节录行 5–5。

```java
        noteDetailImageDisplayPresenter.x7(5000L);
```

## K124-image-teardown：销毁时清理定时任务

版本 8.72.0；Evidence `ev_87b649e57cf0d81213eaa603a52cc0c088038bded3906b7231a3efe282892feb`；节录行 7–12。

```java
        F7().removeCallbacksAndMessages(null);
        this.f108317u.removeCallbacksAndMessages(null);
        Animation animation = ((TextView) w6().findViewById(l56.n.f224121t0)).getAnimation();
        if (animation != null) {
            animation.cancel();
        }
```

## K113-image-data-replace：图片索引恢复与高度更新

版本 8.72.0；Evidence `ev_bc8212b4e59d87310ca54386c84e2926a289bf0e7f0145a09ad5d6a2e0459ae8`；节录行 7–20。

```java
        if (i100 > 0) {
            this.f108314r = i100;
            this.f108318v = i100;
            recyclerViewB7.post(new Runnable() { // from class: t96.i0
                @Override // java.lang.Runnable
                public final void run() {
                    NoteDetailImageDisplayPresenter.r8(recyclerViewB7, i100);
                }
            });
        }
        recyclerViewB7.getLayoutParams().height = C7(detailNoteFeedHolder);
        recyclerViewB7.requestLayout();
        ((FrameLayout) w6().findViewById(l56.n.Z)).getLayoutParams().height = recyclerViewB7.getLayoutParams().height;
    }
```

## K121-image-height：参考尺寸与比例边界

版本 8.72.0；Evidence `ev_bce8ba4575099ffd985d71d9999d5ec87fb254b71b4c6e7c3797abc2b45e8c40`；节录行 6–11。

```java
        if (ro.m.f288793a.c()) {
            return -1;
        }
        Context context = B7().getContext();
        return u67.f.f316785a.a((so.c.f301389a.p() || Build.VERSION.SDK_INT <= 33) ? o1.h(context) : RangesKt___RangesKt.coerceAtMost(o1.f(context), o1.e(context)), detailNoteFeedHolder.b().q0(0), 0.75f, 2.0f);
    }
```

## K141-gallery-height-formula：高度计算公式

版本 8.72.0；Evidence `ev_98f5571821ccef387f09a89f1f80ec0c50aeda222236da15cadd7e506545d300`；节录行 7–12。

```java
            if (f100 < f101) {
                f103 = i100 / f101;
            } else {
                f103 = f100 > f102 ? i100 / f102 : i100 / f100;
            }
            return (int) f103;
```

## K117-image-load：图片加载分支

版本 8.72.0；Evidence `ev_eb2520a90296a79644051fb7c7f930fea1b921d15ab87bea375f95fc280a7c2f`；节录行 12–15。

```java
        if (!((Boolean) l84.c.a().j("android_photonote_img_load_opt", new i0().getType(), Boolean.FALSE)).booleanValue()) {
            ((XYImageView) w6().findViewById(l56.n.Q1)).l(new ai8.d(imageBean.p0(), 0, 0, null, 0, 0, null, 0, 0.0f, null, 1022, null), null, dVar2);
            return;
        }
```

## K126-image-sized-request：目标尺寸约束

版本 8.72.0；Evidence `ev_f4a17743183ec20182bb7b4e6c7a6d1687f2616f887760565b24a73f89b3a82a`；节录行 16–21。

```java
        if (iJ == 0 || iD == 0) {
            return ImageRequestBuilder.s(this.f122096f);
        }
        ImageRequestBuilder imageRequestBuilderS = ImageRequestBuilder.s(this.f122096f);
        imageRequestBuilderS.D(new e(iJ, iD));
        return imageRequestBuilderS;
```

## K128-gallery-diff：另一图集实现的增量更新

版本 8.72.0；Evidence `ev_0cec85d297a4926283ddc2a70eda2001c84230490febfe350dcc421caf95f289`；节录行 17–19。

```java
        getAdapter().d0(pair.getFirst());
        K4();
        pair.getSecond().dispatchUpdatesTo(getAdapter());
```

## K132-feed-restore：信息流恢复布局状态

版本 8.72.0；Evidence `ev_d62d5bba7eac320f7c0b0063521dc819791af0642596373095aa51df6501f629`；节录行 16–22。

```java
        this.f123252n.d0(this.f123245d);
        this.f123252n.notifyDataSetChanged();
        RecyclerView.LayoutManager layoutManager = getRecyclerView().getLayoutManager();
        if (layoutManager != null) {
            layoutManager.onRestoreInstanceState(parcelable);
        }
        this.C = true;
```

## K140-pool-prebind：某一笔记类型的回收池容量

版本 8.72.0；Evidence `ev_08755d0bfd60af80582d002020176b1027a30acb2dc6f4b6c185e422831e6d84`；节录行 5–8。

```java
        if (recycledViewPool != null) {
            recycledViewPool.setMaxRecycledViews(i100, 16);
        }
        exploreView.getRecyclerView().setRecycledViewPool(recycledViewPool);
```

## K134-feed-offset：左右列间距的计算

版本 8.72.0；Evidence `ev_dd7116d3f2e2ccdf644de7e8d0ba427668ae377481b13447690a85775bb6dcf2`；节录行 30–36。

```java
            int i100 = this.f116813a;
            if (spanIndex != 0) {
                i100 >>= 1;
            }
            rect.left = i100;
            rect.right = spanIndex == spanCount + (-1) ? this.f116813a : this.f116813a >> 1;
            int i101 = this.f116814b;
```

## K120-like-render：点赞状态渲染

版本 8.72.0；Evidence `ev_a39b449ba3e380fe5e39f3b22bc65c20c7ab948de0f5753c9c5695a55af23dab`；节录行 12–15。

```java
        LottieAnimationView lottieAnimationView = (LottieAnimationView) w6().findViewById(n.G1);
        lottieAnimationView.setSelected(noteFeed.M0());
        lottieAnimationView.setProgress(1.0f);
        lottieAnimationView.setAnimation(str);
```

## N201-image-bind：9.49.1 延续图集基础配置

版本 9.49.1；Evidence `ev_7db4b8e4dba7001ffaf95e0cc0615550cf63e59d3646659b7919d045e2d17e41`；节录行 35–43。

```java
            recyclerViewDb.setHasFixedSize(true);
            recyclerViewDb.setNestedScrollingEnabled(false);
            PreOnBindViewLinearLayoutManager preOnBindViewLinearLayoutManager = new PreOnBindViewLinearLayoutManager(recyclerViewDb.getContext());
            preOnBindViewLinearLayoutManager.setOrientation(0);
            preOnBindViewLinearLayoutManager.f151790d = 100;
            recyclerViewDb.setLayoutManager(preOnBindViewLinearLayoutManager);
            recyclerViewDb.setItemViewCacheSize(3);
            new PagerSnapHelper().attachToRecyclerView(recyclerViewDb);
            View view = this.f120750d;
```

## K203-new-image-loader：9.49.1 等待布局完成的加载分支

版本 9.49.1；Evidence `ev_68ef2466777d242ac5dbcea929d88dc8ad1e01f7524dd8dac535d1432cb51280`；节录行 57–63。

```java
        if (!(patchProxyResultProxy0Para.isSupported ? ((Boolean) patchProxyResultProxy0Para.result).booleanValue() : ((Boolean) fk2.v.f204378m.getValue()).booleanValue())) {
            function0.invoke();
        } else if (noteXYImageViewAb.isLaidOut()) {
            function0.invoke();
        } else {
            noteXYImageViewAb.getViewTreeObserver().addOnGlobalLayoutListener(new h1(noteXYImageViewAb, function0));
        }
```
