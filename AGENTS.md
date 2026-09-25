# QtBlocks Web Agent Routing

This repository owns the QtBlocks web UI, Blockly application behavior, static
export, examples, and product assets. Desktop Suite owns Electron integration,
the bundled-static server, launch orchestration, packaging, and tested Gitlink
pinning.

Although this checkout may be nested below Desktop Suite as a submodule, treat
it as an independent Git and agent context:

- run Graft, Graphify, and exact searches from this repository root;
- do not use the Desktop Suite graph as evidence for QtBlocks implementation;
- keep QtBlocks product behavior here and launcher behavior in Desktop Suite;
- build Graft with `--no-follow-submodules --no-follow-nested-repos`; and
- make a coherent QtBlocks commit before updating the Desktop Suite Gitlink.

For code questions, run `graft map` and then `graft ask "<question>" --source`.
Use `graft grep` for exhaustive indexed matches and `rg` for generated or
unindexed files. Use Graphify for documentation or mixed/non-code corpora, and
store its output in this repository's own `graphify-out/` directory.
