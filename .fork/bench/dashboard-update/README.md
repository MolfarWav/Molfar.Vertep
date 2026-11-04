# Dashboard update timing in the engine's QuickJS sandbox (#245)

A route pass has 10 s in the engine's plugin sandbox, and QuickJS runs the plugin tens of times slower than Bun,
so a desktop number over about 3 s is a phone timeout waiting to happen. These three scripts reproduce what #245 found:
the first update of a long chat made before the entity registry took over 10 s (and never finished, because the
migration is saved only when the update ends).

    bun build-state.ts /tmp/old 60            # 40 snapshots, 4 characters, made by the plugin before the registry (e519375~1)
    PLUGIN=<plugin.js> bun build-state.ts /tmp/new 60      # the same chat made by the plugin you are testing (steady state)
    bun time-update.ts /tmp/old <Roleplay>/plugins/relations/plugin.js 3     # run 0 = the first update after an upgrade
    NAMES=migrateThings,wordScan bun qjs-prof.ts <plugin.js> /tmp/instr.js && bun time-update.ts /tmp/old /tmp/instr.js 1

2026-11-05, desktop, 60 turns (40 snapshots, 4 characters, 350 KB of state):

| plugin | first update | next update |
|---|---|---|
| before the registry | 1.3 s | 1.3 s |
| e020dc0 .. b09106e (phase B) | over 10 s, killed | 2.7 s |
| the fix (#245) | 2.5 s | 0.85 s |
