#!/usr/bin/env python3
"""
Generate PDF documentation from markdown files
Creates professional PDF versions of all documentation
"""

import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.platypus import Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import black, blue, gray, darkblue
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import markdown
from html2text import html2text
import re
from datetime import datetime

class DocumentationPDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
        
    def setup_custom_styles(self):
        """Setup custom paragraph styles for professional documentation"""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            textColor=darkblue,
            alignment=TA_CENTER
        ))
        
        # Heading 1 style
        self.styles.add(ParagraphStyle(
            name='CustomHeading1',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=12,
            spaceBefore=20,
            textColor=darkblue,
            keepWithNext=1
        ))
        
        # Heading 2 style
        self.styles.add(ParagraphStyle(
            name='CustomHeading2',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=6,
            spaceBefore=12,
            textColor=blue,
            keepWithNext=1
        ))
        
        # Code style
        self.styles.add(ParagraphStyle(
            name='Code',
            parent=self.styles['Normal'],
            fontName='Courier',
            fontSize=9,
            leftIndent=20,
            backgroundColor=gray,
            borderPadding=5
        ))
        
        # Professional body text
        self.styles.add(ParagraphStyle(
            name='BodyText',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=6
        ))

    def markdown_to_paragraphs(self, md_content):
        """Convert markdown content to ReportLab paragraphs"""
        story = []
        
        # Split content into lines for processing
        lines = md_content.split('\n')
        current_paragraph = []
        in_code_block = False
        code_block = []
        
        for line in lines:
            # Handle code blocks
            if line.strip().startswith('```'):
                if in_code_block:
                    # End code block
                    if code_block:
                        code_text = '\n'.join(code_block)
                        story.append(Paragraph(f"<pre>{code_text}</pre>", self.styles['Code']))
                        story.append(Spacer(1, 6))
                    code_block = []
                    in_code_block = False
                else:
                    # Start code block
                    if current_paragraph:
                        text = ' '.join(current_paragraph)
                        if text.strip():
                            story.append(Paragraph(text, self.styles['BodyText']))
                        current_paragraph = []
                    in_code_block = True
                continue
                
            if in_code_block:
                code_block.append(line)
                continue
            
            # Handle headers
            if line.startswith('# '):
                if current_paragraph:
                    text = ' '.join(current_paragraph)
                    if text.strip():
                        story.append(Paragraph(text, self.styles['BodyText']))
                    current_paragraph = []
                
                title = line[2:].strip()
                story.append(Paragraph(title, self.styles['CustomTitle']))
                story.append(Spacer(1, 12))
                continue
                
            elif line.startswith('## '):
                if current_paragraph:
                    text = ' '.join(current_paragraph)
                    if text.strip():
                        story.append(Paragraph(text, self.styles['BodyText']))
                    current_paragraph = []
                
                heading = line[3:].strip()
                story.append(Paragraph(heading, self.styles['CustomHeading1']))
                story.append(Spacer(1, 6))
                continue
                
            elif line.startswith('### '):
                if current_paragraph:
                    text = ' '.join(current_paragraph)
                    if text.strip():
                        story.append(Paragraph(text, self.styles['BodyText']))
                    current_paragraph = []
                
                heading = line[4:].strip()
                story.append(Paragraph(heading, self.styles['CustomHeading2']))
                story.append(Spacer(1, 6))
                continue
            
            # Handle empty lines
            if not line.strip():
                if current_paragraph:
                    text = ' '.join(current_paragraph)
                    if text.strip():
                        story.append(Paragraph(text, self.styles['BodyText']))
                        story.append(Spacer(1, 6))
                    current_paragraph = []
                continue
            
            # Handle bullet points
            if line.strip().startswith('- ') or line.strip().startswith('* '):
                if current_paragraph:
                    text = ' '.join(current_paragraph)
                    if text.strip():
                        story.append(Paragraph(text, self.styles['BodyText']))
                    current_paragraph = []
                
                bullet_text = line.strip()[2:]
                story.append(Paragraph(f"• {bullet_text}", self.styles['BodyText']))
                continue
            
            # Handle numbered lists
            if re.match(r'^\d+\. ', line.strip()):
                if current_paragraph:
                    text = ' '.join(current_paragraph)
                    if text.strip():
                        story.append(Paragraph(text, self.styles['BodyText']))
                    current_paragraph = []
                
                story.append(Paragraph(line.strip(), self.styles['BodyText']))
                continue
            
            # Regular text
            current_paragraph.append(line.strip())
        
        # Handle remaining paragraph
        if current_paragraph:
            text = ' '.join(current_paragraph)
            if text.strip():
                story.append(Paragraph(text, self.styles['BodyText']))
        
        return story

    def create_pdf_from_markdown(self, md_file_path, output_pdf_path):
        """Generate PDF from markdown file"""
        try:
            with open(md_file_path, 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            # Create PDF document
            doc = SimpleDocTemplate(
                output_pdf_path,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Convert markdown to story elements
            story = self.markdown_to_paragraphs(md_content)
            
            # Add header with generation info
            header_info = [
                Paragraph("Stormwater AI Documentation", self.styles['CustomTitle']),
                Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", self.styles['Normal']),
                Spacer(1, 20)
            ]
            
            story = header_info + story
            
            # Build PDF
            doc.build(story)
            print(f"✅ Generated PDF: {output_pdf_path}")
            return True
            
        except Exception as e:
            print(f"❌ Error generating PDF for {md_file_path}: {str(e)}")
            return False

    def generate_all_documentation_pdfs(self):
        """Generate PDFs for all documentation files"""
        
        # Define documentation files to convert
        docs_to_convert = [
            ("docs/README.md", "docs/Stormwater_AI_Documentation_Overview.pdf"),
            ("docs/ai-system-overview.md", "docs/AI_System_Overview.pdf"),
            ("docs/ai-technical-implementation.md", "docs/AI_Technical_Implementation.pdf"),
            ("docs/ai-performance-report.md", "docs/AI_Performance_Report.pdf"),
            ("docs/system-architecture-complete.md", "docs/System_Architecture_Complete.pdf"),
            ("docs/current-status-and-issues.md", "docs/Current_Status_and_Issues.pdf"),
            ("docs/bug-tracking-log.md", "docs/Bug_Tracking_Log.pdf"),
            ("docs/development-roadmap.md", "docs/Development_Roadmap.pdf"),
            ("replit.md", "docs/Project_Overview_and_Architecture.pdf")
        ]
        
        successful = 0
        total = len(docs_to_convert)
        
        print("🔄 Generating PDF documentation...")
        print("=" * 50)
        
        for md_file, pdf_file in docs_to_convert:
            if os.path.exists(md_file):
                if self.create_pdf_from_markdown(md_file, pdf_file):
                    successful += 1
            else:
                print(f"⚠️  Source file not found: {md_file}")
        
        print("=" * 50)
        print(f"📊 PDF Generation Complete: {successful}/{total} files converted")
        
        if successful > 0:
            print("\n📁 Generated PDF Files:")
            for _, pdf_file in docs_to_convert:
                if os.path.exists(pdf_file):
                    file_size = os.path.getsize(pdf_file)
                    print(f"   • {pdf_file} ({file_size:,} bytes)")

def main():
    """Main execution function"""
    generator = DocumentationPDFGenerator()
    generator.generate_all_documentation_pdfs()

if __name__ == "__main__":
    main()