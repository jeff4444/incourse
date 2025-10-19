import React, { useState, useEffect, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface InlineMathComponentProps {
  node: {
    attrs: {
      latex: string
    }
  }
  updateAttributes: (attrs: { latex: string }) => void
}

export const InlineMathComponent: React.FC<InlineMathComponentProps> = ({
  node,
  updateAttributes,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [latex, setLatex] = useState(node.attrs.latex)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
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
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLatex(node.attrs.latex)
      setIsEditing(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLatex(e.target.value)
  }

  const renderMath = () => {
    if (!latex.trim()) {
      return <span className="text-gray-400 italic">Click to add math</span>
    }

    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
      })
      return <span dangerouslySetInnerHTML={{ __html: html }} />
    } catch (err) {
      return <span className="text-red-500 italic">Invalid LaTeX</span>
    }
  }

  return (
    <NodeViewWrapper as="span">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={latex}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="inline-block min-w-[60px] px-1 py-0.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter LaTeX..."
        />
      ) : (
        <span
          onClick={handleClick}
          className="inline-block cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded px-0.5 transition-colors"
          title="Click to edit"
        >
          {renderMath()}
        </span>
      )}
    </NodeViewWrapper>
  )
}
