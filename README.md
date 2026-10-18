# ProductCatalog

## 1. What this is

ProductCatalog is a React Native 0.80 (TypeScript, New Architecture) app that browses the public dummyjson product API with search, category, price, rating and sort filters. It is built for offline use: products, the category list and the user's favourites are persisted and hydrated synchronously at launch, and favourites made without a connection are queued and delivered on reconnect. The code is organised into three enforced layers, described below, and every module is covered by tests.

## 2. Setup

### Prerequisites

| Tool | Version used | Notes |
| --- | --- | --- |
| Node | 22 (18 or newer is accepted by `engines`) | CI runs 22 |
| Yarn | 3.6.4 | Pinned by `packageManager`; the release is vendored in `.yarn/releases` |
| JDK | 17 | Required by the Android Gradle plugin |
| Android SDK | Platform 36, Build-Tools 35.0.0 | Platform 36 is needed by a transitive `androidx.core` |
| Android NDK | 27.1.12297006 | The React Native 0.80 default |
| Xcode | 16.1 or newer | React Native 0.80 minimum; CocoaPods is installed through Bundler |
| Ruby | 3.2 | For Bundler and CocoaPods |

### Install

```sh
git clone https://github.com/farazdev07/Product_case_study.git ProductCatalog
cd ProductCatalog
yarn install
```

`yarn install` also installs the git hooks (see section 6).

### Android

```sh
yarn start          # Metro, in one terminal
yarn android        # build, install and launch, in another
```

The author used an arm64 emulator named `Pixel_8_API_35` (Pixel 8 profile, API 35). A release build for that emulator:

```sh
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install app/build/outputs/apk/release/app-release.apk
```

The release variant is signed with the debug keystore that ships with the React Native template. It is not a distributable build.

To run a debug build while the device is offline, point the app at Metro through the USB tunnel instead of the emulator NAT address: `adb reverse tcp:8081 tcp:8081` and set the debug server host to `localhost:8081` in the developer menu.

### iOS

Verified with Xcode 27.0 (27A266a), CocoaPods 1.15.2 and the iPhone 17 simulator on iOS 27.0.

```sh
bundle install
cd ios && bundle exec pod install && cd ..
yarn ios --simulator "iPhone 17"
```

Two changes to the native project were required for this toolchain, and both are committed:

