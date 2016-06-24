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
* Too much global dependencies will slow down LiveStyle, workflow with many dependencies wasn’t optimized yet. So keep only those dependencies you actually use.

# LiveStyle Analyzer

LiveStyle Analyzer is an experimental UI that displays various code hints right in LESS and SCSS editors so you can have better overview of how compiled CSS will look like.

By default, *computed value* and *resolved selector* hints are displayed automatically when you move caret inside value or selector respectively. This can be disabled in package preferences. All the other hints (including *computed value* and *resolved selector*) can be toggled with `livestyle:show-widget` command.

**Tip:** bind `livestyle:show-widget` action to a [keyboard shortcut](http://flight-manual.atom.io/using-atom/sections/basic-customization/#_customizing_keybindings) of your choice to quickly toggle code hints.

> LiveStyle Analyzer works for currently opened file only: it doesn’t read data from `@import` or global stylesheets yet. But you can help to make it happen! Stay tuned for updates at [@emmetio](https://twitter.com/emmetio)

## Computed value

Displays computed result of property value expressions, if possible. Also displays color previews even for static values. Hint is displayed automatically when you move caret inside property value, but you can disable it in package preferences and display manually with `livestyle:show-widget` command.

![Computed Value example](https://raw.githubusercontent.com/livestyle/atom/gh-pages/images/computed-value.gif)

## Resolved selector

Displays resolved CSS selector for nested sections. Hint is displayed automatically when you move caret inside selector, but you can disable it in package preferences and display manually with `livestyle:show-widget` command.

![Resolved selector example](https://raw.githubusercontent.com/livestyle/atom/gh-pages/images/selector.gif)

## Variables and mixin completions

Provides variables (with computed values, if possible) and mixin completions for standard Atom’s autocomplete. LiveStyle tries to be smart here: it displays variables (and their values) available exactly for current scope, not all variables from current file.

![Completions](https://raw.githubusercontent.com/livestyle/atom/gh-pages/images/completions.gif)

## Mixin output

A little triangle near mixin call means LiveStyle was able to find matched mixin definitions. Hold down Cmd (Mac) or Ctrl key and click on mixin call (or call `livestyle:show-widget` action) to display computed output. Output is updated in real-time when you edit mixin call arguments.

![Mixin output example](https://raw.githubusercontent.com/livestyle/atom/gh-pages/images/mixin%20call.gif)

## Suggested variables

For static values (e.g. values without expressions) LiveStyle tries to find variables with the same or similar (for colors) values. If such variables found, displays rounded underline under property value. Hold down Cmd (Mac) or Ctrl key and click on property value (or call `livestyle:show-widget` action) to display suggested variables. You may then click on variable to replace value with it or hit Esc key to close popup.

![Suggested variables example](https://raw.githubusercontent.com/livestyle/atom/gh-pages/images/suggested.gif)

## Quick outline

Run `livestyle:show-outline` command to display current stylesheet tree and its resolved CSS. Useful for finding source of generated CSS selectors: open quick outline, switch to Result tree (can be done with Tab key as well), find required CSS node and click on it to go to LESS/SCSS source.

![Suggested variables example](https://raw.githubusercontent.com/livestyle/atom/gh-pages/images/outline.gif)

### How it works

LiveStyle uses its own implementations of LESS and SCSS preprocessors, written in pure JavaScript. Unlike official preprocessors implementations with sourcemaps, LiveStyle provides proper source-to-result mappings, variable and mixin scopes, error recovery and partial compilation.

LiveStyle produces two trees for given LESS/SCSS source code: one with source and another with CSS result. All CSS result nodes holds variables and mixins scope and references to source tree node that produced it. These trees then passed to Analyzer module which extracts required data from them and adds as [markers](https://atom.io/docs/api/v1.8.0/TextEditorMarker) into text editor (these markers contains `livestyle` property). Authors can create custom plugins that read these marker’s data and provide custom UI, hints and so on.

### Ideas?

With LiveStyle engine, it’s possible to use static analysis of preprocessor stylesheets, do code refactoring and much, much more. If you have any suggestions how LESS and SCSS coding experiences can be improved, feel free to [create a new issue](https://github.com/livestyle/atom/issues) with your suggestions.
