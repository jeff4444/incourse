import { Extension } from '@tiptap/core'

export const MathInputRules = Extension.create({
  name: 'mathInputRules',
  
  addInputRules() {
    return [
      // Block math rule - must come first
      {
        find: /\$\$([^$]+)\$\$/g,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          const latex = match[1].trim()

          if (latex) {
            tr.delete(start, end)
            tr.insert(start, state.schema.nodes.blockMath.create({
              latex,
            }))
          }
        },
      },
      // Inline math rule - check context to avoid conflicts
      {
        find: /\$([^$\n]+)\$/g,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          const latex = match[1].trim()
          
          // Get surrounding text to check context
          const textBefore = state.doc.textBetween(Math.max(0, start - 2), start)
          const textAfter = state.doc.textBetween(end, Math.min(state.doc.content.size, end + 2))
          
          // Skip if this looks like part of a $$ block
          if (textBefore.includes('$') || textAfter.includes('$')) {
            return
          }

          if (latex) {
            tr.delete(start, end)
            tr.insert(start, state.schema.nodes.inlineMath.create({
              latex,
            }))
          }
        },
      },
    ]
  },
})

// Alternative approach using paste rules for better reliability
export const MathPasteRules = Extension.create({
  name: 'mathPasteRules',
  
  addPasteRules() {
    return [
      {
        find: /\$\$([^$]+)\$\$/g,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          const latex = match[1].trim()

          tr.delete(start, end)
          tr.insert(start, state.schema.nodes.blockMath.create({
            latex,
          }))
        },
      },
      {
        find: /\$([^$\n]+)\$/g,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          const latex = match[1].trim()

          tr.delete(start, end)
          tr.insert(start, state.schema.nodes.inlineMath.create({
            latex,
          }))
        },
      },
    ]
  },
})
