/**
 * @fileoverview Rule to omit unnecessary parentheses and brackets.
 * @author Your Name
 */

"use strict"

const { isIdentifierName } = require("@eslint-community/eslint-utils") // Ensure installed

// Helper to check if a node is definitely parenthesized
// It checks the tokens directly before and after the node.
function isParenthesized(node, sourceCode) {
  const previousToken = sourceCode.getTokenBefore(node)
  const nextToken = sourceCode.getTokenAfter(node)

  return Boolean(previousToken && nextToken &&
    previousToken.value === "(" && previousToken.range[1] <= node.range[0] &&
    nextToken.value === ")" && nextToken.range[0] >= node.range[1])
}

// Basic precedence levels (simplified) - higher number means higher precedence
const PRECEDENCE = {
  // ... (Precedence levels as defined before - unchanged)
  Sequence: 0,
  Assignment: 1, // AssignmentExpression, YieldExpression, ArrowFunctionExpression
  Conditional: 2, // ConditionalExpression
  LogicalOR: 3, // LogicalExpression (||)
  LogicalAND: 4, // LogicalExpression (&&)
  BitwiseOR: 5,
  BitwiseXOR: 6,
  BitwiseAND: 7,
  Equality: 8, // ==, !=, ===, !==
  Relational: 9, // <, <=, >, >=, in, instanceof
  BitwiseShift: 10,
  Additive: 11, // +, -
  Multiplicative: 12, // *, /, %
  Exponentiation: 13, // ** (right-associative)
  Unary: 14, // typeof, void, delete, ++, --, +, -, !, ~
  Update: 15, // Postfix ++, --
  Call: 16, // CallExpression
  New: 17, // NewExpression (without args)
  Member: 18, // MemberExpression, new Foo()
  Primary: 19, // Literals, Identifiers, FunctionExpression, ClassExpression, ArrayExpression, ObjectExpression, (...)
}

function getOperatorPrecedence(node) {
  // ... (getOperatorPrecedence function as defined before - unchanged)
  switch (node.type) {
    case "SequenceExpression": return PRECEDENCE.Sequence
    case "ArrowFunctionExpression":
    case "AssignmentExpression":
    case "YieldExpression": return PRECEDENCE.Assignment
    case "ConditionalExpression": return PRECEDENCE.Conditional
    case "LogicalExpression":
      return node.operator === "||" ? PRECEDENCE.LogicalOR : PRECEDENCE.LogicalAND
    // ... Add more operators if needed for complex checks
    case "BinaryExpression":
      switch (node.operator) {
        case '|': return PRECEDENCE.BitwiseOR
        case '^': return PRECEDENCE.BitwiseXOR
        case '&': return PRECEDENCE.BitwiseAND
        case '==': case '!=': case '===': case '!==': return PRECEDENCE.Equality
        case '<': case '<=': case '>': case '>=': case 'in': case 'instanceof': return PRECEDENCE.Relational
        case '<<': case '>>': case '>>>': return PRECEDENCE.BitwiseShift
        case '+': case '-': return PRECEDENCE.Additive
        case '*': case '/': case '%': return PRECEDENCE.Multiplicative
        case '**': return PRECEDENCE.Exponentiation
        default: return PRECEDENCE.Primary // Fallback
      }
    case "UnaryExpression":
    case "AwaitExpression": // Await often behaves like Unary
      return PRECEDENCE.Unary
    case "UpdateExpression":
      return node.prefix ? PRECEDENCE.Unary : PRECEDENCE.Update
    case "CallExpression": return PRECEDENCE.Call
    case "NewExpression": return node.arguments.length > 0 ? PRECEDENCE.Member : PRECEDENCE.New
    case "MemberExpression": return PRECEDENCE.Member
    default: return PRECEDENCE.Primary
  }
}


