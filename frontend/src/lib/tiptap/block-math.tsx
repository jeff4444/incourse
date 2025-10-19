import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { BlockMathComponent } from '@/components/math/block-math-component'

export const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
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
        tag: 'div[class*="block-latex-component"]',
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
    return ['div', mergeAttributes(HTMLAttributes, {
      class: 'block-latex-component',
      'data-latex': HTMLAttributes.latex,
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockMathComponent)
  },
})