- **`fmt` is compiled as C++17.** The `fmt` 11.0.2 pod pinned by React Native 0.80 fails to build under the clang in Xcode 27 when compiled as C++20 (its `consteval` format-string checks are rejected). The Podfile `post_install` hook sets `CLANG_CXX_LANGUAGE_STANDARD = c++17` for that one pod.
- **The app adopts the UIScene lifecycle.** iOS 27 traps at launch (`EXC_BREAKPOINT` in `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) when an app has no scene configuration. `Info.plist` declares a scene manifest and `SceneDelegate.swift` starts React Native in the window scene.

On the author's machine `yarn ios` could not open the Simulator app (this Xcode installation has no `Simulator.app`), so the build and launch were done directly:

```sh
xcodebuild -workspace ios/ProductCatalog.xcworkspace -scheme ProductCatalog \
  -configuration Debug -destination "platform=iOS Simulator,name=iPhone 17" build
xcrun simctl install booted <DerivedData>/Build/Products/Debug-iphonesimulator/ProductCatalog.app
xcrun simctl launch booted com.faraz.productcatalog
```

A release build for the simulator (`-configuration Release`) embeds the bundle as `main.jsbundle`; it was used for the offline checks, which a debug build cannot do because it loads its bundle from Metro. The New Architecture is active on iOS: at startup the JavaScript runtime reports `nativeFabricUIManager` and `RN$Bridgeless` present and Hermes in use.

### Known environment issue: NDK

If the build fails with `NDK at .../ndk/27.1.12297006 did not have a source.properties file`, the NDK directory exists but is a partial install. Remove it and install it again:

```sh
rm -rf "$ANDROID_HOME/ndk/27.1.12297006"
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --install "ndk;27.1.12297006"
```

The version is declared once, in `android/build.gradle`.

### Scripts

| Command | What it does |
| --- | --- |
| `yarn start` | Starts Metro |
| `yarn android` | Builds and runs the Android app |
| `yarn ios` | Builds and runs the iOS app |
| `yarn lint` | ESLint over `src`, including the layer rules |
| `yarn format:check` | Prettier check over `src` |
| `yarn test` | Jest |
| `yarn test --coverage` | Jest with a coverage report and the coverage threshold |

Type checking is `yarn tsc --noEmit`.

### See the offline behaviour

On an Android emulator this takes about two minutes. The package is `com.faraz.productcatalog`.

1. Install a release build (the commands above) and launch it with the network on. Wait for the product list and the category chips to appear.
2. Force-stop the app: `adb shell am force-stop com.faraz.productcatalog`.
3. Turn the network off: `adb shell svc wifi disable` and `adb shell svc data disable`.
4. Launch the app again. The products and category chips are on screen at once, with no spinner, and a grey bar under the header reads "Offline — Serving Cached Data". This step needs a release build, because a debug build loads its JavaScript bundle from Metro, which an offline device cannot reach; to use a debug build, use the `adb reverse` alternative described under Android above.
5. Tap Save on a product. The button changes to "Saved" immediately. Force-stop and relaunch to see that the favourite and its pending sync survive a restart.
6. Turn the network back on: `adb shell svc wifi enable` and `adb shell svc data enable`. The bar changes to "Syncing Queued Actions" while the queued favourite is sent, then disappears.

On the iOS simulator the same steps work with the host machine's network standing in for steps 3 and 6, with one difference: a running app was not seen to detect the network returning (see section 8), so for step 6 relaunch the app with the network on and the queue drains at launch.

## 3. Architecture

The source is split into three layers under `src/`:

- `shared/` holds code that knows nothing about the product: the theme, UI primitives, the storage wrapper, the logger, the API client instance, and the cache-age helpers.
- `features/` holds one folder per capability: `catalog`, `favorites`, `connectivity`. A feature owns its slice, its endpoints, its hooks and its screens.
- `app/` composes features: the store, providers, navigation, and the two hooks that run for the lifetime of the app.

Dependencies point one way. `app` may import features and shared. A feature may import shared, and another feature only through that feature's `index.ts`. `shared` imports nothing from the other layers.

This rule is enforced by `eslint-plugin-boundaries`, not documented and left to review. `boundaries/element-types` forbids any import that crosses the layers in the wrong direction, and `boundaries/entry-point` forbids reaching into another feature's internal files. Both are errors in `yarn lint`, which runs in the pre-commit hook and in CI, so a violating commit cannot be made locally and cannot merge. The rules were verified against deliberately violating fixtures when they were introduced, because the plugin's default for `entry-point` enforces nothing.

The rule shapes the design in visible ways. `favorites` depends on `connectivity` and so `connectivity` cannot depend on `favorites`; the network banner therefore takes the queue length as a prop and the app, which may see both, supplies it. The feature `index.ts` files are the public surface and are pinned by tests.

## 4. Architecture brief

### a. Local caching and instant hydration

**MMKV, not AsyncStorage.** MMKV reads are synchronous. The store therefore reads the persisted catalog and favourites while the module is being evaluated and passes them to `configureStore` as `preloadedState`, so the first render already contains products. AsyncStorage is asynchronous: it would force an empty first frame, then a state update and a second render, which is a visible flash and, on a cold start, a blank screen for the duration of the read.

**A normalised slice we own, not the RTK Query cache.** RTK Query remains the transport, but the UI reads from `catalogSlice`, which stores products once by id (an entity adapter), the feed as an ordered list of ids, the category list, the total, and the time of the last fetch. The RTK Query cache is not a stable rehydration target: its internal shape is an implementation detail and its entries are evicted when subscriptions change. Our slice changes shape only when we change it, and persistence validates the shape on load, discarding anything that does not match instead of crashing the selectors.

**The feed carries the identity of its source.** A feed key (`all`, `search:<term>` or `category:<slug>`) is stored with the ids, so a hydrated or late-arriving page is only shown or appended when it belongs to the source currently selected.

**TTL governs revalidation, not retention.** The cache is never discarded for age. The ten-minute TTL decides only whether to refetch on mount. Discarding stale entries would empty the screen for exactly the user the requirement exists to protect, the one who opens the app offline some hours after the last use. An old cache shown with a banner is better than an empty screen.

**The cache is the source of truth while offline.** When the device is offline, category, price, rating, sort and the search term are applied client-side to every cached product, no request is made, and the stored feed is left in place. The search term is matched against product titles only, an approximation of the server's search. Selecting a category the cache has no products for shows "No products match these filters" rather than an offline message, and Clear all restores the full cached list. When the connection returns, the selected source is fetched normally and replaces the feed.

Writes are throttled to one per second so that paging does not hammer storage. The favourites queue is the exception and is written on every change, because it is user data and a kill must not lose it.

### b. Offline queue persistence and reconnection

**The API is read-only.** dummyjson offers no mutations, so there is nothing to queue and a "Syncing Queued Actions" banner state could never fire. Rather than ship a state that cannot be reached, favourites were added as a local action that is queued while offline and delivered on reconnect. This is a deliberate reading of an underspecified requirement, and it is recorded in a comment where the queue is defined.

**PUT /products/{id} stands in for a favourites endpoint the API does not have.** dummyjson has no favourites resource. `PUT /products/{id}` returns a simulated update and stores nothing. It is used because it is the closest write the API offers; it demonstrates ordered delivery, retry and persistence, not server-side storage.

The queue behaves as follows:

- **Optimistic.** Toggling a favourite updates the local ids at once and appends a queued `add` or `remove` action. The user never waits on the network for a local preference.
- **Coalescing.** If the opposite action for the same product is already queued, both are removed instead of queueing the inverse. Favouriting and unfavouriting offline is a no-op on the server, so nothing is sent.
- **The head is never coalesced while syncing.** The first item of a queue that is being drained may already be on the wire. Cancelling it locally would leave the server with a favourite the user has since removed, so in that case the inverse is queued normally and delivered after it.
- **FIFO, sequential.** Actions are sent one at a time in the order they were made, because an add followed by a remove for one product is only correct in that order. A failed action stays at the front and is retried before anything behind it.
- **Single in-flight guard.** One drain runs at a time. The drain reads the store at every step, so actions queued mid-drain are picked up and a connection lost mid-drain stops it.
- **Exponential backoff.** The wait after a failure doubles per attempt of the same action, from one second, capped at thirty.
- **Drop at five attempts.** An action the server keeps rejecting must not block the queue forever, so it is dropped after five failed attempts and a development warning is logged. The local favourite state is kept.
- **Triggers.** The drain runs on mount, on a false-to-true change of connectivity, and when an action is queued while already online.
- **Persistence.** `ids` and `queue` are written synchronously to MMKV on every change and hydrated into `preloadedState`. The sync status is deliberately not persisted, so a launch interrupted mid-sync cannot start as "syncing" with nothing running.

Connectivity comes from NetInfo. A connected network that reports no internet reachability (a captive portal, a router with no uplink) is treated as offline.

The banner has three states, as the brief words them: "Offline — Serving Cached Data", "Syncing Queued Actions" when online with a non-empty queue, and hidden otherwise. It is a thin bar inside each screen's content area, directly below the native header, and animates with the built-in `Animated` API.

### c. Performance choices for the virtualized list

**FlashList over FlatList.** FlashList recycles row views instead of mounting and unmounting them, which keeps scroll cost flat as the list grows. Version 2 on the New Architecture measures rows itself, so no size estimate is supplied.

**Stable list inputs.** `renderItem` is a `useCallback` over a stable `onPress`; `keyExtractor` and the separator are module-level; there are no inline styles or arrow functions in the row render. `ProductCard` is `memo`'d, so when a page is appended only the new rows render.

**`FavoriteButton` reads its own state.** It takes only a primitive `productId`, selects a single boolean from the store and owns its toggle callback. If the card passed `isFavorite` and an `onToggle`, every toggle would change the card's props and break its memoisation; passing the whole favourites set down would re-render every card on every change. With this design, tapping the button re-renders that button only. A test asserts the card does not re-render when its favourite state changes. The button is a sibling of the card's pressable area rather than a child so that screen readers can reach it.

**Measured numbers.** Release build, arm64 emulator (Pixel_8_API_35), 40 alternating flings per run, `dumpsys gfxinfo`, on a host with a load average between 8 and 13:

| Target | Runs | Janky frames | 50th percentile | 90th percentile | 99th percentile |
| --- | --- | --- | --- | --- | --- |
| ProductCatalog (release) | 3 | 51.0%, 52.3%, 59.4% | 48 to 57 ms | 109 to 113 ms | 150 ms |
| Stock Settings app | 2 | 50.1%, 56.0% | 48 to 53 ms | 109 to 150 ms | 200 to 600 ms |

These numbers do not show a smooth list in absolute terms. The emulator renders with a software-translated GL path (Apple M2 host), and the stock Settings app, which does no work of ours, scores the same. The valid conclusion is narrower: under identical conditions the catalog list is no worse than a system list. A verdict on absolute smoothness needs a physical device, which was not available.

## 5. Testing

The suite is Jest with React Native Testing Library: 41 suites and 375 tests, with 100% statement, branch, function and line coverage. `jest.config.js` enforces a 70% global floor for all four measures, and CI runs `yarn test --coverage`, so a drop below the floor fails the build. Type-only files, barrels and test helpers are excluded from coverage.

What is covered, and why those things:

- **Slices and selectors.** Reducers are where state bugs live and are cheap to test exhaustively: paging and de-duplication, feed identity, late pages of a replaced source, filter and sort resolution, the favourites toggle, coalescing, FIFO order, attempt counting and the drop at the cap.
- **Persistence.** Hydration, corrupt JSON, valid JSON of the wrong shape, entries of any age, categories, and a full write-then-hydrate round trip, because a cache that cannot be read back is worse than none.
- **Hooks with timers.** The queue drain is tested under fake timers: ordered delivery, retry with exponential backoff, the single in-flight guard, stopping on disconnect and on unmount, and dropping at the cap. Debounce and the network subscription cycle are tested the same way.
- **Components.** Each screen and control is rendered with a real store and a stubbed `fetch`, covering loading, error, offline, empty and no-results states, filter interaction, the banner's three states, and the favourite button including the memoisation guarantee.
- **Endpoints.** Request URLs and parameters are asserted against a stubbed `fetch`.

Tests that dispatch RTK Query requests clear its cache timers on teardown; otherwise Jest would be held open for the 60-second expiry.

Device tests were also run by hand. The sequence below was run on the Pixel_8_API_35 emulator:

1. **Online favourites.** Favourite two products online; both turn to "Saved" and the queue drains immediately.
2. **Offline banner.** Turn wifi and data off; "Offline — Serving Cached Data" appears under the header while the feed stays visible.
3. **Queue and coalescing offline.** Favourite two more, then unfavourite one of them. The persisted queue held exactly one action; the coalesced pair was never queued.
4. **Offline cold start.** Force-stop the app and relaunch it while still offline. Products, the "Saved" states and the queue all survive, and the category chips are present.
5. **Reconnect.** Turn wifi on; the blue "Syncing Queued Actions" bar appears, the queue empties, and the bar disappears.

Thumbnails offline were checked on release builds of both platforms: load the first page online without scrolling, force quit, turn the network off and relaunch, then scroll the cached list. On Android every row scrolled through, including rows near the end of the first page that had never been on screen online, showed its image, which is the effect of the prefetch (before it, rows never displayed were blank). On iOS no row showed an image, with the prefetch alone and with the larger URL cache, for the reason given in section 8.

Offline filtering was checked on an Android release build: after loading about 60 products online, the app was relaunched with the network off, and choosing Beauty, then Fragrances, then Kitchen Accessories each showed that category's cached products under the offline banner. Clear all restored the full list, and turning the network back on removed the banner and loaded the selected category's images.

The cold-start check was repeated on a release build, twice: once with a fresh cache and once with the cache older than the TTL (the TTL was temporarily set to 10 seconds and restored). In both cases the products and category chips rendered offline; at the end of the cached list the footer showed "Could not load products." with a Retry button, and thumbnails of products the device had never displayed were blank. That was before thumbnails were prefetched; see below.

The same functional checks were run on iOS (iPhone 17 simulator, iOS 27.0), driven by an XCUITest harness kept outside the repository:

- **Feed and paging.** The feed loads with images, and scrolling fetched further pages (60 products in the persisted feed after the run).
- **Search.** A debounced search for "phone" returns the matching products and a search with no match shows `No results for "..."`.
- **Filters.** Category, sort, price and rating chips applied together (Beauty, price high to low, under $25, 4 and up gave Powder Canister, Red Lipstick and Red Nail Polish in that order), and "Clear all" restored the unfiltered list.
- **Detail and favourites.** The detail screen rendered the full product from the cache; the favourite toggle worked from the list and the detail screen and survived a relaunch.
- **Release build, offline.** After loading online, force-quitting and disabling the host network, the relaunch showed the products, the category chips, the saved state of the favourite and the offline banner. A favourite added offline was written to the persisted queue.
- **Cold start online with a queued action.** Launching with the network available drained the queue.

The app is a universal iOS app. On an iPad (iPad Pro 13-inch M5 simulator, iOS 27.0) the feed lists products in two columns in portrait and three in landscape, the column count following the window width, and the detail screen is a centred column; the same feed, search, filter and detail checks passed there. On a phone the layout is unchanged. Both iPad orientations and a resized window were looked at; split view and Stage Manager sizes other than the one resized window were not.

Two things were not shown on iOS. The "Syncing Queued Actions" bar was not observed, because the simulator never reported the network coming back to the running app (see section 8), and no scroll measurement was taken: the simulator renders on the host and exposes no frame statistics that could be trusted, so no iOS smoothness figure is claimed, consistent with the Android caveat in section 4c.

Running the iOS checks found one layout bug: after a sort or filter change FlashList's scroll anchoring left the list scrolled past the new first results. It is fixed by disabling the anchoring.

## 6. CI and git hooks

Pre-commit (Husky) runs three things:

1. `lint-staged`: ESLint with `--fix` and Prettier on staged source files, and Prettier on staged JS, JSON and YAML.
2. `yarn tsc --noEmit`: the whole project is type-checked, with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride`.
3. `jest --findRelatedTests` over the staged TypeScript files, so a commit runs the tests of the code it touches.

The `commit-msg` hook runs commitlint with the conventional-commits configuration. Commits are `type(scope): subject`, one concern per commit, and body lines are limited to 100 characters.

CI (`.github/workflows/ci.yml`) runs on every push and pull request, on Node 22 with a frozen lockfile: `yarn format:check`, `yarn lint`, `yarn tsc --noEmit`, `yarn test --coverage`. The layer rules run as part of lint.

## 7. Decisions and trade-offs

- **react-native-screens pinned to `~4.18.0`.** From 4.19.0 the Android Fabric component descriptor asserts a `dynamic_cast` (`RNSScreenComponentDescriptor.h`) that aborts debug builds on React Native 0.80 as soon as a screen mounts. Newer 4.x releases were also tried: 4.25 broke the Android compile and 4.30 broke iOS codegen. 4.18.0 is the newest release that runs on Android and passes iOS codegen. The reason is recorded next to the pin in `package.json`.
- **Price and rating filter the loaded pages only.** The API has no price or rating query parameters. Filtering is therefore client-side over the pages already fetched, and the UI is honest about it: when filtered results are empty but more pages exist, it offers to load more instead of claiming there are no matches.
- **Search and category cannot combine server-side.** `/products/search` and `/products/category/{slug}` are separate endpoints. The category filter is applied client-side when a search is active, and as the server query when it is not. A search with a category selected shows only loaded matches.
- **No image caching library.** React Native's `Image` was sufficient at this list size, and a native dependency such as an image-caching library was not justified. Each fetched page's thumbnails are passed to `Image.prefetch`, which warms the platform's own cache; it is not a cache of ours. On Android that is enough (below). On iOS it is not: the thumbnails are served with `Cache-Control: public, max-age=0, no-store`, so the iOS URL cache refuses to store them, and neither prefetching nor a larger URL cache changes that.
- **Single theme, no theme context.** The app has one theme, so a plain module of tokens is used. A provider would add a render dependency with nothing to switch between.
- **NetInfo for connectivity, request errors for the empty state.** The offline empty state is derived from the request failing with a fetch error, which is true to what the user can actually do; the NetInfo-driven banner reports the device's status separately.
- **Favourites queue written without throttling, catalog cache throttled.** The first is user data and writes are one per tap; the second is disposable and written in bursts while paging.
- **Entity adapter slice rather than persisting RTK Query.** See section 4a.
- **Debounce in the search input, filters in the store.** The text field holds the raw input and pushes the debounced value to the store, so typing never re-renders the feed.
- **Detail screen reads the cache and fetches only on a miss.** dummyjson's list and detail endpoints return identical objects (checked field by field), so a product opened from the feed is already complete.

## 8. Known limitations

- **iOS has run on simulators only, and live reconnect there was not observed.** It has not been run on a physical iPhone or iPad. What was observed on the iPhone 17 simulator (iOS 27.0): the offline banner appears within seconds when the host's wifi is turned off, so offline detection works live; after the host's wifi was turned back on, the running app still showed the offline banner after 3 minutes, while the host could reach the API and the same app launched fresh read the correct online state. Android reconnects correctly. Calling `NetInfo.refresh()` when the app returned to the foreground (backgrounded by launching Safari) did not change this and was removed. The cause was not confirmed, so none is claimed, and live reconnect on iOS remains unverified.
- **iOS shows no thumbnails offline.** The image CDN sends `Cache-Control: no-store` on the thumbnails, which the iOS URL cache honours, so nothing is kept for an offline launch. Raising `URLCache` capacity to 50 MB memory and 200 MB disk was tried and made no difference (still no thumbnails, and `Cache.db` unchanged), so it was not kept. Fixing this needs a cache the app controls, such as an image library with its own disk cache, or the server changing the header.
- **Smoothness is unproven on hardware.** Frame measurements come from a software-rendered emulator on a loaded host and cannot support a claim of 60 fps. The next step is to profile on a mid-range physical device.
- **The sync target is a stand-in.** `PUT /products/{id}` persists nothing, so delivery is exercised but not stored. A real favourites endpoint would also need idempotency keys, since a request can succeed server-side and fail on the way back, and the retry would then be a duplicate.
- **Attempts are counted during connection loss.** A request that fails because connectivity dropped mid-flight counts toward the five-attempt cap. Distinguishing those failures from server rejections would be more accurate.
- **The queue is unbounded.** There is no cap on queued actions and no conflict resolution against server state.
- **Filters apply to loaded pages.** A price or rating filter cannot find a match on a page that has not been fetched. A real backend would take these as query parameters.
- **Filter selections are not persisted** across launches; only data is.
- **The release build is signed with the debug keystore.** There is no signing configuration, crash reporting or analytics.
- **No end-to-end tests.** Behaviour is covered by component and hook tests and by the manual device sequence above. Automating that sequence with an end-to-end runner is the most valuable test addition.
- **The categories list is cached only after one online launch.** A first launch offline shows the feed's empty state and no chips.

## 9. AI assistance

AI tooling was used during development. The architecture decisions, the library choices and the trade-offs recorded above are the author's, and every line in the repository is understood and owned by the author.
