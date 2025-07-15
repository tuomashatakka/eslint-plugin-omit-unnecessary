import { RuleTester } from "eslint"
import rule from "../lib/rules/omit-unnecessary-parens-brackets.mjs"

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: "module", ecmaFeatures: { jsx: true } },
})

ruleTester.run("omit-unnecessary-parens-brackets", rule, {
  valid: [
    // No parens
    { code: "function Foo() { return <div></div> }" },
    { code: "function Bar() { return <Fragment></Fragment> }" },
    { code: "const x = 1" },
    { code: "const x = (a + b) * c" },
    // Parens needed for object literal
    { code: "const fn = () => ({ a: 1 })" },
    // Dot notation: already correct
    { code: "obj.foo = 1" },
    { code: "obj['not-valid'] = 2" }, // not a valid identifier
    // Braces needed for multiple statements
    { code: "if (x) { do1(); do2(); }" },
    { code: "for (let i = 0; i < 10; i++) { do1(); do2(); }" },
    // Braces needed for declaration
    { code: "if (x) { const y = 2 }" },
    // Arrow function with object literal
    { code: "const f = () => ({ a: 1 })" },
    // Dangling else
    { code: "if (a) if (b) foo(); else bar();" },
  ],
  invalid: [
    // Parens/JSX
    {
      code: "function Foo() { return (\n  <div></div>\n) }",
      output: "function Foo() { return <div></div> }",
      errors: [{ messageId: "unnecessaryParens" }],
    },
    {
      code: "function Bar() { return (\n<Fragment></Fragment>\n) }",
      output: "function Bar() { return <Fragment></Fragment> }",
      errors: [{ messageId: "unnecessaryParens" }],
    },
    {
      code: "function Foo() { return ( <div></div> ) }",
      output: "function Foo() { return <div></div> }",
      errors: [{ messageId: "unnecessaryParens" }],
    },
    {
      code: "const x = (1)",
      output: "const x = 1",
      errors: [{ messageId: "unnecessaryParens" }],
    },
    // Dot notation
    {
      code: "obj['foo'] = 1",
      output: "obj.foo = 1",
      errors: [{ messageId: "useDotNotation" }],
    },
    // Unnecessary braces in if/else
  // {
  //   code: "if (true) { do(); } else { dontDo(); }",
  //   output: "if (true) do();\nelse dontDo();",
  //   errors: [
  //     { messageId: "unnecessaryBraces" },
  //     { messageId: "unnecessaryBraces" }
  //   ],
  // },
    // Unnecessary braces in for
    {
      code: "for (let i = 0; i < 100; i++) { doSomething() }",
      output: "for (let i = 0; i < 100; i++) doSomething()",
      errors: [{ messageId: "unnecessaryBraces" }],
    },
    // Unnecessary braces in arrow function
    {
      code: "const f = () => { return 1 }",
      output: "const f = () => 1",
      errors: [{ messageId: "unnecessaryBraces" }],
    },
    // Unnecessary braces in arrow function with parens for object
    {
      code: "const f = () => { return { a: 1 } }",
      output: "const f = () => ({ a: 1 })",
      errors: [{ messageId: "unnecessaryBraces" }],
    },
  ],
})
