#!/usr/bin/env python3
"""
Simple PDF documentation generator
Creates professional PDF versions of markdown documentation
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import black, blue, darkblue
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from datetime import datetime
import re

class SimplePDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_styles()
        
    def setup_styles(self):
        """Setup custom styles for documentation"""
        # Create new styles without conflicting names
        self.title_style = ParagraphStyle(
            'DocTitle',
            parent=self.styles['Title'],
            fontSize=20,
            spaceAfter=20,
            textColor=darkblue,
            alignment=TA_CENTER
        )
        
        self.h1_style = ParagraphStyle(
            'DocH1',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=16,
            textColor=darkblue
        )
        
        self.h2_style = ParagraphStyle(
            'DocH2',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=8,
            spaceBefore=12,
            textColor=blue
        )
        
        self.body_style = ParagraphStyle(
            'DocBody',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=12,
            alignment=TA_JUSTIFY,
            spaceAfter=6
        )

    def process_markdown_content(self, content):
        """Convert markdown content to PDF elements"""
        story = []
        lines = content.split('\n')
        current_para = []
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines but add spacing
            if not line:
                if current_para:
                    text = ' '.join(current_para)
                    if text:
                        story.append(Paragraph(text, self.body_style))
                        story.append(Spacer(1, 6))
                    current_para = []
                continue
            
            # Handle headers
            if line.startswith('# '):
                if current_para:
                    text = ' '.join(current_para)
                    if text:
                        story.append(Paragraph(text, self.body_style))
                    current_para = []
                title = line[2:].strip()
                story.append(Paragraph(title, self.title_style))
                story.append(Spacer(1, 12))
                continue
                
            elif line.startswith('## '):
                if current_para:
                    text = ' '.join(current_para)
                    if text:
                        story.append(Paragraph(text, self.body_style))
                    current_para = []
                heading = line[3:].strip()
                story.append(Paragraph(heading, self.h1_style))
                story.append(Spacer(1, 6))
                continue
                
            elif line.startswith('### '):
                if current_para:
                    text = ' '.join(current_para)
                    if text:
                        story.append(Paragraph(text, self.body_style))
                    current_para = []
                heading = line[4:].strip()
                story.append(Paragraph(heading, self.h2_style))
                story.append(Spacer(1, 4))
                continue
            
            # Handle bullet points
            if line.startswith('- ') or line.startswith('* '):
                if current_para:
                    text = ' '.join(current_para)
                    if text:
                        story.append(Paragraph(text, self.body_style))
                    current_para = []
                bullet_text = line[2:].strip()
                story.append(Paragraph(f"• {bullet_text}", self.body_style))
                continue
            
            # Handle numbered lists
            if re.match(r'^\d+\. ', line):
                if current_para:
                    text = ' '.join(current_para)
                    if text:
                        story.append(Paragraph(text, self.body_style))
                    current_para = []
                story.append(Paragraph(line, self.body_style))
                continue
            
            # Skip markdown links and code blocks for simplicity
            if line.startswith('```') or line.startswith('[') and '](' in line:
                continue
                
            # Regular text
            current_para.append(line)
        
        # Handle remaining content
        if current_para:
            text = ' '.join(current_para)
            if text:
                story.append(Paragraph(text, self.body_style))
        
        return story

    def create_pdf(self, md_file, output_file):
        """Create PDF from markdown file"""
        try:
            if not os.path.exists(md_file):
                print(f"Source file not found: {md_file}")
                return False
                
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Create output directory if needed
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            
            # Create PDF document
            doc = SimpleDocTemplate(
                output_file,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72
            )
            
            # Process content
            story = self.process_markdown_content(content)
            
            # Add header
            header = [
                Paragraph("Stormwater AI Documentation", self.title_style),
                Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", self.styles['Normal']),
                Spacer(1, 20)
            ]
            
            story = header + story
            
            # Build PDF
            doc.build(story)
            
            file_size = os.path.getsize(output_file)
            print(f"✅ Created: {output_file} ({file_size:,} bytes)")
            return True
            
        except Exception as e:
            print(f"❌ Error creating {output_file}: {str(e)}")
            return False

def main():
    """Generate all documentation PDFs"""
    generator = SimplePDFGenerator()
    
    # Documentation files to convert
    docs = [
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
    
    print("📄 Generating PDF documentation...")
    print("=" * 50)
    
    successful = 0
    for md_file, pdf_file in docs:
        if generator.create_pdf(md_file, pdf_file):
            successful += 1
    
    print("=" * 50)
    print(f"📊 Complete: {successful}/{len(docs)} PDFs generated")
    
    if successful > 0:
        print("\n📁 Generated Files:")
        for _, pdf_file in docs:
            if os.path.exists(pdf_file):
                size = os.path.getsize(pdf_file)
                print(f"   • {pdf_file} ({size:,} bytes)")

if __name__ == "__main__":
    main()