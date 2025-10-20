"""
TipTap JSON format validator to ensure proper structure before saving to notes.
"""

from typing import Dict, List, Any, Tuple, Optional
import re


class TipTapValidationError(Exception):
    """Custom exception for TipTap validation errors."""
    def __init__(self, message: str, path: str = ""):
        self.message = message
        self.path = path
        super().__init__(f"TipTap validation error at {path}: {message}")


class TipTapValidator:
    """Validates TipTap JSON structure for proper rendering."""
    
    # Valid node types
    VALID_NODE_TYPES = {
        'doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem',
        'blockquote', 'codeBlock', 'horizontalRule', 'text', 'hardBreak',
        'image', 'table', 'tableRow', 'tableCell', 'tableHeader',
        'youtube', 'blockMath', 'inlineMath'
    }
    
    # Valid mark types
    VALID_MARK_TYPES = {
        'bold', 'italic', 'underline', 'strike', 'code', 'link', 'textStyle', 'color'
    }
    
    # Required attributes for specific node types
    REQUIRED_ATTRS = {
        'heading': ['level'],
        'link': ['href'],
        'image': ['src'],
        'youtube': ['src'],
        'blockMath': ['latex'],
        'inlineMath': ['latex']
    }
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def validate(self, content: Any) -> Tuple[bool, List[str], List[str]]:
        """
        Validate TipTap JSON content.
        
        Args:
            content: TipTap JSON document
            
        Returns:
            Tuple of (is_valid, errors, warnings)
        """
        self.errors = []
        self.warnings = []
        
        try:
            self._validate_document(content)
        except TipTapValidationError as e:
            self.errors.append(str(e))
        
        return len(self.errors) == 0, self.errors, self.warnings
    
    def _validate_document(self, content: Any, path: str = "root") -> None:
        """Validate the entire document structure."""
        if not isinstance(content, dict):
            raise TipTapValidationError("Document must be a JSON object", path)
        
        if content.get("type") != "doc":
            raise TipTapValidationError("Root element must have type 'doc'", path)
        
        if "content" not in content:
            raise TipTapValidationError("Document must have 'content' field", path)
        
        if not isinstance(content["content"], list):
            raise TipTapValidationError("Document content must be an array", path)
        
        # Validate each content node
        for i, node in enumerate(content["content"]):
            self._validate_node(node, f"{path}.content[{i}]")
    
    def _validate_node(self, node: Any, path: str) -> None:
        """Validate a single node."""
        if not isinstance(node, dict):
            raise TipTapValidationError("Node must be a JSON object", path)
        
        if "type" not in node:
            raise TipTapValidationError("Node must have 'type' field", path)
        
        node_type = node["type"]
        if node_type not in self.VALID_NODE_TYPES:
            raise TipTapValidationError(f"Invalid node type: {node_type}", path)
        
        # Validate node-specific structure
        if node_type == "text":
            self._validate_text_node(node, path)
        elif node_type in ["heading", "paragraph", "listItem", "blockquote", "tableCell", "tableHeader"]:
            self._validate_container_node(node, path)
        elif node_type in ["bulletList", "orderedList", "table", "tableRow"]:
            self._validate_list_node(node, path)
        elif node_type == "codeBlock":
            self._validate_code_block_node(node, path)
        elif node_type == "image":
            self._validate_image_node(node, path)
        elif node_type == "youtube":
            self._validate_youtube_node(node, path)
        elif node_type == "blockMath":
            self._validate_block_math_node(node, path)
        elif node_type == "inlineMath":
            self._validate_inline_math_node(node, path)
        elif node_type == "horizontalRule":
            self._validate_horizontal_rule_node(node, path)
    
    def _validate_text_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate text node structure."""
        if "text" not in node:
            raise TipTapValidationError("Text node must have 'text' field", path)
        
        if not isinstance(node["text"], str):
            raise TipTapValidationError("Text field must be a string", path)
        
        # Check for empty text nodes (warning)
        if not node["text"].strip():
            self.warnings.append(f"Empty text node at {path}")
        
        # Validate marks if present
        if "marks" in node:
            if not isinstance(node["marks"], list):
                raise TipTapValidationError("Marks must be an array", path)
            
            for i, mark in enumerate(node["marks"]):
                self._validate_mark(mark, f"{path}.marks[{i}]")
    
    def _validate_mark(self, mark: Dict[str, Any], path: str) -> None:
        """Validate mark structure."""
        if not isinstance(mark, dict):
            raise TipTapValidationError("Mark must be a JSON object", path)
        
        if "type" not in mark:
            raise TipTapValidationError("Mark must have 'type' field", path)
        
        mark_type = mark["type"]
        if mark_type not in self.VALID_MARK_TYPES:
            raise TipTapValidationError(f"Invalid mark type: {mark_type}", path)
        
        # Validate mark-specific attributes
        if mark_type == "link":
            if "attrs" not in mark or "href" not in mark["attrs"]:
                raise TipTapValidationError("Link mark must have href attribute", path)
        elif mark_type == "textStyle":
            if "attrs" not in mark:
                raise TipTapValidationError("TextStyle mark must have attrs", path)
        elif mark_type == "color":
            if "attrs" not in mark or "color" not in mark["attrs"]:
                raise TipTapValidationError("Color mark must have color attribute", path)
    
    def _validate_container_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate container nodes (heading, paragraph, etc.)."""
        if "content" not in node:
            raise TipTapValidationError(f"{node['type']} node must have 'content' field", path)
        
        if not isinstance(node["content"], list):
            raise TipTapValidationError("Content must be an array", path)
        
        # Validate required attributes
        if node["type"] == "heading":
            if "attrs" not in node or "level" not in node["attrs"]:
                raise TipTapValidationError("Heading node must have level attribute", path)
            
            level = node["attrs"]["level"]
            if not isinstance(level, int) or level < 1 or level > 6:
                raise TipTapValidationError("Heading level must be integer 1-6", path)
        
        # Validate content nodes
        for i, content_node in enumerate(node["content"]):
            self._validate_node(content_node, f"{path}.content[{i}]")
    
    def _validate_list_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate list nodes."""
        if "content" not in node:
            raise TipTapValidationError(f"{node['type']} node must have 'content' field", path)
        
        if not isinstance(node["content"], list):
            raise TipTapValidationError("Content must be an array", path)
        
        # All children must be listItem nodes
        for i, item in enumerate(node["content"]):
            if not isinstance(item, dict) or item.get("type") != "listItem":
                raise TipTapValidationError(f"List items must be listItem nodes", f"{path}.content[{i}]")
            
            self._validate_node(item, f"{path}.content[{i}]")
    
    def _validate_code_block_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate code block nodes."""
        if "content" not in node:
            raise TipTapValidationError("Code block must have 'content' field", path)
        
        if not isinstance(node["content"], list):
            raise TipTapValidationError("Content must be an array", path)
        
        # Code blocks should only contain text nodes
        for i, content_node in enumerate(node["content"]):
            if not isinstance(content_node, dict) or content_node.get("type") != "text":
                raise TipTapValidationError("Code blocks can only contain text nodes", f"{path}.content[{i}]")
            
            self._validate_text_node(content_node, f"{path}.content[{i}]")
    
    def _validate_image_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate image nodes."""
        if "attrs" not in node or "src" not in node["attrs"]:
            raise TipTapValidationError("Image node must have src attribute", path)
    
    def _validate_horizontal_rule_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate horizontal rule nodes."""
        # Horizontal rules should not have content
        if "content" in node:
            raise TipTapValidationError("Horizontal rule should not have content", path)
    
    def _validate_youtube_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate YouTube video nodes."""
        if "attrs" not in node or "src" not in node["attrs"]:
            raise TipTapValidationError("YouTube node must have src attribute", path)
        
        src = node["attrs"]["src"]
        if not isinstance(src, str):
            raise TipTapValidationError("YouTube src must be a string", path)
        
        # Basic YouTube URL validation
        if not src.startswith(("https://www.youtube.com/watch?v=", "https://youtu.be/")):
            self.warnings.append(f"YouTube URL may be invalid at {path}: {src}")
        
        # YouTube nodes should not have content
        if "content" in node:
            raise TipTapValidationError("YouTube node should not have content", path)
    
    def _validate_block_math_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate block math nodes."""
        if "attrs" not in node or "latex" not in node["attrs"]:
            raise TipTapValidationError("Block math node must have latex attribute", path)
        
        latex = node["attrs"]["latex"]
        if not isinstance(latex, str):
            raise TipTapValidationError("Block math latex must be a string", path)
        
        # Block math nodes should not have content
        if "content" in node:
            raise TipTapValidationError("Block math node should not have content", path)
    
    def _validate_inline_math_node(self, node: Dict[str, Any], path: str) -> None:
        """Validate inline math nodes."""
        if "attrs" not in node or "latex" not in node["attrs"]:
            raise TipTapValidationError("Inline math node must have latex attribute", path)
        
        latex = node["attrs"]["latex"]
        if not isinstance(latex, str):
            raise TipTapValidationError("Inline math latex must be a string", path)
        
        # Inline math nodes should not have content
        if "content" in node:
            raise TipTapValidationError("Inline math node should not have content", path)


def validate_tiptap_content(content: Any) -> Tuple[bool, List[str], List[str]]:
    """
    Convenience function to validate TipTap content.
    
    Args:
        content: TipTap JSON document
        
    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    validator = TipTapValidator()
    return validator.validate(content)


def get_validation_summary(errors: List[str], warnings: List[str]) -> str:
    """
    Get a human-readable validation summary.
    
    Args:
        errors: List of validation errors
        warnings: List of validation warnings
        
    Returns:
        Formatted validation summary
    """
    if not errors and not warnings:
        return "✅ TipTap content is valid"
    
    summary = []
    
    if errors:
        summary.append("❌ ERRORS:")
        for error in errors:
            summary.append(f"  • {error}")
    
    if warnings:
        summary.append("⚠️  WARNINGS:")
        for warning in warnings:
            summary.append(f"  • {warning}")
    
    return "\n".join(summary)


if __name__ == "__main__":
    import json
    url = input("Enter url to json file: ")
    with open(url, "r") as f:
        content = json.load(f)
    is_valid, errors, warnings = validate_tiptap_content(content)
    print(f"Is valid: {is_valid}")