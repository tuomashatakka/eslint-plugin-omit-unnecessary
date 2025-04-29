/**
 * @fileoverview ESLint plugin to omit unnecessary parentheses and brackets
 * @author Your Name
 */
"use strict";

// import all rules in lib/rules
import requireIndex from "requireindex"

module.exports = {
    rules: requireIndex(__dirname + "/rules"),
    configs: {
      recommended: {
        plugins: ['omit-unnecessary'],
        rules: {
          'omit-unnecessary/omit-unnecessary-parens-brackets': 'warn',
        }
      }
    }
};