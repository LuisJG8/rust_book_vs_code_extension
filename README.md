# Rust Book Interactive Course

A local TypeScript VS Code extension that turns the Rust Book into an interactive course reader.

## Features

- Chapter-based reader for the numbered chapters of *The Rust Programming Language*.
- Copy buttons for every code block.
- Run buttons for terminal command blocks.
- Run buttons for Rust snippets that create a scratch Cargo project and execute `cargo run`.
- Ten coding exercises after each numbered chapter, excluding appendices.

## Local Development

```sh
pnpm run generate
pnpm run compile
pnpm test
```

The book generator uses `rustup doc --path --book`, so Rust and rustup must be installed locally.

To try the extension in VS Code, open this folder, run `pnpm run generate && pnpm run compile`, then launch an Extension Development Host with the `Run Extension` configuration or VS Code's extension debugging flow.
