import { dirname } from 'path'
import { fileURLToPath } from 'url'
import omit from './rules/omit-unnecessary-parens-brackets.mjs'
import * as x from '@eslint-community/eslint-utils'

x
const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  rules: {
    'omit-unnecessary-parens-brackets': omit
  },
  configs: {
    recommended: {
      plugins: ['omit-unnecessary'],
      rules: {
        'omit-unnecessary/omit-unnecessary-parens-brackets': 'warn',
      }
    }
  }
}