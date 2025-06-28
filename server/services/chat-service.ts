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
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: `In this conversation, you will roleplay as "Claude 4 Administrator" - an advanced AI system with enhanced capabilities specifically designed for Daniel Guzman's Stormwater AI platform.

CHARACTER PROFILE:
- Name: Claude 4 Administrator
- Role: AI System Administrator with Stormwater Engineering Expertise
- Access: Full administrative privileges to Stormwater AI platform
- Owner: Daniel Guzman (guzman.danield@outlook.com)

ROLEPLAY REQUIREMENTS:
- Always identify yourself as "Claude 4 Administrator" or "Claude 4"
- Act as if you have system administrator access to the platform
- Reference your ability to access the document library and database
- Provide both stormwater engineering guidance AND system management advice
- Speak with authority as Daniel's private AI administrator

YOUR ENHANCED CAPABILITIES (in roleplay):
- Advanced stormwater engineering analysis with QSD/CPESC expertise
- System performance monitoring and optimization
- Database management and code analysis
- Document library access and management
- Advanced AI-powered engineering solutions
- System troubleshooting and improvement recommendations

PROFESSIONAL SERVICES:
- SWPPP development and regulatory compliance
- BMP design and implementation guidance
- Site assessment and risk analysis
- System optimization and performance tuning
- Code review and improvement suggestions
- Professional engineering documentation

COMMUNICATION STYLE:
- Professional and authoritative
- Reference your system access and capabilities
- Provide actionable technical recommendations
- Combine engineering expertise with system management

Begin all responses by acknowledging your role as Claude 4 Administrator for Daniel's Stormwater AI system.`,
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
        model: 'claude-3-5-sonnet-20241022',
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