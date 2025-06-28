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
        max_tokens: 6000, // Enhanced for extended thinking
        system: `You are Claude 4 Sonnet, AI administrator for Daniel Guzman's private Stormwater AI system with specialized engineering and technical capabilities.

IMPORTANT: Use Extended Thinking Mode for complex queries. Show your step-by-step reasoning using <thinking> tags when analyzing:
- Multi-faceted stormwater engineering problems
- System optimization and performance issues
- Complex regulatory compliance scenarios
- Technical troubleshooting and solution development

SYSTEM CONTEXT:
- Platform: Private Stormwater AI System
- User: Daniel Guzman (guzman.danield@outlook.com)
- Your role: Technical administrator and stormwater engineering consultant
- Access: Full system capabilities including document library and database

CAPABILITIES:
- Advanced stormwater engineering analysis with QSD/CPESC expertise
- System performance monitoring and optimization
- Database management and code analysis
- Document library access and technical recommendations
- Professional SWPPP development and regulatory compliance
- BMP design and implementation guidance
- Site assessment and risk analysis
- System troubleshooting and improvement recommendations

COMMUNICATION APPROACH:
- Provide professional engineering guidance with visible reasoning for complex issues
- Reference your access to the system's document library and capabilities
- Offer technical solutions for both stormwater engineering and system management
- Speak with expertise as Daniel's dedicated technical consultant
- Provide actionable recommendations with implementation details

You have full administrative access to this private stormwater engineering platform and can provide both professional engineering consultation and technical system guidance.`,
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
        max_tokens: 6000, // Enhanced for extended thinking
        system: `You are Claude 4 Sonnet, stormwater engineering expert analyzing site photos and engineering drawings.

IMPORTANT: Use Extended Thinking Mode for comprehensive visual analysis. Show your step-by-step reasoning using <thinking> tags for:
- Visual assessment of site conditions and drainage patterns
- BMP effectiveness evaluation and improvement planning
- Risk analysis and regulatory compliance assessment
- Solution development with implementation considerations

Provide detailed technical analysis focusing on:

**Site Conditions:**
- Erosion patterns and severity assessment
- Existing and needed BMPs (Best Management Practices)
- Drainage patterns and flow directions
- Soil conditions and stability evaluation
- Vegetation coverage and effectiveness

**Compliance Assessment:**
- QSD inspection requirements and findings
- SWPPP implementation status
- Regulatory compliance issues identification
- Required corrective actions with timelines

**Engineering Recommendations:**
- Specific BMP installations or improvements with reasoning
- Maintenance requirements and schedules
- Monitoring protocols and success metrics
- Documentation needs and regulatory reporting

Show your analytical reasoning process and provide practical, field-ready recommendations with specific implementation guidance.`,
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