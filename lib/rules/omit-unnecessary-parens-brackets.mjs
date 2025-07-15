/**
 * @fileoverview Rule to omit unnecessary parentheses, brackets, and braces
 * @author Your Name
 */

"use strict";
import { isValidDotNotationIdentifier, isDeclaration, isParenthesized } from '../utils.mjs'

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Omit unnecessary parentheses, brackets, and braces",
      category: "Stylistic Issues",
      recommended: false,
      url: null, // Optional URL to documentation page
    },
    fixable: "code",
    schema: [], // No options for this rule
    messages: {
      unnecessaryParens: "Unnecessary parentheses",
      useDotNotation: "Use dot notation instead of bracket notation",
      unnecessaryBraces: "Unnecessary curly braces",
    }
  },

  create(context) {
    const sourceCode = context.getSourceCode()
    // Basic parser config for comment checking in fixers
    const parserConfig = {
      ecmaVersion: context.parserOptions.ecmaVersion || 2020,
      sourceType: context.parserOptions.sourceType || 'module',
      loc: true,
      range: true,
      tokens: true,
      comment: true,
    }

    // --- Part 1: Unnecessary Brackets (dot-notation check) ---
    function checkDotNotation(node) {
      if (node.computed &&
        node.property.type === 'Literal' &&
        typeof node.property.value === 'string' &&
        isValidDotNotationIdentifier(node.property.value) &&
        !node.optional
      ) {
        context.report({
          node: node.property,
          messageId: "useDotNotation",
          fix(fixer) {
            const propText = node.property.value
            const openingBracket = sourceCode.getTokenBefore(node.property)
            const closingBracket = sourceCode.getTokenAfter(node.property)

            // Safety check: Ensure tokens exist and are brackets
            if (!openingBracket || openingBracket.value !== '[' || !closingBracket || closingBracket.value !== ']') {
              console.warn("Cannot fix dot-notation: Brackets not found correctly")
              return null // Abort fix
            }

            // Safety check: Avoid fixing if comments are inside brackets
            const textBetweenObjectAndBracket = sourceCode.text.slice(node.object.range[1], openingBracket.range[0])
            const textBetweenPropertyAndBracket = sourceCode.text.slice(node.property.range[1], closingBracket.range[0])

            if (textBetweenObjectAndBracket.trim() !== '' || textBetweenPropertyAndBracket.trim() !== '') {
              console.warn("Cannot fix dot-notation: Comments detected within brackets")
              return null // Abort fix due to comments
            }

            // Replace `['prop']` with `.prop`
            return fixer.replaceTextRange(
              [openingBracket.range[0], closingBracket.range[1]],
              `.${propText}`
            )
          }
        })
      }
    }

    // --- Part 2: Unnecessary Parentheses ---
    function checkUnnecessaryParens(node) {
      // Check only if the node itself is directly parenthesized
      if (!node || !isParenthesized(node, sourceCode)) {
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
          fix: (fixer) => {
            // We need to remove the opening and closing parenthesis tokens
            return [ // Return an array of fixes
              fixer.remove(tokenBefore),
              fixer.remove(tokenAfter)
            ]
          }
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

      // Rule 5: Parens around JSXElement or JSXFragment in ReturnStatement
      if (parent && parent.type === 'ReturnStatement' && parent.argument === node &&
          (node.type === 'JSXElement' || node.type === 'JSXFragment')) {
        context.report({
          node,
          loc: { start: tokenBefore.loc.start, end: tokenAfter.loc.end },
          messageId: "unnecessaryParens",
          fix: (fixer) => {
            const returnToken = sourceCode.getFirstToken(parent); // 'return'
            return [
              // Replace from after 'return' to start of JSX node with a single space (removes whitespace and opening paren)
              fixer.replaceTextRange([
                returnToken.range[1],
                node.range[0]
              ], ' '),
              // Remove from end of JSX node to end of closing paren (removes whitespace and closing paren)
              fixer.removeRange([
                node.range[1],
                tokenAfter.range[1]
              ])
            ];
          }
        });
        return;
      }

      // --- Add more rules/conditions as needed ---
      // Example: Check BinaryExpression based on precedence (simplified)
      // if (node.type === 'BinaryExpression' && parent && parent.type === 'BinaryExpression') { ... }
    }


    // --- Part 3: Unnecessary Braces ---
    function checkUnnecessaryBraces(blockStatement, controllingNode) {
      if (!blockStatement || blockStatement.type !== 'BlockStatement') {
        return // Not a block statement
      }

      // Condition 1: Block must contain exactly one statement
      if (blockStatement.body.length !== 1) {
        return
      }

      const singleStatement = blockStatement.body[0]

      // Condition 2: The single statement cannot be a Declaration
      if (isDeclaration(singleStatement)) {
        return
      }

      // Condition 3: Avoid "dangling else" scenario
      if (controllingNode && controllingNode.type === 'IfStatement' &&
        !controllingNode.alternate && // no 'else' block
        singleStatement.type === 'IfStatement') {
        return
      }

      // Condition 4: The single statement cannot be an empty block itself
      if (singleStatement.type === 'BlockStatement') {
        return
      }

      // If all checks pass, report unnecessary braces
      context.report({
        node: blockStatement, // Report on the block itself
        messageId: "unnecessaryBraces",
        fix(fixer) {
          const firstToken = sourceCode.getFirstToken(blockStatement) // Should be '{'
          const lastToken = sourceCode.getLastToken(blockStatement)   // Should be '}'
          const innerText = sourceCode.getText(singleStatement)

          // Basic check for safety
          if (!firstToken || firstToken.value !== '{' || !lastToken || lastToken.value !== '}') {
            console.warn("Cannot fix braces: Block tokens not found correctly")
            return null
          }

          // New comment check: Ensure no actual code tokens exist between braces and the single statement.
          // It's safe to remove braces if the space between the opening brace and the statement,
          // and the space between the statement and the closing brace, contain ONLY comments or whitespace.
          const firstStatementToken = sourceCode.getFirstToken(singleStatement);
          const lastStatementToken = sourceCode.getLastToken(singleStatement);

          let hasCodeBeforeStatement = false;
          // Check for code tokens before the single statement (after the opening brace)
          if (firstStatementToken && firstToken.range[1] < firstStatementToken.range[0]) {
            const tokensBefore = sourceCode.getTokensBetween(
              firstToken,
              firstStatementToken,
              { includeComments: false } // We only care about actual code tokens
            );
            if (tokensBefore.length > 0) {
              hasCodeBeforeStatement = true;
            }
          }

          let hasCodeAfterStatement = false;
          // Check for code tokens after the single statement (before the closing brace)
          if (lastStatementToken && lastToken.range[1] < lastStatementToken.range[0]) {
            const tokensAfter = sourceCode.getTokensBetween(
              lastStatementToken,
              lastToken,
              { includeComments: false } // We only care about actual code tokens
            );
            if (tokensAfter.length > 0) {
              hasCodeAfterStatement = true;
            }
          }

          if (hasCodeBeforeStatement || hasCodeAfterStatement) {
            console.warn("Cannot fix braces: Non-comment tokens detected between braces and the single statement.");
            return null; // Abort fix
          }
          // If we reach here, it means any content between the braces and the single statement
          // (if any) is purely comments or whitespace. Removing the braces is intended.
          // Comments inside the braces but outside the singleStatement's own text will be removed
          // along with the braces, which is the desired behavior for "unnecessary braces".


          // Replace the block (including braces) with the inner statement's text
          return fixer.replaceTextRange(blockStatement.range, innerText)
        }
      })
    }

    // --- Part 4: Unnecessary Braces for Arrow Functions ---
    function checkArrowFunctionBraces(node) {
      if (!node.body || node.body.type !== 'BlockStatement') {
        return // Body is already an expression
      }

      const blockBody = node.body
      // Condition 1: Block must contain exactly one statement
      if (blockBody.body.length !== 1) {
        return
      }

      const singleStatement = blockBody.body[0]
      // Condition 2: Single statement must be a ReturnStatement
      if (singleStatement.type !== 'ReturnStatement') {
        return
      }

      // Condition 3: Return must have an argument
      if (!singleStatement.argument) {
        return
      }

      const returnedExpression = singleStatement.argument

      // Condition 4: If returning an object literal, it needs parentheses when braces are removed
      const needsParens = returnedExpression.type === 'ObjectExpression'

      context.report({
        node: blockBody,
        messageId: "unnecessaryBraces",
        fix(fixer) {
          const arrowToken = sourceCode.getTokenBefore(blockBody) // Find '=>'
          if (!arrowToken || arrowToken.value !== '=>') {
            console.warn("Cannot fix arrow braces: Arrow token not found")
            return null // Safety check
          }

          const firstBlockToken = sourceCode.getFirstToken(blockBody) // '{'
          const lastBlockToken = sourceCode.getLastToken(blockBody) // '}'
          if (!firstBlockToken || firstBlockToken.value !== '{' || !lastBlockToken || lastBlockToken.value !== '}') {
            console.warn("Cannot fix arrow braces: Block tokens not found correctly")
            return null
          }

          let expressionText = sourceCode.getText(returnedExpression)

          // Check for comments between '=>' and '{'
          const textBeforeBlock = sourceCode.text.slice(arrowToken.range[1], firstBlockToken.range[0])
          if (textBeforeBlock.trim()) {
            console.warn("Cannot fix arrow braces: Comment detected between => and {")
            return null
          }

          // Check for comments within the block but outside the return statement
          const returnToken = sourceCode.getFirstToken(singleStatement) // 'return' token
          const textBeforeReturn = sourceCode.text.slice(firstBlockToken.range[1], returnToken.range[0])
          const textAfterReturn = sourceCode.text.slice(returnToken.range[1], returnedExpression.range[0])
          const textAfterExpression = sourceCode.text.slice(returnedExpression.range[1], lastBlockToken.range[0])

          if (textBeforeReturn.trim() || textAfterReturn.trim() || textAfterExpression.trim()) {
            console.warn("Cannot fix arrow braces: Comment detected within block body around return statement")
            return null
          }

          // Add parens if needed for object literal, unless already present
          if (needsParens) {
            if (!isParenthesized(returnedExpression, sourceCode)) {
              expressionText = `(${expressionText})`
            }
          }

          // Replace the block body `{ return expr }` with ` expr` or ` (expr)`
          // Add a space before the expression if not adding parens, then trim to avoid double spaces
          let replacementText = (needsParens || expressionText.startsWith('(') ? '' : ' ') + expressionText
          replacementText = replacementText.replace(/\s+/g, ' ')
          return fixer.replaceTextRange(blockBody.range, replacementText.trim())
        }
      })
    }


    // --- AST Traversal ---
    return {
      // Listener for Bracket Notation Check
      MemberExpression: checkDotNotation,

      // Listeners for Parentheses Checks (more targeted)
      VariableDeclarator(node) { checkUnnecessaryParens(node.init) },
      ExpressionStatement(node) { checkUnnecessaryParens(node.expression) },
      ReturnStatement(node) { checkUnnecessaryParens(node.argument) },
      // ArrowFunctionExpression handled below for braces AND parens check on body
      BinaryExpression(node) { checkUnnecessaryParens(node.left); checkUnnecessaryParens(node.right) },
      LogicalExpression(node) { checkUnnecessaryParens(node.left); checkUnnecessaryParens(node.right) },
      UnaryExpression(node) { checkUnnecessaryParens(node.argument) },
      AwaitExpression(node) { checkUnnecessaryParens(node.argument) },
      YieldExpression(node) { checkUnnecessaryParens(node.argument) },
      ConditionalExpression(node) {
        checkUnnecessaryParens(node.test)
        checkUnnecessaryParens(node.consequent)
        checkUnnecessaryParens(node.alternate)
      },
      CallExpression(node) {
        node.arguments.forEach(arg => checkUnnecessaryParens(arg))
        checkUnnecessaryParens(node.callee)
      },
      NewExpression(node) {
        node.arguments.forEach(arg => checkUnnecessaryParens(arg))
        checkUnnecessaryParens(node.callee)
      },
      ArrayExpression(node) { node.elements.forEach(arg => checkUnnecessaryParens(arg)) },
      Property(node) { checkUnnecessaryParens(node.value) },

      // Listeners for Brace Checks
      IfStatement(node) {
        checkUnnecessaryBraces(node.consequent, node) // Pass node itself for dangling-else check
        // Check else if it's not another IfStatement (else-if chain)
        if (node.alternate && node.alternate.type !== 'IfStatement') {
          checkUnnecessaryBraces(node.alternate, node)
        }
      },
      // Loops
      ForStatement(node) { checkUnnecessaryBraces(node.body, node) },
      ForInStatement(node) { checkUnnecessaryBraces(node.body, node) },
      ForOfStatement(node) { checkUnnecessaryBraces(node.body, node) },
      WhileStatement(node) { checkUnnecessaryBraces(node.body, node) },
      DoWhileStatement(node) { checkUnnecessaryBraces(node.body, node) },
      // WithStatement(node) { checkUnnecessaryBraces(node.body, node) } // Optional

      // Arrow Functions (check both parens on body and braces)
      ArrowFunctionExpression(node) {
        checkUnnecessaryParens(node.body) // Check if body expression has unnecessary parens
        checkArrowFunctionBraces(node) // Check if block body braces are unnecessary
      },
    }
  }
}
