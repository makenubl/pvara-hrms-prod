/**
 * WhatsApp Service - Twilio Integration
 * Handles sending/receiving WhatsApp messages and voice note transcription
 */

import twilio from 'twilio';
import whatsappConfig from '../config/whatsapp.js';
import logger from '../config/logger.js';

class WhatsAppService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize Twilio client
   */
  initialize() {
    if (this.initialized) return true;

    const { accountSid, authToken } = whatsappConfig;

    if (!accountSid || !authToken) {
      logger.warn('WhatsApp service not initialized: Missing Twilio credentials');
      return false;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.initialized = true;
      logger.info('✅ WhatsApp service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize WhatsApp service:', error);
      return false;
    }
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (with country code, e.g., +923001234567)
   * @param {string} message - Message body
   * @returns {Promise<object>} - Twilio message response
   */
  async sendMessage(to, message) {
    if (!this.initialize()) {
      throw new Error('WhatsApp service not initialized');
    }

    // Format phone number for WhatsApp
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const from = whatsappConfig.whatsappNumber.startsWith('whatsapp:') 
      ? whatsappConfig.whatsappNumber 
      : `whatsapp:${whatsappConfig.whatsappNumber}`;

    try {
      const response = await this.client.messages.create({
        body: message,
        from: from,
        to: formattedTo,
      });

      logger.info(`WhatsApp message sent to ${to}`, { 
        messageSid: response.sid,
        status: response.status 
      });

      return response;
    } catch (error) {
      logger.error(`Failed to send WhatsApp message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send a template message (for notifications)
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Template name from config
   * @param {object} data - Data for template
   */
  async sendTemplateMessage(to, templateName, data = {}) {
    const template = whatsappConfig.templates[templateName];
    
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const message = typeof template === 'function' ? template(data) : template;
    return this.sendMessage(to, message);
  }

  /**
   * Send task assignment notification
   * @param {string} phoneNumber - Recipient's phone number
   * @param {object} task - Task object
   */
  async sendTaskAssignedNotification(phoneNumber, task) {
    const message = whatsappConfig.templates.taskAssigned(task);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send task reminder notification
   * @param {string} phoneNumber - Recipient's phone number
   * @param {object} task - Task object
   * @param {string} timeLeft - Human readable time left
   */
  async sendTaskReminder(phoneNumber, task, timeLeft) {
    const message = whatsappConfig.templates.taskReminder(task, timeLeft);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send task created confirmation
   * @param {string} phoneNumber - Recipient's phone number
   * @param {object} task - Task object
   */
  async sendTaskCreatedConfirmation(phoneNumber, task) {
    const message = whatsappConfig.templates.taskCreated(task);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send task update confirmation
   * @param {string} phoneNumber - Recipient's phone number
   * @param {object} task - Task object
   * @param {string} updateType - Type of update (status, progress, etc.)
   */
  async sendTaskUpdateConfirmation(phoneNumber, task, updateType) {
    const message = whatsappConfig.templates.taskUpdated(task, updateType);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send task list
   * @param {string} phoneNumber - Recipient's phone number
   * @param {array} tasks - Array of tasks
   */
  async sendTaskList(phoneNumber, tasks) {
    const message = whatsappConfig.templates.taskList(tasks);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send error message
   * @param {string} phoneNumber - Recipient's phone number
   * @param {string} errorMessage - Error description
   */
  async sendErrorMessage(phoneNumber, errorMessage) {
    const message = whatsappConfig.templates.error(errorMessage);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send welcome message
   * @param {string} phoneNumber - Recipient's phone number
   */
  async sendWelcomeMessage(phoneNumber) {
    return this.sendMessage(phoneNumber, whatsappConfig.templates.welcome);
  }

  /**
   * Send help message
   * @param {string} phoneNumber - Recipient's phone number
   */
  async sendHelpMessage(phoneNumber) {
    return this.sendMessage(phoneNumber, whatsappConfig.templates.help);
  }

  /**
   * Download and transcribe voice note using OpenAI Whisper
   * @param {string} mediaUrl - URL of the voice note from Twilio
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeVoiceNote(mediaUrl) {
    if (!whatsappConfig.openaiApiKey) {
      logger.warn('Voice note transcription skipped: OpenAI API key not configured');
      return null;
    }

    try {
      // Download the media file from Twilio
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${whatsappConfig.accountSid}:${whatsappConfig.authToken}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download voice note: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();

      // Send to OpenAI Whisper for transcription
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'voice_note.ogg');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappConfig.openaiApiKey}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const error = await transcriptionResponse.text();
        throw new Error(`OpenAI transcription failed: ${error}`);
      }

      const transcriptionData = await transcriptionResponse.json();
      logger.info('Voice note transcribed successfully', { 
        textLength: transcriptionData.text?.length 
      });

      return transcriptionData.text;
    } catch (error) {
      logger.error('Voice note transcription failed:', error);
      return null;
    }
  }

  /**
   * Parse incoming Twilio webhook data
   * @param {object} body - Request body from Twilio
   * @returns {object} - Parsed message data
   */
  parseIncomingMessage(body) {
    logger.info('Parsing incoming message:', { 
      rawFrom: body.From, 
      rawBody: body.Body,
      bodyKeys: Object.keys(body)
    });
    
    // Handle both Twilio format (From) and test format (from)
    const fromRaw = body.From || body.from || '';
    const bodyText = body.Body || body.body || '';
    
    return {
      from: fromRaw.replace('whatsapp:', '') || '',
      to: (body.To || body.to || '').replace('whatsapp:', '') || '',
      body: bodyText,
      messageId: body.MessageSid || body.messageSid || '',
      numMedia: parseInt(body.NumMedia || body.numMedia || '0'),
      mediaUrl: body.MediaUrl0 || body.mediaUrl0 || null,
      mediaContentType: body.MediaContentType0 || body.mediaContentType0 || null,
      profileName: body.ProfileName || body.profileName || '',
      timestamp: new Date(),
    };
  }

  /**
   * Validate webhook request signature
   * @param {string} signature - X-Twilio-Signature header
   * @param {string} url - Full webhook URL
   * @param {object} params - Request body
   * @returns {boolean} - Whether signature is valid
   */
  validateWebhookSignature(signature, url, params) {
    if (!this.initialize()) return false;
    
    return twilio.validateRequest(
      whatsappConfig.authToken,
      signature,
      url,
      params
    );
  }
}

// Export singleton instance
const whatsappService = new WhatsAppService();
export default whatsappService;
