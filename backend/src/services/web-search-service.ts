export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export class WebSearchService {
  async searchStormwaterResources(query: string, options: {
    includeRegulations?: boolean;
    includeBMPs?: boolean;
    includeGuidance?: boolean;
    context?: string;
  } = {}): Promise<Array<{
    title: string;
    content: string;
    url: string;
    relevance?: number;
  }>> {
    // Enhanced search for comprehensive stormwater resources
    try {
      // In production, this would integrate with real search APIs
      // For now, return curated high-quality stormwater resources
      return this.getCuratedStormwaterResults(query, options);
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  async searchStormwaterRegulations(query: string, location?: string): Promise<SearchResult[]> {
    // Enhanced search focusing on stormwater engineering resources
    const enhancedQuery = this.buildStormwaterQuery(query, location);
    
    try {
      // In a production environment, you would integrate with search APIs like:
      // - Google Custom Search API
      // - Bing Search API  
      // - DuckDuckGo API
      // For now, we'll return curated stormwater engineering resources
      
      return this.getCuratedResults(query, location);
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  private buildStormwaterQuery(query: string, location?: string): string {
    const baseTerms = ['stormwater', 'SWPPP', 'QSD', 'erosion control', 'BMP'];
    const locationTerms = location ? [location, 'local regulations'] : [];
    
    return `${query} ${baseTerms.join(' ')} ${locationTerms.join(' ')}`.trim();
  }

  private getCuratedResults(query: string, location?: string): SearchResult[] {
    // Curated list of authoritative stormwater engineering resources
    const resources: SearchResult[] = [
      {
        title: "EPA Stormwater Program",
        url: "https://www.epa.gov/npdes/stormwater-discharges-construction-activities",
        snippet: "Federal requirements for stormwater discharges from construction activities, including NPDES permit requirements and best management practices.",
        source: "EPA"
      },
      {
        title: "Construction General Permit (CGP)",
        url: "https://www.epa.gov/npdes/stormwater-discharges-construction-activities-cgp",
        snippet: "EPA's Construction General Permit covers stormwater discharges from construction activities that disturb one or more acres.",
        source: "EPA"
      },
      {
        title: "QSD Certification Requirements",
        url: "https://www.epa.gov/npdes/qualified-swppp-developer-qsd-requirements",
        snippet: "Requirements and responsibilities for Qualified SWPPP Developers including plan development, inspection, and certification requirements.",
        source: "EPA"
      },
      {
        title: "SWPPP Template and Guidelines",
        url: "https://www.epa.gov/npdes/stormwater-pollution-prevention-plan-swppp-template",
        snippet: "Template and guidance for developing comprehensive Stormwater Pollution Prevention Plans for construction sites.",
        source: "EPA"
      },
      {
        title: "Erosion and Sediment Control BMPs",
        url: "https://www.epa.gov/npdes/erosion-and-sediment-control",
        snippet: "Best management practices for erosion and sediment control including installation, maintenance, and effectiveness monitoring.",
        source: "EPA"
      }
    ];

    // Filter results based on query relevance
    const relevantResults = resources.filter(result => 
      this.isRelevant(result, query)
    );

    // Add location-specific results if location is provided
    if (location) {
      relevantResults.push(...this.getLocationSpecificResults(location));
    }

    return relevantResults.slice(0, 10); // Return top 10 results
  }

  private isRelevant(result: SearchResult, query: string): boolean {
    const queryLower = query.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const snippetLower = result.snippet.toLowerCase();
    
    return titleLower.includes(queryLower) || 
           snippetLower.includes(queryLower) ||
           this.hasKeywordMatch(queryLower, titleLower + ' ' + snippetLower);
  }

  private hasKeywordMatch(query: string, content: string): boolean {
    const keywords = ['qsd', 'swppp', 'erosion', 'bmp', 'stormwater', 'construction', 'permit'];
    return keywords.some(keyword => 
      query.includes(keyword) && content.includes(keyword)
    );
  }

  private getLocationSpecificResults(location: string): SearchResult[] {
    // In a real implementation, this would query location-specific databases
    return [
      {
        title: `${location} Stormwater Regulations`,
        url: `#local-regulations-${location.toLowerCase().replace(/\s+/g, '-')}`,
        snippet: `Local stormwater management requirements and regulations specific to ${location}. Check with local authorities for current requirements.`,
        source: "Local Authority"
      },
      {
        title: `${location} BMP Manual`,
        url: `#bmp-manual-${location.toLowerCase().replace(/\s+/g, '-')}`,
        snippet: `Best management practices manual and guidelines specific to ${location} climate and soil conditions.`,
        source: "Local Authority"
      }
    ];
  }

  async searchCurrentRegulations(query: string): Promise<SearchResult[]> {
    // Search for current regulatory updates and changes
    const regulatoryQuery = `${query} 2024 2025 regulatory updates changes requirements`;
    return this.searchStormwaterRegulations(regulatoryQuery);
  }

  private getCuratedStormwaterResults(query: string, options: {
    includeRegulations?: boolean;
    includeBMPs?: boolean;
    includeGuidance?: boolean;
    context?: string;
  }): Array<{
    title: string;
    content: string;
    url: string;
    relevance?: number;
  }> {
    const results = [
      {
        title: "EPA NPDES Stormwater Program",
        content: "Comprehensive guidance on National Pollutant Discharge Elimination System requirements for stormwater management, including permit requirements and best management practices.",
        url: "https://www.epa.gov/npdes/stormwater",
        relevance: 0.95
      },
      {
        title: "Construction General Permit (CGP)",
        content: "EPA's Construction General Permit covers stormwater discharges from construction activities. Includes requirements for QSD certification and SWPPP development.",
        url: "https://www.epa.gov/npdes/construction-general-permit",
        relevance: 0.9
      },
      {
        title: "Stormwater Best Management Practices",
        content: "Comprehensive collection of structural and non-structural BMPs for stormwater quality and quantity management, including selection criteria and design specifications.",
        url: "https://www.epa.gov/nps/urban-runoff-low-impact-development",
        relevance: 0.85
      },
      {
        title: "QSD Certification Requirements",
        content: "Requirements and guidance for Qualified SWPPP Developer certification, including training requirements and responsibilities for SWPPP preparation and oversight.",
        url: "https://www.epa.gov/npdes/qualified-swppp-developer-qsd-certification",
        relevance: 0.8
      },
      {
        title: "Erosion and Sediment Control Manual",
        content: "Technical guidance for erosion and sediment control practices, including installation, inspection, and maintenance procedures for construction sites.",
        url: "https://www.epa.gov/npdes/erosion-and-sediment-control",
        relevance: 0.75
      }
    ];

    // Filter based on options
    let filteredResults = results;

    if (options.includeRegulations) {
      filteredResults = results.filter(r => 
        r.title.toLowerCase().includes('permit') || 
        r.title.toLowerCase().includes('regulation') ||
        r.content.toLowerCase().includes('requirement')
      );
    }

    if (options.includeBMPs) {
      filteredResults = filteredResults.concat(results.filter(r => 
        r.title.toLowerCase().includes('bmp') || 
        r.content.toLowerCase().includes('best management')
      ));
    }

    // Filter by query relevance
    const queryLower = query.toLowerCase();
    return filteredResults.filter(result => 
      result.title.toLowerCase().includes(queryLower) ||
      result.content.toLowerCase().includes(queryLower) ||
      this.hasStormwaterKeywords(queryLower, result.content.toLowerCase())
    ).slice(0, 8);
  }

  private hasStormwaterKeywords(query: string, content: string): boolean {
    const keywords = ['stormwater', 'swppp', 'qsd', 'erosion', 'bmp', 'construction', 'permit', 'runoff'];
    return keywords.some(keyword => 
      query.includes(keyword) && content.includes(keyword)
    );
  }
}