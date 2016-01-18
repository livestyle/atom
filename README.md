# LiveStyle plugin for Atom

*Currently in beta and may contain bugs. Makes excessive console logging, it can be disabled in package settings.*

[LiveStyle](http://livestyle.io) is a real-time bi-directional edit tool for CSS, LESS and SCSS. [Read about LiveStyle project](http://livestyle.io/docs/) before using this plugin.

## Installation

This plugin can be installed as regular Atom package:

1. In Atom, go to `Preferences > Install`.
2. Search for `livestyle-atom` plugin and install it.

Or you can install it via `apm`:

`apm install livestyle-atom`

## Usage

This plugin doesn’t require any special setup: simply start Atom and Google Chrome and you are ready for real-time editing.

When creating a new, unsaved files, make sure you set document syntax to either `CSS`, `LESS` or `SCSS`, otherwise this document won’t appear in LiveStyle popup in Chrome.

## Setting global dependencies for preprocessors

As described in [Working with preprocessors](http://livestyle.io/docs/preprocessors/) section of LiveStyle docs, it is possible to provide global dependencies that will be used for parsing preprocessor files.

Currently, Atom doesn‘t provide any means to create project-level configs. In order to set global dependencies, you have to create `livestyle.json` (or `.livestyle.json`) file in your project root with content like this:

```json
{
    "globals": ["path/to/dep.scss", "libs/*.scss"]
}
```

* All paths must be relative to `livestyle.json`’s folder.
* You can set either direct file paths or use glob patterns, but remember that sometimes order of dependencies matters.
* Too much global dependencies will slow down LiveStyle, workflow with many dependencies wasn’t optimized yet. So keep only those dependencies you acttually use.
