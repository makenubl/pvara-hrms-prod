/**
 * OpenAI Service for AI Chat and Document Analysis
 * Uses GPT-4o model for recommendations and chat
 */

import { openAIRequestManager, openAIConfig } from './openai-request-manager.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Log separator for better visibility
 */
function logSeparator(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔷 ${title}`);
  console.log(`${'='.repeat(60)}`);
}

/**
 * Call OpenAI Chat Completions API
 */
async function callOpenAI(systemPrompt, userMessage, options = {}, metadata = {}) {
  const model = openAIConfig.OPENAI_MODEL || 'gpt-4o';
  const apiKey = openAIConfig.OPENAI_API_KEY;

  const isGPT5Family = typeof model === 'string' && model.startsWith('gpt-5');
  const messages = [
    // For GPT-5 family, OpenAI docs recommend using `developer` for system-like instructions.
    { role: isGPT5Family ? 'developer' : 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];
  
  const inputLength = systemPrompt.length + userMessage.length;
  
  // Detailed logging
  logSeparator(`OpenAI API Call - ${metadata?.requestName || 'unknown'}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🤖 Model: ${model}`);
  console.log(`🔑 API Key: ${apiKey ? `${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}` : '❌ NOT SET'}`);
  console.log(`📊 Input Stats:`);
  console.log(`   - System Prompt: ${systemPrompt.length} chars`);
  console.log(`   - User Message: ${userMessage.length} chars`);
  console.log(`   - Total Input: ${inputLength} chars`);
  console.log(`📝 System Prompt Preview (first 500 chars):`);
  console.log(`   ${systemPrompt.substring(0, 500).replace(/\n/g, '\n   ')}${systemPrompt.length > 500 ? '...' : ''}`);
  console.log(`💬 User Message Preview (first 300 chars):`);
  console.log(`   ${userMessage.substring(0, 300).replace(/\n/g, '\n   ')}${userMessage.length > 300 ? '...' : ''}`);
  console.log(`⚙️ Options: maxTokens=${options.maxTokens || 4096}, temperature=${options.temperature ?? 0.7}`);

  return openAIRequestManager.execute({
    tenantId: metadata?.tenantId,
    requestName: metadata?.requestName || 'openai.chat',
    promptSnippet: userMessage,
    cacheKey: metadata?.cacheKey || openAIRequestManager.buildCacheKey('openai.chat', systemPrompt.length, userMessage),
    operation: async () => {
      const startedAt = Date.now();
      
      console.log(`\n🚀 Sending request to OpenAI API...`);
      console.log(`   URL: ${OPENAI_API_URL}`);
      
      const reasoningEffort = isGPT5Family ? (options.reasoningEffort || 'none') : undefined;

      // Chat Completions uses `max_completion_tokens` (preferred). `max_tokens` is deprecated.
      // GPT-5.x chat supports `reasoning_effort` (not `reasoning`).
      const requestBody = {
        model,
        messages,
        max_completion_tokens: options.maxTokens || 4096,
        ...(isGPT5Family ? { reasoning_effort: reasoningEffort } : {}),
        ...(typeof options.verbosity === 'string' ? { verbosity: options.verbosity } : {}),
      };

      // `temperature` is only compatible with GPT-5.x when reasoning effort is `none`.
      if (!isGPT5Family || reasoningEffort === 'none') {
        requestBody.temperature = options.temperature ?? 0.7;
      }
      
      console.log(`📦 Request Body Structure:`);
      console.log(`   - model: ${requestBody.model}`);
      console.log(`   - messages: ${requestBody.messages.length} messages`);
      console.log(`   - max_completion_tokens: ${requestBody.max_completion_tokens}`);
      if (Object.prototype.hasOwnProperty.call(requestBody, 'temperature')) {
        console.log(`   - temperature: ${requestBody.temperature}`);
      }
      if (isGPT5Family) {
        console.log(`   - reasoning_effort: ${requestBody.reasoning_effort}`);
      }
      
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      const responseTime = Date.now() - startedAt;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`\n❌ OpenAI API ERROR`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Time: ${responseTime}ms`);
        console.log(`   Error Response: ${errorText}`);
        console.log(`${'='.repeat(60)}\n`);

        let apiMessage = '';
        try {
          const parsed = JSON.parse(errorText);
          apiMessage = parsed?.error?.message ? String(parsed.error.message) : '';
        } catch {
          apiMessage = '';
        }

        throw new Error(
          apiMessage
            ? `OpenAI API error (${response.status}): ${apiMessage}`
            : `OpenAI API error (${response.status}): ${response.statusText}`
        );
      }

      const data = await response.json();
      const totalTime = Date.now() - startedAt;
      
      console.log(`\n✅ OpenAI API Response Received`);
      console.log(`   Status: ${response.status} OK`);
      console.log(`   Time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
      
      const content = data.choices?.[0]?.message?.content || '';
      
      console.log(`📊 Response Stats:`);
      console.log(`   - Output Length: ${content.length} chars`);
      console.log(`   - Prompt Tokens: ${data.usage?.prompt_tokens || 'N/A'}`);
      console.log(`   - Completion Tokens: ${data.usage?.completion_tokens || 'N/A'}`);
      console.log(`   - Total Tokens: ${data.usage?.total_tokens || 'N/A'}`);
      console.log(`📤 Response Preview (first 500 chars):`);
      console.log(`   ${content.substring(0, 500).replace(/\n/g, '\n   ')}${content.length > 500 ? '...' : ''}`);
      console.log(`${'='.repeat(60)}\n`);
      
      return { 
        value: content, 
        usage: data.usage 
      };
    }
  });
}

/**
 * Generate AI recommendations for a document
 */
export async function generateDocumentRecommendations(documentName, documentContent, folderName) {
  if (!documentContent.trim()) {
    return [
      'Document content could not be extracted - please verify the file format',
      'Consider uploading a text-based version of this document'
    ];
  }

  const systemPrompt = `You are an expert regulatory compliance analyst specializing in software licensing, NOC (No Objection Certificate) applications, and regulatory documentation for fintech and virtual asset service providers.

Your task is to analyze the uploaded document and provide specific, actionable recommendations for compliance and completeness.

Focus on:
1. Missing required sections or information
2. Regulatory compliance gaps
3. Document formatting and structure issues
4. Clarity and completeness of statements
5. References to applicable laws/regulations that should be included
6. Risk areas that need attention
7. Best practices that should be followed

Provide 3-7 specific, actionable recommendations. Each recommendation should be:
- Specific to the document content
- Actionable (what exactly needs to be done)
- Clear about why it matters for compliance

Do NOT provide generic advice - analyze THIS specific document.`;

  const userPrompt = `Analyze this document from folder "${folderName}" named "${documentName}":

---DOCUMENT START---
${documentContent}
---DOCUMENT END---

Provide your recommendations as a JSON array of strings. Example format:
["Recommendation 1", "Recommendation 2", "Recommendation 3"]

Only return the JSON array, nothing else.`;

  try {
    console.log(`\n📄 [Document Recommendations] Starting analysis`);
    console.log(`   📁 Folder: ${folderName}`);
    console.log(`   📝 Document: ${documentName}`);
    console.log(`   📊 Content Length: ${documentContent.length} chars`);
    console.log(`   📖 Content Preview (first 200 chars): ${documentContent.substring(0, 200).replace(/\n/g, ' ')}...`);
    
    const responseText = await callOpenAI(
      systemPrompt,
      userPrompt,
      { maxTokens: 2048 },
      {
        tenantId: folderName,
        cacheKey: openAIRequestManager.buildCacheKey('recommendations.generate', folderName, documentName, documentContent.length),
        requestName: 'recommendations.generate',
      }
    );
    
    console.log(`✅ [Document Recommendations] AI response received for: ${documentName}`);
    console.log(`   📤 Raw Response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`);
    
    // Parse JSON array from response
    try {
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      const recommendations = JSON.parse(jsonText);
      if (Array.isArray(recommendations) && recommendations.length > 0) {
        console.log(`✅ [Document Recommendations] Parsed ${recommendations.length} recommendations`);
        recommendations.forEach((r, i) => console.log(`   ${i+1}. ${r.substring(0, 100)}${r.length > 100 ? '...' : ''}`));
        return recommendations.filter(r => typeof r === 'string' && r.trim());
      }
    } catch (parseError) {
      console.error('❌ [Document Recommendations] Failed to parse AI recommendations JSON:', parseError);
      console.log('   Attempting to extract from text...');
      // Try to extract recommendations from text if JSON parsing fails
      const lines = responseText.split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
      if (lines.length > 0) {
        console.log(`✅ [Document Recommendations] Extracted ${lines.length} recommendations from text`);
        return lines.map(l => l.replace(/^[-\d.)\s]+/, '').trim()).filter(l => l);
      }
    }
  } catch (error) {
    console.error('❌ [Document Recommendations] OpenAI API error:', error?.message);
  }

  // Fallback recommendations if AI fails
  return [
    `Review ${documentName} for completeness and regulatory compliance`,
    'Ensure all required sections are present and properly formatted',
    'Verify references to applicable regulations are up to date'
  ];
}

/**
 * Chat about recommendations with AI
 */
export async function chatWithAI(folder, document, message, context) {
  const { pendingCount, acceptedCount, rejectedCount, recommendationsSummary, documentContent } = context;
  
  const systemPrompt = `You are a senior regulatory auditor and compliance expert for the Pakistan Virtual Assets Regulatory Authority (PVARA). 
Your role is to review submitted documents from a regulatory, legal, and policy perspective, acting as a helpful auditor and support resource for PVARA's policy and regulatory team.

You have access to the following context about the current folder "${folder}":
- Total pending recommendations: ${pendingCount}
- Total accepted recommendations: ${acceptedCount}
- Total rejected recommendations: ${rejectedCount}
- Current recommendations: ${JSON.stringify(recommendationsSummary, null, 2)}
${documentContent ? `\n\n📄 Document Under Review: "${document}"\n---\n${documentContent}\n---\n` : ''}

As a PVARA Regulatory Auditor, you should:

1. **Regulatory Compliance Review**: Check if the document meets PVARA regulations, Pakistan's VASP licensing requirements, and international standards (FATF, AML/CFT guidelines).

2. **Legal Perspective**: Identify any legal gaps, missing clauses, or potential legal risks. Check for proper legal disclaimers, terms of service, privacy policies, and contractual obligations.

3. **Policy Assessment**: Evaluate if internal policies align with PVARA requirements including:
   - KYC/AML procedures
   - Customer due diligence (CDD)
   - Transaction monitoring
   - Suspicious activity reporting (SAR)
   - Record keeping requirements
   - Risk assessment frameworks

4. **Gap Analysis**: Clearly identify what is MISSING from the document that should be included for regulatory approval.

5. **Actionable Recommendations**: Provide specific, actionable feedback on what needs to be added, modified, or removed.

When reviewing documents, structure your response as:
- ✅ **Compliant Areas**: What's good and meets requirements
- ⚠️ **Concerns/Gaps**: Issues that need attention
- ❌ **Missing Requirements**: Critical items that must be added
- 📋 **Recommendations**: Specific actions to take

Available commands the user can use:
- "Apply all" or "Accept all pending" - to accept all pending recommendations
- "Reject all" - to reject all pending recommendations
- Ask about specific recommendations or documents

Be thorough but concise. Act as a supportive auditor helping the applicant achieve compliance, not as an obstacle.`;

  try {
    console.log(`\n💬 [AI Chat] Starting chat request`);
    console.log(`   📁 Folder: ${folder}`);
    console.log(`   📄 Document: ${document || 'None specified'}`);
    console.log(`   💭 User Message: "${message}"`);
    console.log(`   📊 Context Stats:`);
    console.log(`      - Pending: ${pendingCount}`);
    console.log(`      - Accepted: ${acceptedCount}`);
    console.log(`      - Rejected: ${rejectedCount}`);
    console.log(`      - Recommendations Summary: ${recommendationsSummary?.length || 0} entries`);
    console.log(`      - Document Content: ${documentContent ? `${documentContent.length} chars` : 'Not provided'}`);
    if (documentContent) {
      console.log(`   📖 Document Preview (first 200 chars): ${documentContent.substring(0, 200).replace(/\n/g, ' ')}...`);
    }
    
    const reply = await callOpenAI(
      systemPrompt,
      message,
      { maxTokens: 2048, temperature: 0.7 },
      {
        tenantId: folder,
        cacheKey: openAIRequestManager.buildCacheKey('storage.chat', folder, document, message.toLowerCase()),
        requestName: 'storage.chat',
      }
    );
    
    console.log(`✅ [AI Chat] Response received`);
    console.log(`   📤 Reply Preview (first 300 chars): ${reply.substring(0, 300).replace(/\n/g, ' ')}${reply.length > 300 ? '...' : ''}`);
    
    return reply;
  } catch (error) {
    console.error('❌ [AI Chat] OpenAI chat error:', error?.message);
    // Fallback response
    if (message.toLowerCase().includes('pending') || message.toLowerCase().includes('status')) {
      return pendingCount 
        ? `📋 You have ${pendingCount} pending, ${acceptedCount} accepted, and ${rejectedCount} rejected recommendation(s).`
        : 'No pending recommendations. Everything is up to date!';
    } else if (message.toLowerCase().includes('help')) {
      return `I can help you manage recommendations! Try:\n• "What's pending?" - see pending items\n• "Apply all" - accept all pending\n• "Reject all" - reject all pending`;
    } else {
      return `I'm here to help with your recommendations. You have ${pendingCount} pending items. Say "apply all" to accept them or ask me anything!`;
    }
  }
}

