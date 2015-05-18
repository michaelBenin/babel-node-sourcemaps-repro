# Repro for issue with babel-node-sourcemaps

See: https://github.com/babel/babel/issues/1556

Install packages:

```
  npm install
  npm i -g babel
```

To Repro:

See the stack trace here:

    babel-node --stage 0 -- server/babel-node-repro

Compare to the stack trace here:

    babel server --source-maps inline --out-dir build; node build/sourcemaps_working;

