"""
Canvas utility functions for file parsing and content extraction.
"""

import os
import fitz  # PyMuPDF
import docx2txt
from pptx import Presentation


async def parse_file_content(file_path: str, content_type: str, filename: str, file_extension: str) -> str:
    """
    Parse file content based on file type and return text content from local file.
    
    Args:
        file_path: Path to the local file
        content_type: MIME type of the file
        filename: Original filename
        file_extension: File extension
    Returns:
        Extracted text content or error message
    """
    try:
        if content_type == 'application/pdf':
            return await parse_pdf_content(file_path)
        elif content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
            return await parse_docx_content(file_path)
        elif content_type in ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint']:
            return await parse_pptx_content(file_path)
        elif content_type in ['text/plain', 'text/html']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        else:
            # try to parse the file based on the extension
            if file_extension == 'pdf':
                return await parse_pdf_content(file_path)
            elif file_extension == 'docx' or file_extension == 'doc':
                return await parse_docx_content(file_path)
            elif file_extension == 'pptx' or file_extension == 'ppt':
                return await parse_pptx_content(file_path)
            else:
                return f"[File type {content_type} not supported for text extraction]"
    except Exception as e:
        return f"[Error parsing file content: {str(e)}]"


async def parse_pdf_content(file_path: str) -> str:
    """
    Parse PDF content and extract text using PyMuPDF from local file.
    
    Args:
        file_path: Path to the local PDF file
        
    Returns:
        Extracted text content
    """
    try:
        # Use PyMuPDF to extract text with basic formatting
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
        return text.strip()
    except Exception as e:
        return f"[Error parsing PDF: {str(e)}]"


async def parse_docx_content(file_path: str) -> str:
    """
    Parse DOCX content and extract text from local file.
    
    Args:
        file_path: Path to the local DOCX file
        
    Returns:
        Extracted text content
    """
    try:
        # Use docx2txt for lightweight text extraction
        text = docx2txt.process(file_path)
        return text.strip()
    except Exception as e:
        return f"[Error parsing DOCX: {str(e)}]"


async def parse_pptx_content(file_path: str) -> str:
    """
    Parse PPTX content and extract text from local file.
    
    Args:
        file_path: Path to the local PPTX file
        
    Returns:
        Extracted text content
    """
    try:
        prs = Presentation(file_path)
        text = ""
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text += shape.text + "\n"
        return text.strip()
    except Exception as e:
        return f"[Error parsing PPTX: {str(e)}]"