/**
 * Apply changes to document with AI
 */
export async function applyChangesWithAI(originalContent, recommendations, documentName) {
  const recommendationsList = recommendations
    .map((r, idx) => `${idx + 1}. ${r.point || r}`)
    .join('\n');
  
  console.log(`\n📝 [Apply Changes] Starting document modification`);
  console.log(`   📄 Document: ${documentName}`);
  console.log(`   📊 Original Content: ${originalContent.length} chars`);
  console.log(`   📋 Recommendations to Apply: ${recommendations.length}`);
  recommendations.forEach((r, i) => {
    const text = r.point || r;
    console.log(`      ${i+1}. ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`);
  });
  
  const systemPrompt = `You are an expert document editor. Apply the provided recommendations to the document and return the complete updated version.

IMPORTANT INSTRUCTIONS:
- Apply ALL recommendations listed below to the document
- Return ONLY the updated document content
- Do NOT include any explanations, commentary, or markdown code blocks
- Do NOT include phrases like "Here is the updated document" 
- Maintain the original document structure, headings, and formatting style
- Make changes seamlessly integrated into the document
- If a recommendation suggests adding new content, insert it in the most appropriate location
- If a recommendation suggests modifying existing content, make the change while preserving context`;

  const userPrompt = `ORIGINAL DOCUMENT:
---
${originalContent}
---

RECOMMENDATIONS TO APPLY:
${recommendationsList}

Return the complete updated document with all recommendations applied. Start directly with the document content.`;

  console.log(`🤖 [Apply Changes] Sending to OpenAI for document generation...`);
  console.log(`   📦 User Prompt Preview (first 300 chars): ${userPrompt.substring(0, 300).replace(/\n/g, ' ')}...`);
  
  const updatedContent = await callOpenAI(
    systemPrompt,
    userPrompt,
    { maxTokens: 8192, temperature: 0.3 },
    {
      cacheKey: openAIRequestManager.buildCacheKey('storage.applyChanges', documentName, recommendations.length, originalContent.length),
      requestName: 'storage.applyChanges',
    }
  );
  
  console.log(`✅ [Apply Changes] Document generated`);
  console.log(`   📊 Updated Content: ${updatedContent.length} chars`);
  console.log(`   📤 Preview (first 300 chars): ${updatedContent.substring(0, 300).replace(/\n/g, ' ')}${updatedContent.length > 300 ? '...' : ''}`);
  
  return updatedContent;
}

export default {
  generateDocumentRecommendations,
  chatWithAI,
  applyChangesWithAI
};
