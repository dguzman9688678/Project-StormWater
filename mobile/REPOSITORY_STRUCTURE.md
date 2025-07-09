# Repository Structure - Stormwater AI

**Last Updated**: June 29, 2025  
**Version**: 2.0 Production  

## Clean Repository Organization

###  Core Application Structure
```
stormwater-ai/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Application pages
│   │   └── lib/               # Frontend utilities
│   └── index.html
├── server/                     # Express.js backend
│   ├── services/              # AI and business logic services
│   ├── routes.ts              # API route definitions
│   ├── storage.ts             # Data access layer
│   └── index.ts               # Server entry point
├── shared/                     # Shared TypeScript schemas
│   └── schema.ts              # Database and API types
└── mobile/                     # Mobile application (future)
```

###  Documentation Structure
```
docs/
├── README.md                           # Master documentation index
├── *.pdf                              # Professional PDF versions
├── *.md                               # Markdown source files
├── analysis-reports/                   # Technical analysis reports
├── user-guides/                       # End-user documentation
└── specifications/                     # Project specifications
```

###  Development Tools
```
scripts/
├── python/                            # Python utilities
│   ├── simple_pdf_generator.py        # PDF documentation generator
│   ├── generate_documentation_pdfs.py # Advanced PDF generator
│   └── create_pdf.py                  # Original PDF utilities
└── utilities/                         # Other development scripts
```

###  Build & Configuration
```
# Build Configuration (Root Level - Required)
├── package.json                # Node.js dependencies and scripts
├── package-lock.json          # Locked dependency versions
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── drizzle.config.ts          # Database ORM configuration
├── components.json            # Shadcn UI configuration
├── pyproject.toml             # Python configuration
└── uv.lock                    # Python dependency lock
```

###  Data & Storage
```
uploads/                       # Temporary file uploads
dist/                         # Built application files
node_modules/                 # Node.js dependencies
```

###  Project Management
```
├── replit.md                 # Project overview and architecture
├── REPOSITORY_STRUCTURE.md   # This file
└── .replit                   # Replit configuration
```

###  Archive Structure
```
archive/
├── project-history/          # Historical project files and notes
├── specifications/           # Original specification documents
└── screenshots/             # Development screenshots and UI examples
```

## File Organization Principles

###  What Stays in Root Directory
- **Build Configuration**: All config files required by build tools
- **Package Management**: package.json, package-lock.json, uv.lock
- **Project Documentation**: replit.md, README files
- **Essential Scripts**: Core build and development scripts

###  What Gets Organized into Folders
- **Documentation**: Comprehensive docs/ structure with PDFs and markdown
- **Development Tools**: scripts/ directory for utilities and generators
- **Historical Files**: archive/ for old specifications and project history
- **Generated Files**: dist/ and uploads/ for build artifacts and temporary files

###  What Gets Archived
- **Old Specifications**: Historical requirement documents
- **Development Screenshots**: UI mockups and progress images
- **Project History**: Development notes and iteration files
- **Duplicate Files**: Consolidated into single authoritative versions

## Repository Benefits

###  Clean Structure
- Clear separation between application code and documentation
- Build configuration easily accessible in root
- Development tools organized and discoverable
- Historical files archived but preserved

###  Professional Documentation
- Complete PDF documentation package
- Organized by category (technical, user guides, analysis)
- Master index for easy navigation
- Both source (markdown) and distribution (PDF) formats

###  Developer Experience
- Essential configuration files in expected locations
- Build system works without modification
- Development scripts organized and documented
- Clear separation of concerns

###  Deployment Ready
- Clean repository structure for version control
- No loose files cluttering the root directory
- Professional appearance for stakeholders
- Ready for automated deployment systems

## Maintenance Guidelines

###  Documentation Updates
- Update both markdown and PDF versions when making changes
- Regenerate PDFs using `python scripts/python/simple_pdf_generator.py`
- Keep REPOSITORY_STRUCTURE.md current with any structural changes
- Update replit.md with architectural decisions

###  File Organization
- New development files go in appropriate scripts/ subdirectories
- Documentation files belong in docs/ with proper categorization
- Archive historical files rather than deleting them
- Maintain clean root directory with only essential files

###  Version Control Best Practices
- Stage files by logical groupings (features, docs, config)
- Use clear commit messages describing organizational changes
- Tag major organizational improvements
- Include REPOSITORY_STRUCTURE.md in documentation commits

---

*This repository structure provides a professional, maintainable, and scalable organization for the Stormwater AI platform development and documentation.*