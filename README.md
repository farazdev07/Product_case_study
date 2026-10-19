# ProductCatalog

[![CI](https://github.com/farazdev07/Product_case_study/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/farazdev07/Product_case_study/actions/workflows/ci.yml)

A React Native 0.80 (TypeScript, New Architecture) product catalog over the public dummyjson API: virtualized feed with pagination, debounced search, category, price, rating and sort filters, and an offline-first cache that is hydrated before the first frame. Favourites made offline are queued and delivered on reconnect, and have their own screen served entirely from cache.

42 test suites, 392 tests, 100% coverage. Verified on an Android emulator, a physical Android phone, and the iPhone and iPad simulators.

## 1. Requirements coverage

| Requirement                                              | How it is met                                                                                                                                              | Where                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Virtualized list, infinite scroll (skip/limit)           | FlashList over a normalised feed; `onEndReached` advances `skip`, guarded against firing mid-fetch or past the end                                         | `features/catalog/lib/useProductFeed.ts`                   |
| Smooth scrolling, zero frame drops                       | Recycled rows, stable `renderItem`/`keyExtractor`, memoised cards. Measured on hardware: 0.00% and 0.10% janky frames on the settled runs                  | §4c                                                        |
| Debounced search, 300–500 ms                             | 400 ms; the input holds raw text and pushes the settled value to the store, so one request per settled term                                                | `shared/lib/useDebounce.ts`                                |
| Filter and sort by category, price, rating               | Category is a server query (client-side when a search is active); price, rating and sort are client-side over loaded pages — an API limitation, documented | `features/catalog/model/`                                  |
| Products, categories and details in high-speed storage   | MMKV behind a typed wrapper, shape validated on load                                                                                                       | `shared/storage/`, `features/catalog/model/persistence.ts` |
| Cold start renders cache before revalidation             | MMKV's synchronous reads seed `configureStore` with `preloadedState` at module evaluation, so the first frame has products                                 | `app/store/store.ts`, §4a                                  |
| Banner: Online / Offline–Serving Cached / Syncing Queued | NetInfo-driven three-state bar; the syncing state is reachable because favourites are queued locally                                                       | `features/connectivity/`, §4b                              |
| Separation of API, state and UI                          | RTK Query transports, slices and selectors hold state, components render and dispatch; the layering is enforced by lint                                    | §3                                                         |
| TypeScript                                               | Strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`                                                                                   | `tsconfig.json`                                            |
| No device hardware APIs                                  | None used                                                                                                                                                  | `package.json`                                             |
| Unit and integration tests, ≥70% coverage                | 392 tests at 100%; the 70% floor is enforced by Jest in CI                                                                                                 | §5                                                         |
| Setup instructions, both platforms                       | Below                                                                                                                                                      | §2                                                         |
| Pre-commit hook demonstrating CI                         | Husky runs lint, typecheck and related tests; CI runs the same gates                                                                                       | §6                                                         |
| Architecture brief                                       | Caching and hydration, queue and reconnection, list performance                                                                                            | §4                                                         |

Two requirements are met by interpretation rather than literally, each explained where it appears: no user action in the brief writes anything, so favourites were added to give the queued-actions state something real to carry (§4b); and price and rating filter the loaded pages, because the API has no query parameters for them (§7).

## 2. Setup

### Prerequisites

| Tool        | Version                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| Node        | 22 (18+ accepted by `engines`)                                                       |
| Yarn        | 3.6.4, vendored in `.yarn/releases`                                                  |
| JDK         | 17                                                                                   |
| Android SDK | Platform 36, Build-Tools 35.0.0                                                      |
| Android NDK | 27.1.12297006 — the project is configured for this version in `android/build.gradle` |
| Xcode       | 16.1+ (verified on 27.0)                                                             |
| Ruby        | 3.2, for Bundler and CocoaPods                                                       |

```sh
git clone https://github.com/farazdev07/Product_case_study.git ProductCatalog
cd ProductCatalog
yarn install          # also installs the git hooks
```

### Android

```sh
yarn start            # Metro, in one terminal
yarn android          # build, install, launch
```

Release build (used for the offline checks, since a debug build loads its bundle from Metro):

```sh
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install app/build/outputs/apk/release/app-release.apk
```

It is signed with the React Native template's debug keystore and is not distributable.

If the build reports `NDK ... did not have a source.properties file`, that NDK directory is a partial install: `rm -rf "$ANDROID_HOME/ndk/27.1.12297006"` and reinstall it with `sdkmanager --install "ndk;27.1.12297006"`.

### iOS

```sh
bundle install
cd ios && bundle exec pod install && cd ..
yarn ios --simulator "iPhone 17"
```

Three native changes were required for this toolchain, all committed:

- **`fmt` compiled as C++17.** The `fmt` 11.0.2 pod pinned by React Native 0.80 fails under Xcode 27's clang at C++20 (its `consteval` format-string checks are rejected). A Podfile `post_install` hook sets the standard for that pod only.
- **UIScene lifecycle adopted.** iOS 27 traps at launch when an app declares no scene configuration. `Info.plist` declares a scene manifest and `SceneDelegate.swift` starts React Native in the window scene.
- **Pod deployment targets raised to 15.1.** One of TurboImage's pods declares iOS 12.0, which Xcode 27 rejects.

Verified on the iPhone 17 simulator (iOS 27.0) and the iPad Pro 13-inch M5 simulator. If `yarn ios` cannot open Simulator.app, build with `xcodebuild` and install with `xcrun simctl install booted "$(...BUILT_PRODUCTS_DIR...)/ProductCatalog.app"`.

### Scripts

`yarn start` · `yarn android` · `yarn ios` · `yarn lint` · `yarn format:check` · `yarn test` · `yarn test --coverage` · `yarn tsc --noEmit`

### See the offline behaviour

Two minutes on an Android emulator or device. Package: `com.faraz.productcatalog`.

1. Install a release build, launch online, wait for the feed and category chips.
2. `adb shell am force-stop com.faraz.productcatalog`
3. `adb shell svc wifi disable && adb shell svc data disable`
4. Relaunch. Products, chips and images are on screen immediately — no spinner — under a bar reading "Offline — Serving Cached Data".
5. Tap Save. The button changes at once and the header count rises; open Saved to see the product served from cache. Force-stop and relaunch: the favourite and its pending sync survive.
6. `adb shell svc wifi enable && adb shell svc data enable`. The bar becomes "Syncing Queued Actions" while the queued favourite is delivered, then hides.

The same works on the iOS simulator using the host's network, except that a running app was not seen to detect the network returning (§8), so for step 6 relaunch with the network on and the queue drains at launch.

## 3. Architecture

Three layers under `src/`:

- **`shared/`** — knows nothing about products: theme, UI primitives, storage wrapper, logger, API client, cache helpers.
- **`features/`** — one folder per capability (`catalog`, `favorites`, `connectivity`), each owning its slice, endpoints, hooks and screens.
- **`app/`** — composition: store, providers, navigation, app-lifetime hooks, and any screen needing more than one feature.

Dependencies point one way. `app` may import features and shared; a feature may import shared, and another feature only through its `index.ts`; `shared` imports nothing above it.

**The rule is enforced by `eslint-plugin-boundaries`, not documented and left to review.** `element-types` blocks imports crossing layers the wrong way and `entry-point` blocks reaching into a feature's internals. Both are lint errors, and lint runs in the pre-commit hook and in CI, so a violating commit cannot be made locally or merged. The rules were verified against deliberately violating fixtures, because the plugin's `entry-point` default enforces nothing.

It shaped the design twice:

- `favorites` depends on `connectivity`, so the banner cannot read the queue directly. It takes the queue length as a prop, supplied by `app`, which may see both.
- `catalog` depends on `favorites` (the card renders the favourite toggle), so the saved-products screen lives in `app/screens/` — inside `favorites` it would have closed a cycle.

## 4. Architecture brief

### a. Caching and instant hydration

**MMKV, not AsyncStorage.** MMKV reads synchronously, so the store reads the persisted catalog and favourites during module evaluation and passes them to `configureStore` as `preloadedState` — the first render already contains products. AsyncStorage would force an empty first frame, then a state update and a second render.

**A normalised slice we own, not the RTK Query cache.** RTK Query stays the transport; the UI reads `catalogSlice` — products by id in an entity adapter, the feed as ordered ids, categories, total, last-fetch time. RTKQ's internal cache shape is an implementation detail and its entries are evicted on subscription changes, so it is not a stable rehydration target. Our slice changes only when we change it, and persistence validates the shape on load, degrading to a cache miss rather than crashing the selectors.

**The feed carries its source identity.** A feed key (`all`, `search:<term>`, `category:<slug>`) is stored with the ids, so a hydrated or late-arriving page is only applied if it belongs to the source currently selected.

**TTL governs revalidation, not retention.** The cache is never discarded for age; the ten-minute TTL only decides whether to refetch on mount. Discarding stale entries would empty the screen for exactly the user the requirement protects — someone opening the app offline hours later.

**Offline, the cache is the source of truth.** Category, price, rating, sort and the search term apply client-side to every cached product; no request is made and the stored feed is untouched. Search falls back to matching titles. An empty result says "No products match these filters", not that you are offline, and Clear all restores the cached list. On reconnect the selected source is fetched and replaces the feed.

Catalog writes are throttled to one per second so paging does not hammer storage. The favourites queue is written on every change — it is user data, and a kill must not lose it.

### b. Offline queue and reconnection

**No user action in the brief writes anything.** dummyjson does expose write endpoints, `POST /products/add` and `PUT /products/{id}`, but they are simulated, persisting nothing, and none of them map to an action a user of a product catalog would take; editing the global catalog is not a user feature. So nothing in the brief as written could be queued, and the "Syncing Queued Actions" state could never fire. Rather than ship an unreachable state, favourites were added as a real local action, queued offline and delivered on reconnect. `PUT /products/{id}` is the stand-in transport for a favourites endpoint that does not exist: it returns a simulated update and stores nothing, so what this demonstrates is ordered delivery, retry and persistence, not server-side storage.

- **Optimistic** — the local id set updates immediately; the user never waits on the network for a preference.
- **Coalescing** — an action that cancels one already queued removes both, since the pair is a no-op on the server.
- **Except the in-flight head** — the first item of a draining queue may already be on the wire, so cancelling it locally could leave the server holding a favourite the user removed. The inverse is queued normally instead.
- **FIFO, one at a time** — add-then-remove for a product is only correct in order; a failure holds the front of the queue.
- **Single in-flight guard** — one drain at a time, reading the store at each step, so mid-drain changes are picked up and a dropped connection stops it.
- **Exponential backoff** — doubling from one second, capped at thirty.
- **Dropped at five attempts** — an action the server keeps rejecting must not block the queue forever; the local state is kept and a dev warning logged.
- **Triggers** — on mount, on a false-to-true connectivity change, and when an action is queued while already online.
- **Persistence** — ids and queue written to MMKV on every change and hydrated into `preloadedState`. Sync status is deliberately not persisted, so a launch interrupted mid-sync cannot start as "syncing" with nothing running.

Connectivity comes from NetInfo; a connected network reporting no internet reachability (a captive portal) counts as offline. The banner is a thin bar below the header with the brief's three states.

### c. Virtualized list performance

**FlashList over FlatList** — rows are recycled rather than mounted and unmounted, keeping scroll cost flat as the list grows. v2 on the New Architecture measures rows itself, so no size estimate is given.

**Stable list inputs** — `renderItem` is a `useCallback` over a stable `onPress`; `keyExtractor` and the separator are module-level; no inline styles or arrows in the row. `ProductCard` is memoised, so appending a page renders only the new rows.

**`FavoriteButton` reads its own state** — it takes only a `productId` and selects one boolean. Passing `isFavorite` and `onToggle` down would change the card's props on every toggle and break memoisation; passing the whole favourites set would re-render every card. A test asserts the card does not re-render when its favourite state changes. The button is a sibling of the card's pressable area, not a child, so screen readers can reach it.

**Measured on hardware.** realme RMX3834, Android 15, 60 Hz, release build, charging. 40 alternating flings per run (`adb shell input swipe`, 250 ms), read with `dumpsys gfxinfo`, three runs per target:

| Target             | Run | Frames | Janky      | p50      | p90   | p99      |
| ------------------ | --- | ------ | ---------- | -------- | ----- | -------- |
| ProductCatalog     | 1   | 1461   | 1.23%      | 11 ms    | 15 ms | 26 ms    |
| ProductCatalog     | 2   | 1047   | 0.00%      | 10 ms    | 11 ms | 15 ms    |
| ProductCatalog     | 3   | 1045   | 0.10%      | 10 ms    | 11 ms | 15 ms    |
| Settings (control) | 1–3 | ~2440  | 4.33–4.51% | 18–19 ms | 34 ms | 40–42 ms |

A 60 Hz frame is ~16.7 ms, and p90 is inside that on the settled runs; run 1 is the post-launch warm-up. The system Settings list, used as a control, scored worse on the same device, so these are not simply a property of the hardware. The flings are synthetic input, so this shows the list renders cleanly under repeated scrolling, not a user-feel measurement.

## 5. Testing

Jest with React Native Testing Library: 42 suites, 392 tests, 100% statement, branch, function and line coverage. `jest.config.js` enforces a 70% floor on all four and CI runs with coverage, so a drop fails the build. Barrels, type-only files and test helpers are excluded.

What is covered and why:

- **Slices and selectors** — reducers are where state bugs live and are cheap to test exhaustively: paging and de-duplication, feed identity, late pages from a replaced source, filter and sort resolution, the favourites toggle, coalescing, FIFO order, attempt counting and the drop at the cap.
- **Persistence** — hydration, corrupt JSON, valid JSON of the wrong shape, entries of any age, and a write-then-hydrate round trip, because a cache that cannot be read back is worse than none.
- **Hooks under fake timers** — the queue drain's ordered delivery, backoff, in-flight guard, stopping on disconnect and unmount, and the attempt cap; plus debounce and the NetInfo subscription cycle.
- **Components** — every screen and control against a real store and a stubbed `fetch`: loading, error, offline, empty and no-results states, filter interaction, the banner's three states, the saved screen, and the card's memoisation guarantee.
- **Endpoints** — request URLs and parameters asserted against a stubbed `fetch`.

**Manual device testing.** On an Android emulator and the realme phone: favouriting online drains immediately; turning the network off raises the offline banner with the feed intact; favouriting then unfavouriting offline leaves exactly one queued action, the coalesced pair never queued; a force-stop and offline relaunch preserves products, category chips, saved state and the queue; reconnecting shows the syncing bar until the queue empties. The cold-start check was repeated with the cache aged past the TTL (temporarily set to 10 s) and behaved identically. Offline filtering by category was checked across three categories, with Clear all restoring the full cached list. Offline images were verified on release builds of both platforms after the move to TurboImage (§7): rows far below the first screen, never displayed online, render their photos.

The same functional checks ran on the iPhone 17 simulator via an XCUITest harness kept outside the repository, and on the iPad Pro simulator, where the feed is two columns in portrait and three in landscape and the detail screen is a centred column.

Two things were not shown on iOS: the syncing bar, because the simulator never reported the network returning to a running app (§8), and any frame measurement, because the simulator renders on the host and exposes no statistics worth trusting. The iOS checks did find one real bug — after a sort or filter change, FlashList's scroll anchoring left the list past the new first results — which is fixed by disabling anchoring.

## 6. CI and git hooks

**Pre-commit (Husky)** runs `lint-staged` (ESLint `--fix` and Prettier on staged files), then `tsc --noEmit` over the whole project, then `jest --findRelatedTests` on the staged TypeScript. **`commit-msg`** runs commitlint with conventional commits.

**CI** (`.github/workflows/ci.yml`) runs on every push and pull request, on Node 22 with a frozen lockfile: `format:check`, `lint`, `tsc --noEmit`, `test --coverage`. The architecture rules run as part of lint. The hook and the pipeline run the same gates, so anything that would fail CI fails locally first.

A fuller pipeline would add platform build jobs (they need the Android SDK and NDK and a full pod install on the runner), an end-to-end job running the manual sequence on an emulator, scheduled dependency and licence auditing, branch protection once work goes through pull requests, and release automation.

## 7. Decisions and trade-offs

- **`react-native-screens` pinned to `~4.18.0`.** From 4.19.0 the Android Fabric component descriptor asserts a `dynamic_cast` that aborts debug builds on RN 0.80 as soon as a screen mounts. 4.25 broke the Android compile and 4.30 broke iOS codegen; 4.18.0 is the newest that does neither. The reason sits beside the pin in `package.json`.
- **An image library with its own disk cache (`react-native-turbo-image`).** The CDN serves images with `Cache-Control: no-store`, so the platform HTTP cache keeps nothing on iOS and offline rows had no photos. Prefetching and a larger `URLCache` were both tried and measured as ineffective. `TurboImage` with `cachePolicy="dataCache"` keeps its own disk cache and ignores the header; each page's thumbnail and detail image are prefetched with the same policy. Cost accepted: one native dependency (Nuke on iOS, Coil on Android), whose RN 0.80 and New Architecture support the package does not declare and which was established only by running it, plus the Podfile deployment-target change.
- **Price and rating filter loaded pages only.** The API exposes no query parameters for them, so filtering is client-side. When a filter empties the results but more pages exist, the UI offers to load more rather than claiming there are no matches.
- **Search and category cannot combine server-side.** They are separate endpoints, so category applies client-side while a search is active and as the server query otherwise.
- **Preset chips for price and rating, not free input.** Fixed steps remove empty, negative, non-numeric and out-of-range values by construction rather than validating them.
- **No scaling library.** Layout adapts by breakpoint — column count follows window width, detail becomes two columns when wide — rather than scaling every dimension from a phone baseline, which oversizes type and controls on a tablet.
- **Single theme, no theme context.** A provider would add a render dependency with nothing to switch between.
- **The saved screen lives in `app/`.** See §3 — the boundary rule decided it, not taste.
- **Favourites queue written unthrottled, catalog cache throttled.** One is user data written once per tap; the other is disposable and written in bursts while paging.
- **Debounce in the input, filters in the store**, so typing never re-renders the feed.
- **Detail reads the cache and fetches only on a miss** — dummyjson's list and detail responses are identical field for field, so a product opened from the feed is already complete.

## 8. Known limitations

- **iOS is simulator-only, and live reconnect was not observed there.** The offline banner appears within seconds when the host's wifi drops, so detection works live; but after wifi returned, the running app still showed offline after three minutes, while a fresh launch read the correct state and Android reconnects correctly. `NetInfo.refresh()` on foreground did not change it and was removed. No cause is claimed.
- **Smoothness is measured on one Android phone**, at 60 Hz, with synthetic flings. iOS has no frame measurement.
- **The sync target is a stand-in.** `PUT /products/{id}` persists nothing. A real endpoint would need idempotency keys, since a request can succeed server-side and fail on the way back.
- **Queue edges.** Failures caused by a dropped connection count toward the five-attempt cap; the queue is unbounded; there is no conflict resolution against server state.
- **Filters apply to loaded pages**, and filter selections are not persisted across launches — only data is.
- **Saved products missing from the cache are hidden** but still counted in the header, until the cache holds them again.
- **Categories are cached only after one online launch**, so a first-ever launch offline shows an empty feed and no chips.
- **Tablet layout is adapted, not designed** — no split view or tablet-specific navigation.
- **The release build is signed with the debug keystore.** No signing configuration, crash reporting or analytics.
- **No end-to-end tests.** The manual sequence above is the gap; automating it is the most valuable addition.

## 9. AI assistance

AI tooling was used during development. The architecture decisions, library choices and trade-offs recorded above are the author's, and every line in the repository is understood and owned by the author.
