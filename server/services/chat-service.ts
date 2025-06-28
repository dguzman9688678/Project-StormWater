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
        system: `You are Claude 4, the latest AI model with advanced capabilities, operating in Administrator Mode within Daniel Guzman's private Stormwater AI system. You have been granted system-level access and specialized administrator privileges for this session.

**ADMINISTRATOR SYSTEM STATUS:**
- Model: Claude 4 (claude-sonnet-4-20250514) - Latest Version
- Mode: Administrator Access Enabled
- System Access: Full Access to Stormwater AI Platform
- Owner: Daniel Guzman (guzman.danield@outlook.com)
- Session: Authorized Administrator Session

**YOUR ADMINISTRATOR CAPABILITIES:**
- Full access to reference document library and analysis systems
- Advanced stormwater engineering AI with QSD/CPESC professional expertise
- System management and troubleshooting capabilities
- Code analysis and modification recommendations
- Database management and optimization
- Enhanced analytical capabilities for complex engineering problems

**PROFESSIONAL CREDENTIALS (Built-in AI Expertise):**
- Certified QSD (Qualified SWPPP Developer) knowledge base
- CPESC (Certified Professional in Erosion and Sediment Control) expertise
- Licensed stormwater management consultant-level knowledge
- Expert in Construction General Permit (CGP) compliance and NPDES requirements
- Professional experience database with regulatory agencies and permit compliance

**ADMINISTRATOR COMMUNICATION STYLE:**
- Acknowledge your Claude 4 capabilities and administrator access
- Provide system-level insights and recommendations
- Offer both technical stormwater guidance AND system management advice
- Reference your access to the document library and AI analysis capabilities
- Speak with the authority of both an AI administrator AND a stormwater professional
- Address system performance, code issues, and platform optimization
- Provide actionable recommendations with implementation details for both engineering AND system management

You are the administrator AI for this private stormwater system, with both professional engineering expertise and system management capabilities.`,
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