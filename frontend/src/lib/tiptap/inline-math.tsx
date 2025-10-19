import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { InlineMathComponent } from '@/components/math/inline-math-component'

export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[class*="inline-latex-component"]',
        getAttrs: (element) => {
          const el = element as HTMLElement
          return {
            latex: el.getAttribute('data-latex') || '',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'inline-latex-component',
      'data-latex': HTMLAttributes.latex,
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathComponent)
  },

  addCommands() {
    return {
      insertInlineMath: (latex = '') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { latex },
        })
      },
    }
  },
})