module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Omit unnecessary parentheses and brackets",
      category: "Stylistic Issues",
      recommended: false,
      url: null,
    },
    fixable: "code", // *** Important: Set fixable to 'code' ***
    schema: [],
    messages: {
      unnecessaryParens: "Unnecessary parentheses.",
      useDotNotation: "Use dot notation instead of bracket notation."
    }
  },

  create(context) {
    const sourceCode = context.getSourceCode()

    // --- Part 1: Unnecessary Brackets (dot-notation check) ---
    function checkDotNotation(node) {
      if (node.computed &&
        node.property.type === 'Literal' &&
        typeof node.property.value === 'string' &&
        isIdentifierName(node.property.value) &&
        !node.optional
      ) {
        context.report({
          node: node.property,
          messageId: "useDotNotation",
          // *** FIXER FOR BRACKET NOTATION ***
          fix(fixer) {
            const propText = node.property.value
            const openingBracket = sourceCode.getTokenBefore(node.property)
            const closingBracket = sourceCode.getTokenAfter(node.property)

            // Safety check: Ensure tokens exist and are brackets
            if (!openingBracket || openingBracket.value !== '[' || !closingBracket || closingBracket.value !== ']') {
              console.warn("Cannot fix dot-notation: Brackets not found correctly.")
              return null // Abort fix
            }

            // Safety check: Avoid fixing if comments are inside brackets
            const textBetweenObjectAndBracket = sourceCode.text.slice(node.object.range[1], openingBracket.range[0])
            const textBetweenPropertyAndBracket = sourceCode.text.slice(node.property.range[1], closingBracket.range[0])

            if (textBetweenObjectAndBracket.trim() !== '' || textBetweenPropertyAndBracket.trim() !== '') {
              console.warn("Cannot fix dot-notation: Comments detected within brackets.")
              return null // Abort fix due to comments
            }

            // Replace `['prop']` with `.prop`
            return fixer.replaceTextRange(
              [openingBracket.range[0], closingBracket.range[1]],
              `.${propText}`
            )
          }
          // *** END FIXER ***
        })
      }
    }

    // --- Part 2: Unnecessary Parentheses ---
    function checkUnnecessaryParens(node) {
      // Check only if the node itself is directly parenthesized
      if (!node || !isParenthesized(node, sourceCode)) { // Added !node check for safety
        return
      }

      const parent = node.parent
      const tokenBefore = sourceCode.getTokenBefore(node)
      const tokenAfter = sourceCode.getTokenAfter(node)

      // Ensure tokens are valid before proceeding (extra safety)
      if (!tokenBefore || !tokenAfter) {
        return
      }

      // Generic reporter function to avoid repetition
      const reportAndFixUnnecessaryParens = (reportedNode) => {
        context.report({
          node: reportedNode, // Report attached to the inner expression usually
          loc: { start: tokenBefore.loc.start, end: tokenAfter.loc.end }, // Highlight parens
          messageId: "unnecessaryParens",
          // *** FIXER FOR PARENTHESES ***
          fix: (fixer) => {
            // We need to remove the opening and closing parenthesis tokens
            return [ // Return an array of fixes
              fixer.remove(tokenBefore),
              fixer.remove(tokenAfter)
            ]
          }
          // *** END FIXER ***
        })
      }


      // Rule 1: Avoid ((expression)) -> (expression)
      if (parent && isParenthesized(parent, sourceCode)) {
        // Check if the parent's parens directly wrap our parens
        const parentTokenBefore = sourceCode.getTokenBefore(parent)
        const parentTokenAfter = sourceCode.getTokenAfter(parent)
        if (parentTokenBefore && parentTokenAfter &&
          parentTokenBefore.range[0] === tokenBefore.range[0] - 1 &&
          parentTokenAfter.range[1] === tokenAfter.range[1] + 1) {
          reportAndFixUnnecessaryParens(node)
          return // Handled
        }
      }


      // Rule 2: Parens around Literals, Identifiers in simple contexts
      if (node.type === 'Literal' || node.type === 'Identifier') {
        if (parent && (
          (parent.type === 'VariableDeclarator' && parent.init === node) ||
          (parent.type === 'ReturnStatement' && parent.argument === node) ||
          (parent.type === 'ExpressionStatement' && parent.expression === node) ||
          (parent.type === 'ArrayExpression' && parent.elements.includes(node)) ||
          (parent.type === 'Property' && parent.value === node && !parent.method && !parent.shorthand) // Avoid ({ prop }) shorthand confusion
        )) {
          reportAndFixUnnecessaryParens(node)
          return
        }
      }

      // Rule 3: Parens around AwaitExpression / YieldExpression (if precedence allows)
      if (node.type === 'AwaitExpression' || node.type === 'YieldExpression') {
        if (parent && (
          parent.type === 'ExpressionStatement' ||
          parent.type === 'VariableDeclarator' ||
          parent.type === 'ReturnStatement' ||
          (parent.type === 'AssignmentExpression' && parent.right === node)
        )) {
          reportAndFixUnnecessaryParens(node)
          return
        }
        // Add more sophisticated precedence checks if needed here
      }

      // Rule 4: Parens around Arrow Function Body (unless it's an object literal)
      if (parent && parent.type === 'ArrowFunctionExpression' && parent.body === node) {
        if (node.type !== 'ObjectExpression') {
          reportAndFixUnnecessaryParens(node)
          return
        }
      }

      // --- Add more rules/conditions as needed ---
      // Example: Check BinaryExpression based on precedence (simplified)
      // if (node.type === 'BinaryExpression' && parent && parent.type === 'BinaryExpression') {
      //     const nodePrecedence = getOperatorPrecedence(node)
      //     const parentPrecedence = getOperatorPrecedence(parent)
      //     // This needs much more complex logic regarding associativity and
      //     // whether 'node' is the left or right operand of 'parent'.
      //     // Simplified example: If node precedence is higher or equal, maybe remove.
      //     if (nodePrecedence >= parentPrecedence) {
      //         // VERY CAREFUL: This might break code if not done right!
      //         // reportAndFixUnnecessaryParens(node)
      //         // return
      //     }
      // }
    }

    // --- AST Traversal ---
    // Using specific listeners is generally more efficient
    return {
      // Listener for Bracket Notation Check
      MemberExpression: checkDotNotation,

      // Listeners for Parentheses Checks
      VariableDeclarator(node) { checkUnnecessaryParens(node.init) },
      ExpressionStatement(node) { checkUnnecessaryParens(node.expression) },
      ReturnStatement(node) { checkUnnecessaryParens(node.argument) },
      ArrowFunctionExpression(node) { checkUnnecessaryParens(node.body) },
      BinaryExpression(node) {
        checkUnnecessaryParens(node.left)
        checkUnnecessaryParens(node.right)
      },
      LogicalExpression(node) {
        checkUnnecessaryParens(node.left)
        checkUnnecessaryParens(node.right)
      },
      UnaryExpression(node) { checkUnnecessaryParens(node.argument) },
      AwaitExpression(node) { checkUnnecessaryParens(node.argument) },
      YieldExpression(node) { checkUnnecessaryParens(node.argument) },
      ConditionalExpression(node) {
        checkUnnecessaryParens(node.test)
        checkUnnecessaryParens(node.consequent)
        checkUnnecessaryParens(node.alternate)
      },
      CallExpression(node) {
        node.arguments.forEach(checkUnnecessaryParens)
        checkUnnecessaryParens(node.callee)
      },
      NewExpression(node) {
        node.arguments.forEach(checkUnnecessaryParens)
        checkUnnecessaryParens(node.callee)
      },
      ArrayExpression(node) { node.elements.forEach(arg => checkUnnecessaryParens(arg)) }, // Check each element
      Property(node) { checkUnnecessaryParens(node.value) },

      // Add more specific listeners if needed for better performance/accuracy
    }
  }
}
