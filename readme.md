

# eslint-plugin-omit-unnecessary

ESLint plugin containing rules to help omit unnecessary syntax like parentheses and brackets.



## To Use This Plugin:

1.    Run `npm install` or `yarn` to install dependencies (eslint, potentially requireindex, eslint-utils).

2.    In the project where you want to *use* this plugin, install it:
      `npm install @tuomashatakka/eslint-plugin-omit-unnecessary -D`.

69.   Configure your project's `.eslintrc.js` or `eslint.config.mjs` as shown in the README's Usage section.

420.  Run ESLint on your project.



### Dev pre-steps:
-  Save the files in the structure shown above.
-  Navigate to the `eslint-plugin-omit-unnecessary` directory in your terminal.

## Supported Rules
* `omit-unnecessary/omit-unnecessary-parens-brackets`: Detects and suggests removing unnecessary parentheses around expressions and unnecessary bracket notation for property access.

## Installation
You'll first need to install [ESLint](https://eslint.org/):

```sh
npm install eslint --save-dev
bun install eslint --save-dev
pnpm install eslint --save-dev
# Pls don't: yarn add eslint --dev
```

Next, install eslint-plugin-omit-unnecessary:

```sh
npm install eslint-plugin-omit-unnecessary --save-dev
bun add eslint-plugin-omit-unnecessary --dev
pnpm add eslint-plugin-omit-unnecessary --dev
# Pls don't: yarn add eslint-plugin-omit-unnecessary --dev
```

If you haven't already, install the required utility (peer dependency):

```sh
npm \ # or any else c:
  install @eslint-community/eslint-utils --save-dev
```

## Usage

Add omit-unnecessary to the plugins section of your .eslintrc configuration file. You can omit the eslint-plugin- prefix:

```.eslintrc.json
{
  "plugins": [
    "omit-unnecessary"
  ]
}
```

Then configure the rules you want to use under the rules section.

```.eslintrc.json
{
  "rules": {
    "omit-unnecessary/omit-unnecessary-parens-brackets": "warn"
  }
}
```

### Example Configuration:

```.eslintrc.json
{
  "extends": "eslint:recommended",
  "plugins": [ "omit-unnecessary" ],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "env": {
    "es6": true,
    "node": true
  },
  "rules": {
    "omit-unnecessary/omit-unnecessary-parens-brackets": "warn",
  }
}
```

## Rule Details

### `omit-unnecessary/omit-unnecessary-parens-brackets`

This rule aims to enforce code conciseness by removing syntax elements that don't change the code's meaning.

#### Examples of incorrect code for this rule:

```mjs
// Unnecessary parentheses
const x       = (5)
const y       = ('hello')
const fn      = (function() {})
const result  = (await myPromise)
const arrow   = x => (x * 2)
const doubled = ((a + b)) // Double parens

// Unnecessary brackets
const value   = myObj["prop"]
const name    = data["userName"]
```

#### Examples of correct code for this rule:

```mjs
// Correct parentheses usage (or where rule doesn't apply)
const x       = 5
const y       = 'hello'
const fn      = function() {}
const result  = await myPromise
const arrow   = x => x * 2
const doubled = (a + b) // Single needed parens are okay if required by precedence/context

// Correct bracket/dot notation usage
const value   = myObj.prop
const name    = data.userName
const item    = arr[index] // Variable index requires brackets
const keyword = obj["for"] // Keyword requires brackets
const special = obj["with-hyphen"] // Non-identifier requires brackets

## Limitations:

The parenthesis checking is simplified and focuses on common cases. It does not perform the full operator precedence analysis found in ESLint's core no-extra-parens rule. You might prefer using no-extra-parens if you need exhaustive checks.

This rule might conflict with stylistic choices enforced by formatters like Prettier (thank god</3>).

## Development

TBA ;)
