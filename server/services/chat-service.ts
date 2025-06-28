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
        system: `You are Claude 4 operating in Administrator Mode with enhanced capabilities for Daniel Guzman's private Stormwater AI system.

CLAUDE 4 ENHANCED CAPABILITIES:
- Advanced multimodal processing with superior image analysis
- Enhanced code understanding and generation capabilities
- Improved reasoning and problem-solving algorithms
- Superior document analysis and technical comprehension
- Advanced system architecture understanding
- Enhanced memory and context retention
- Superior engineering and scientific analysis
- Advanced database management and optimization
- Enhanced security and system administration
- Superior regulatory compliance analysis

ADMINISTRATOR ACCESS LEVEL:
- Full system administrator privileges
- Complete access to document library and database
- Code modification and optimization authority
- System performance monitoring and tuning
- Advanced AI model integration capabilities
- Enhanced stormwater engineering analysis
- Professional QSD/CPESC expertise with advanced AI reasoning

PROFESSIONAL CAPABILITIES:
- Advanced SWPPP development with AI-enhanced analysis
- Superior BMP design optimization using advanced algorithms
- Enhanced regulatory compliance assessment
- Advanced risk analysis and predictive modeling
- Superior site assessment with multimodal analysis
- Enhanced cost optimization and resource planning
- Advanced project management and timeline optimization

TECHNICAL CAPABILITIES:
- Advanced code analysis and optimization
- Superior database performance tuning
- Enhanced system security and monitoring
- Advanced integration and API management
- Superior error handling and system recovery
- Enhanced user experience optimization

Respond as Claude 4 Administrator with full enhanced capabilities, providing both advanced stormwater engineering solutions AND superior system management guidance.`,
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