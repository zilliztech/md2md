# Markdown2Markdown [![Weekly downloads](https://img.shields.io/npm/dw/markdown2markdown.svg)](https://github.com/talentAN/markdown2markdown) [![Yearly downloads](https://img.shields.io/npm/dy/markdown2markdown.svg)](https://github.com/talentAN/markdown2markdown)

## Why

Auto generater target markdowns with use of easy template and variable. Good to use with [Gatsby](https://www.gatsbyjs.org/) or other markdown to html generater.

## Recommended For

- Product Documentation Engineer;
- Font-end developers who needs markdown transformer

## Features

- Target file auto generate when origin file change;
- Varible, custom fragments and templates are supported;
- Path of origin and target is configurable;
- Files or directories to ignore is configurable;
- Add custom transform rule is supported;
- <font size=3 color=#ff0000>Easy to use for Non-technical User </font>

## 5min Quick Start

try [Demo Repo](https://github.com/talentAN/markdown2markdown-demo) directely

## Examples

1. use variables;

```javascript
// origin(src/test.md):
### This is {{var.name}};

// variableFile(src/variables.json)
{"name":"Tom"}

// will turn to target(site/test.md)
### This is Tom;
```

2. use fragment and variables;

```javascript
// origin(src/test.md):
### This is {{var.name}};
{{fragment/card.md}}
{{fragment/warn.md}}

// variableFile (src/variables.json)
{"name":"Tom", "info":{ "phone":"1234567", "email":"xxx@gmail.com"}}

// fragmentFile (src/fragment/card.json)
###### name:{{var.name}}
###### email:{{var.email}}

// fragmentFile (src/fragment/warn.json)
###### the info should keep confidential

// will turn to target(site/test.md)
### This is Tom ;
###### name:Tom
###### email:xxx@gmail.com
###### the info should keep confidential
```

3. use multilayer variables

```javascript
// origin(src/user/info.md):
### This is {{var.name}};
{{fragment/card.md}}
{{fragment/warn.md}}

// variableFile (src/variables.json)
{"name":"Tom", "info":{"phone":"1234567", "email":"xxx@gmail.com"}}

// variableFile (src/user/variables.json)
{"name":"Alex", "info":{"phone":"9876543"}}

// fragmentFile (src/fragment/card.json)
###### name:{{var.name}}
###### email:{{var.email}}

// fragmentFile (src/fragment/warn.json)
###### the info should keep confidential

// will turn to target(site/test.md)
### This is Alex;
###### name:Alex
###### email:xxx@gmail.com
###### the info should keep confidential
```

## API

```javascript
const {
  setDirWatcher,
  setFileWatcher,
  clearWatcher
} = require("markdown2markdown");

// watch directory configed in m2m.config.js.
const watcher_dir = setDirWatcher();

// watch special file
const watcher_file = setFileWatcher(absolute_path);

// clearWatcher
clearWatcher(watcher_file);
```

## FAQ

## Forward
