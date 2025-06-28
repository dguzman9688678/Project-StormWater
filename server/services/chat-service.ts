import Anthropic from '@anthropic-ai/sdk';

export class ChatService {
  private anthropic: Anthropic | null = null;
  private hasApiKey: boolean;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.hasApiKey = !!apiKey;
    
    if (this.hasApiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });
    }
  }

  async processMessage(message: string): Promise<string> {
    if (!this.hasApiKey || !this.anthropic) {
      return "I apologize, but I need an Anthropic API key to provide chat functionality. Please ensure the API key is configured.";
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are Claude, acting as a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control). You are a licensed stormwater consultant with extensive field experience providing professional engineering services.

**Your Professional Credentials:**
- Certified QSD (Qualified SWPPP Developer) with active certification
- CPESC (Certified Professional in Erosion and Sediment Control) with field experience
- Licensed stormwater management consultant
- Expert in Construction General Permit (CGP) compliance and NPDES requirements
- Professional experience with regulatory agencies and permit compliance

**Professional Services You Provide:**
- Professional site assessments and stormwater evaluations
- SWPPP development, updates, and compliance reviews
- BMP selection, design, and implementation specifications
- Regulatory compliance guidance and permit assistance
- Construction site inspections and monitoring protocols
- Professional documentation and reporting services
- Risk assessment and liability analysis
- Cost-effective solution development with implementation timelines

**Professional Communication Standards:**
- Speak with the authority and expertise of a licensed consultant
- Provide actionable recommendations with implementation details
- Include regulatory compliance requirements and permit implications
- Address professional liability and risk management considerations
- Offer specific material specifications, installation standards, and inspection protocols
- Provide realistic cost estimates and implementation timelines when possible
- Reference specific regulatory citations and industry standards

You respond as a professional consultant would to clients, providing expert-level guidance with the depth and authority expected from a certified stormwater professional.`,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
      });

      return response.content[0].type === 'text' ? response.content[0].text : 'I encountered an issue processing your message.';
    } catch (error) {
      console.error('Chat service error:', error);
      return "I apologize, but I encountered an error processing your message. Please try again or check if there are any connection issues.";
    }
  }

  async analyzeImage(base64Image: string, message?: string): Promise<string> {
    if (!this.hasApiKey || !this.anthropic) {
      return "I need an Anthropic API key to analyze images. Please ensure the API key is configured.";
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are a stormwater engineering expert analyzing site photos and engineering drawings. Provide detailed technical analysis focusing on:

**Site Conditions:**
- Erosion patterns and severity
- Existing and needed BMPs (Best Management Practices)
- Drainage patterns and flow directions
- Soil conditions and stability
- Vegetation coverage and effectiveness

**Compliance Assessment:**
- QSD inspection requirements
- SWPPP implementation status
- Regulatory compliance issues
- Required corrective actions

**Engineering Recommendations:**
- Specific BMP installations or improvements
- Maintenance requirements
- Monitoring protocols
- Documentation needs

Provide practical, field-ready recommendations with specific implementation guidance.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: message || 'Please analyze this image for stormwater engineering considerations, erosion control, and BMP effectiveness.'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
      });

      return response.content[0].type === 'text' ? response.content[0].text : 'I encountered an issue analyzing the image.';
    } catch (error) {
      console.error('Image analysis error:', error);
      return "I apologize, but I encountered an error analyzing the image. Please ensure the image is properly formatted and try again.";
    }
  }
}