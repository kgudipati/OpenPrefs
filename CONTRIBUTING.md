# Contributing to OpenPrefs

Install the development dependencies with:

```sh
npm ci
```

Before opening a pull request, run the complete verification suite:

```sh
npm run verify
```

Pull requests must keep the runtime dependency count at zero. Development tooling belongs in `devDependencies`; adding a runtime dependency requires explicit approval.
