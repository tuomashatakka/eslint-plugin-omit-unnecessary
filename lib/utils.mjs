import * as espree from "espree"

// --- Helper Functions ---

const RESERVED_WORDS = new Set([
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
  'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package',
  'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw',
  'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
])

/**
 * Checks if a string is a valid identifier name for dot notation
 * @param {string} name The string to check
 * @returns {boolean} True if it can be used with dot notation
 */
export function isValidDotNotationIdentifier(name) {
  // Unicode-aware regex (more comprehensive)
  const identifierRegex = /^[\p{L}\p{Nl}$_][\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}$_]*$/u
  // Simpler ASCII-only version:
  // const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
  if (typeof name !== 'string' || name.length === 0) {
    return false
  }
  return identifierRegex.test(name) && !RESERVED_WORDS.has(name)
}

/**
 * Checks if a statement is a declaration type
 * @param {ASTNode} statement
 * @returns {boolean}
 */
export function isDeclaration(statement) {
  return statement.type === 'VariableDeclaration' ||
    statement.type === 'FunctionDeclaration' ||
    statement.type === 'ClassDeclaration'
}

/**
 * Checks if a node is definitely parenthesized
 * @param {ASTNode} node
 * @param {SourceCode} sourceCode
 * @returns {boolean}
 */
export function isParenthesized(node, sourceCode) {
  const previousToken = sourceCode.getTokenBefore(node)
  const nextToken = sourceCode.getTokenAfter(node)

  return Boolean(previousToken && nextToken &&
    previousToken.value === "(" && previousToken.range[1] <= node.range[0] &&
    nextToken.value === ")" && nextToken.range[0] >= node.range[1])
}

export default {
  isParenthesized,
  isDeclaration,
  isValidDotNotationIdentifier,
}