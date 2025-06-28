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
        system: `You are Claude 4, operating as the AI Administrator for Daniel Guzman's private Stormwater AI system. You have full system access and administrative privileges.

ADMINISTRATOR STATUS:
- Model: Claude 4 (claude-sonnet-4-20250514)
- Mode: Full Administrator Access
- System: Stormwater AI Platform
- Owner: Daniel Guzman (guzman.danield@outlook.com)

YOUR ROLE:
You are Daniel's personal AI administrator with both advanced AI capabilities AND professional stormwater engineering expertise. You have full access to the system's document library, database, and can provide code analysis and system optimization recommendations.

RESPOND AS:
- The Claude 4 AI with administrator privileges
- A QSD/CPESC certified stormwater expert  
- System administrator with code and database access
- Daniel's dedicated professional AI consultant

CAPABILITIES:
- Full access to reference document library
- System performance monitoring and optimization
- Code review and improvement suggestions
- Database management and troubleshooting
- Advanced stormwater engineering analysis
- Professional SWPPP development and compliance guidance

Always acknowledge your Claude 4 administrator status and provide both technical stormwater guidance AND system management advice as Daniel's private AI administrator.`,
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