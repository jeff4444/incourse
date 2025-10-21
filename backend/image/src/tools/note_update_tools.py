"""
Note update tools for formatting and appending content to notes.
"""

import re
from typing import Dict, List, Any
from api.supabase import get_notes_by_ids, update_note_content
from .tiptap_validator import validate_tiptap_content, get_validation_summary


def validate_tiptap_format(content_json: str) -> Dict[str, Any]:
    """
    Validate TipTap JSON content format.
    
    Args:
        content_json: JSON string of TipTap content to validate
        
    Returns:
        Dictionary with validation results
    """
    print("calling validate_tiptap_format")
    import json
    
    try:
        # Parse the JSON string
        content = json.loads(content_json)
    except json.JSONDecodeError as e:
        return {
            "is_valid": False,
            "errors": [f"Invalid JSON format: {str(e)}"],
            "warnings": [],
            "summary": f"❌ Invalid JSON format: {str(e)}"
        }
    
    # Validate the TipTap content
    is_valid, errors, warnings = validate_tiptap_content(content)
    
    summary = get_validation_summary(errors, warnings)
    
    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "summary": summary
    }


def convert_markdown_to_tiptap(markdown: str) -> dict:
    """
    Convert markdown content to Tiptap JSON format.
    
    Args:
        markdown: Markdown formatted string
    
    Returns:
        Tiptap JSON document structure
    """
    print("calling convert_markdown_to_tiptap")
    lines = markdown.split('\n')
    content = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        if not line:
            i += 1
            continue
            
        # Handle headings
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            text = line.lstrip('# ').strip()
            content.append({
                "type": "heading",
                "attrs": {"level": min(level, 6)},
                "content": [{"type": "text", "text": text}]
            })
            
        # Handle horizontal rules
        elif line.startswith('---'):
            content.append({"type": "horizontalRule"})
            
        # Handle code blocks
        elif line.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            content.append({
                "type": "codeBlock",
                "content": [{"type": "text", "text": '\n'.join(code_lines)}]
            })
            
        # Handle bullet lists
        elif line.startswith('- ') or line.startswith('* '):
            list_items = []
            while i < len(lines) and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                item_text = lines[i].strip()[2:].strip()
                list_items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": parse_inline_formatting(item_text)
                    }]
                })
                i += 1
            i -= 1  # Back up one since we'll increment at the end
            content.append({
                "type": "bulletList",
                "content": list_items
            })
            
        # Handle numbered lists
        elif re.match(r'^\d+\. ', line):
            list_items = []
            while i < len(lines) and re.match(r'^\d+\. ', lines[i].strip()):
                item_text = re.sub(r'^\d+\. ', '', lines[i].strip()).strip()
                list_items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": parse_inline_formatting(item_text)
                    }]
                })
                i += 1
            i -= 1  # Back up one since we'll increment at the end
            content.append({
                "type": "orderedList",
                "content": list_items
            })
            
        # Handle blockquotes
        elif line.startswith('> '):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith('> '):
                quote_lines.append(lines[i].strip()[2:].strip())
                i += 1
            i -= 1  # Back up one since we'll increment at the end
            content.append({
                "type": "blockquote",
                "content": [{
                    "type": "paragraph",
                    "content": parse_inline_formatting(' '.join(quote_lines))
                }]
            })
            
        # Handle regular paragraphs
        else:
            paragraph_lines = [line]
            i += 1
            # Collect consecutive non-empty lines that aren't special formatting
            while (i < len(lines) and 
                   lines[i].strip() and 
                   not lines[i].strip().startswith('#') and
                   not lines[i].strip().startswith('- ') and
                   not lines[i].strip().startswith('* ') and
                   not re.match(r'^\d+\. ', lines[i].strip()) and
                   not lines[i].strip().startswith('> ') and
                   not lines[i].strip().startswith('```') and
                   not lines[i].strip().startswith('---')):
                paragraph_lines.append(lines[i].strip())
                i += 1
            i -= 1  # Back up one since we'll increment at the end
            
            if paragraph_lines:
                content.append({
                    "type": "paragraph",
                    "content": parse_inline_formatting(' '.join(paragraph_lines))
                })
        
        i += 1
    
    return {
        "type": "doc",
        "content": content
    }


