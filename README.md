# Md2md [![Weekly downloads](https://img.shields.io/npm/dw/md2md.svg)](https://github.com/talentAN/md2md) [![Yearly downloads](https://img.shields.io/npm/dy/md2md.svg)](https://github.com/talentAN/md2md)

## Why

Auto generater target markdowns with use of easy template and variable. Good to use with [Gatsby](https://www.gatsbyjs.org/) or other markdown to html generater.
![Demo](./Assets/demo.gif)

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

try [Demo Repo](https://github.com/talentAN/md2md-demo) directely

## Main Concepts

### Variable

Defined in variables.json, can be used in markdownfile, fragments and templates.

```javascript
// variabeFile (doc_from/en/variables.json)
{"name":"md2md"}

// origin docFile (doc_from/en/test.md):
### This is {{var.name}};

// turn to target(doc_to/en/test.md)
### This is md2md;
```

### Fragment

Defined in fragment directory. Fragment let you split the markdown into independent, reusable pieces, and think about each piece in isolation. you can use fragment in fragment.

```javascript
// root variableFile (doc_from/en/variables.json)
{
  "auth":{
    "name":"talentAN",
    "email":"adam_an02@163.com"
    }
}

// fragment file (doc_from/en/fragment/repo_info.md)
RepoName: {{var.name}}
github: {{var.github}}
Auth: {{var.auth.name}}
Email: {{var.auth.email}}

// child variableFile (doc_from/en/md2md/variables.json)
{
  "name":"md2md",
  "github":"https://github.com/talentAN/md2md"
}

// origin docFile  (doc_from/en/md2md/index.md)
{{fragment/repo_info.md}}

## belows are custom info
## !@#$%^&*()......

// turn to target (doc_to/en/md2md/index.md)
RepoName: md2md
github: https://github.com/talentAN/md2md
Auth: talentAN
Email: adam_an02@163.com
]
## belows are custom info
## !@#$%^&*()......
```

### Template

Defined in template directory. Template is used to generate markdown file from json file directely;

```javascript
// templateFile (doc_from/en/template/introduce.md)
the name is : {{var.name}};
the keyWords is : {{var.keyWords}}
num of weeklyDownoad : {{var.weeklyDownoad}}

// origin jsonFile  (doc_from/en/md2md/introduction.json)
{
  "useTemplate":true,
  "path":"template/introduce.md",
  "var":{
    "name":"md2md",
    "keyWords":["markdown", "converter", "easy use"],
    "weeklyDownoad":300
}}

// turn to target (doc_to/en/md2md/introduction.md)
the name is : md2md;
the keyWords is : ["markdown", "converter", "easy use"]
num of weeklyDownoad : 300
```

## Catalog

```bash
├── root_dir
│   ├── doc_from
│   │   ├── en
│   │   ├── zh-CN
│   │   │── ......  
│   ├── doc_to
│   ├── m2m.config.js
```

- doc_from: where you edit your origin doc files in. it's First-level subdirectory must be language;
- doc_to: the final doc file you need will be here; the level of subdirectory will be same as doc_from. you don't need to edit this directory.
- m2m.config.js : config to set for markdown transfer. use the default is just fine ~

```bash
├── en
│   ├── fragment
│   ├── template
│   ├── variables.json
│   ├── [doc directories]
│   ├── ...
│   ├── [doc files]
│   ├── ...
```

## API for F2E Developers

```javascript
const {
  setDirWatcher,
  setFileWatcher,
  clearWatcher,
  markdownToString,
  templateToString,
} = require("md2md");

// watch directory configed in m2m.config.js.
const watcher_dir = setDirWatcher();

// watch special file
const watcher_file = setFileWatcher(absolute_path);

// clearWatcher
clearWatcher(watcher_file);

// get transfered markdownFile from markdown
const target_md = markdownToString(path_from);

// get transfered markdownFile from json file use template
const target_json = templateToString(path_from);
```

## FAQ

## Forward

## Change Log

### 20200525 v0.2.10

- Add api templateToString
- Add parse variables in markdown file. use variables in key-value format.

```javascript
// origin docFile (doc_from/en/test.md):
---
name Tom
age 11
---
### This is {{var.name}}, his age is {{var.age}};

// target docFile (doc_from/en/test.md)
---
name Tom
age 11
---
### This is Tom, his age is 11;

```

- Add test cases
- bugfix parse fragment in fragment
