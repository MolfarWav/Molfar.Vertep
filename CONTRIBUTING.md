# Contributing to Molfar Vertep

Thanks for wanting to help. This is a small project with one maintainer, so a few rules keep it manageable.

## Bugs and ideas
- Open an [issue](https://github.com/MolfarWav/Molfar.Vertep/issues). Bug reports use the form: where it happens, what happened, steps, device and browser, versions, what you already know. A report with steps and the version gets fixed fastest.
- Check the open issues first. Bugs are fixed in batches, so a fix may wait a few days.
- Security problems: use the private report in the **Security** tab (see [SECURITY.md](SECURITY.md)), not a public issue.

## Working on an issue
- **Do not ask to be assigned.** Issues are not assigned on request. A comment such as "I'd like to work on this, please assign me" gets no reply on its own.
- Work on an issue only when its cause is known and written in the thread, or when you bring the cause with your PR. Issues marked as still under investigation (no confirmed cause, or waiting for logs from the reporter) are not open for fixes yet.
- If you want to help with an investigation, comment with what you found: file and line references, a reproduction, or logs. That is welcome without any assignment.
- Prefer one small, focused pull request per issue. Say in the PR which issue it closes and how you verified it.

## Pull requests
- Open them against `main`. CI runs the tests and builds on every pull request.
- Before you open one: `bun run typecheck`, `bun run test` (a few tests fail on Windows only: the edge TTS network tests, 0600 file modes, tar and git in the sandbox, the source watcher) and, if you changed the client, `bun run build:client`.
- A new text in the shell's UI (`client/`) goes into all 14 files in `client/src/i18n/` (`en.ts` with an empty value), or the i18n test fails.
- Do not commit a `bun.lock` that `bun install` only rewrote. A change to `package.json` dependencies commits the lock it produced.
- Pull requests that touch the sandbox, the app bridge, credentials, the network allowlist or the builder are read line by line and take longer. Keep them small and explain the threat model of the change.
- Nothing is merged automatically. Expect questions and requests for changes.

## Code and commits
- Code, comments, commit messages and docs are in English. Short comments, in the style of the surrounding code.
- Commit style: `area: what changed, in plain words`, then a body saying why.
- Roleplay (the app in `data/users/<name>/apps/roleplay`) lives in its own repository, [MolfarWav/Molfar.Vertep-Roleplay](https://github.com/MolfarWav/Molfar.Vertep-Roleplay). Issues for both go here; changes to the app go there.

## License
The project is AGPL-3.0-only. By sending a pull request you agree that your change is released under it.
