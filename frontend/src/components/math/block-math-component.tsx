import React, { useState, useEffect, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface BlockMathComponentProps {
  node: {
    attrs: {
      latex: string
    }
  }
  updateAttributes: (attrs: { latex: string }) => void
}

export const BlockMathComponent: React.FC<BlockMathComponentProps> = ({
  node,
  updateAttributes,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [latex, setLatex] = useState(node.attrs.latex)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (latex !== node.attrs.latex) {
      updateAttributes({ latex })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLatex(node.attrs.latex)
      setIsEditing(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLatex(e.target.value)
  }

  const renderMath = () => {
    if (!latex.trim()) {
      return <span className="text-gray-400 italic">Click to add math</span>
    }

    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      })
      return <div dangerouslySetInnerHTML={{ __html: html }} />
    } catch (err) {
      return <span className="text-red-500 italic">Invalid LaTeX: {latex}</span>
    }
  }

  return (
    <NodeViewWrapper as="div" className="block-latex-component">
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={latex}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[80px] px-3 py-2 text-sm border border-blue-300 rounded bg-white dark:bg-neutral-900 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
          placeholder="Enter LaTeX equation..."
        />
      ) : (
        <div
          onClick={handleClick}
          className="text-center min-h-[3rem] flex items-center justify-center cursor-pointer"
          title="Click to edit"
        >
          <div className="overflow-x-auto max-w-full">
            {renderMath()}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}