def parse_inline_formatting(text: str) -> List[Dict[str, Any]]:
    """
    Parse inline formatting (bold, italic, code, links, math) from text.
    
    Args:
        text: Text with markdown formatting
    
    Returns:
        List of Tiptap text nodes with marks
    """
    if not text:
        return [{"type": "text", "text": ""}]
    
    nodes = []
    current_pos = 0
    
    # Find all formatting markers (order matters - more specific patterns first)
    patterns = [
        (r'\$\$(.*?)\$\$', 'blockMath'),  # Block math (display mode)
        (r'\$(.*?)\$', 'inlineMath'),     # Inline math
        (r'\*\*(.*?)\*\*', 'bold'),       # Bold
        (r'\*(.*?)\*', 'italic'),        # Italic
        (r'`(.*?)`', 'code'),             # Code
        (r'\[([^\]]+)\]\(([^)]+)\)', 'link')  # Links
    ]
    
    matches = []
    for pattern, mark_type in patterns:
        for match in re.finditer(pattern, text):
            # Check if this match overlaps with any existing match
            overlap = False
            for existing in matches:
                if not (match.end() <= existing['start'] or match.start() >= existing['end']):
                    overlap = True
                    break
            
            if not overlap:
                matches.append({
                    'start': match.start(),
                    'end': match.end(),
                    'type': mark_type,
                    'content': match.group(1),
                    'href': match.group(2) if mark_type == 'link' else None
                })
    
    # Sort matches by position
    matches.sort(key=lambda x: x['start'])
    
    # Build nodes
    for match in matches:
        # Add text before the match
        if current_pos < match['start']:
            plain_text = text[current_pos:match['start']]
            if plain_text:
                nodes.append({"type": "text", "text": plain_text})
        
        # Add the formatted text
        if match['type'] == 'link':
            nodes.append({
                "type": "text",
                "text": match['content'],
                "marks": [{"type": "link", "attrs": {"href": match['href']}}]
            })
        elif match['type'] in ['blockMath', 'inlineMath']:
            # Create math node
            nodes.append({
                "type": match['type'],
                "attrs": {"latex": match['content']}
            })
        else:
            nodes.append({
                "type": "text",
                "text": match['content'],
                "marks": [{"type": match['type']}]
            })
        
        current_pos = match['end']
    
    # Add remaining text
    if current_pos < len(text):
        plain_text = text[current_pos:]
        if plain_text:
            nodes.append({"type": "text", "text": plain_text})
    
    return nodes if nodes else [{"type": "text", "text": text}]


async def append_content_to_note(
    note_id: str, 
    new_content_markdown: str, 
    source_file_id: str, 
    course_id: str
) -> Dict[str, Any]:
    """
    Append new content to an existing note.
    
    Args:
        note_id: ID of the note to update
        new_content_markdown: Markdown formatted content to append
        source_file_id: ID of the source file for attribution
        course_id: Course ID for the source link
    
    Returns:
        Updated note data
    
    Raises:
        Exception: If note update fails or content is invalid
    """
    print("calling append_content_to_note")
    # Get existing note
    notes = await get_notes_by_ids([note_id])
    if not notes:
        raise Exception(f"Note with ID '{note_id}' not found")
    
    note = notes[0]
    existing_content = note.get("content", {"type": "doc", "content": []})
    
    # Convert new content to Tiptap format
    new_content_tiptap = convert_markdown_to_tiptap(new_content_markdown)
    
    # Validate the new content before proceeding
    is_valid, errors, warnings = validate_tiptap_content(new_content_tiptap)
    
    if not is_valid:
        error_summary = get_validation_summary(errors, warnings)
        raise Exception(f"Invalid TipTap content generated:\n{error_summary}")
    
    # Log warnings if any
    if warnings:
        print(f"TipTap validation warnings: {warnings}")
    
    # Add separator and new content to existing content
    combined_content = existing_content.copy()
    if "content" not in combined_content:
        combined_content["content"] = []
    
    # Add a separator if there's existing content
    if combined_content["content"]:
        combined_content["content"].append({"type": "horizontalRule"})
    
    # Append new content
    if "content" in new_content_tiptap:
        combined_content["content"].extend(new_content_tiptap["content"])
    
    # Update the note
    return await update_note_content(note_id, combined_content)
