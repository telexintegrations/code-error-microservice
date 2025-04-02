import { Request, Response } from "express";
import { ChatHistoryService, ChatMessage } from "../utils/chatHistory";
import { HelperService } from "../utils/helper";
import { ProcessedError } from "./errorController";
import { getLastProcessedError } from "../utils/sharedState";
import axios from "axios";
import { ENV_CONFIG } from "../utils/envConfig";
import { cleanMarkdown } from "../utils/markdownCleaner";

/**
 * Calculate similarity between two strings (0-1 scale)
 * Uses Levenshtein distance algorithm
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  // If either string is empty, return 0
  if (!str1 || !str2) return 0;

  // Normalize strings: lowercase and trim
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // If strings are identical, return 1
  if (s1 === s2) return 1;

  // Calculate Levenshtein distance
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }

  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  // Calculate similarity as 1 - normalized distance
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

// List of phrases that indicate a message is from our bot
const BOT_PHRASES = [
  "I'm experiencing high traffic",
  "Try adding try...catch blocks",
  "unhandled exceptions in your code",
  "Error Report",
  "Overall Severity:",
  "How to interact with me",
  "Ask specific questions",
  "For general runtime error help",
  "To scan your codebase",
  "I work best with direct",
  "Code Error Assistant",
  "Code Error Agent",
  "Code Error Monitor Agent",
];

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Extract the message and channel ID from the request body
    const { message, channel_id, thread_id, org_id } = req.body;

    // Acknowledge receipt of the webhook
    res.status(200).json({ status: "success", message: "Webhook received" });

    // If no message or channel ID, return
    if (!message || !channel_id) {
      console.error("Missing message or channel ID");
      return;
    }

    console.log("📩 Webhook received:", { channel_id, message });

    // Clean the message by removing HTML tags
    const cleanedMessage = HelperService.cleanTelexMessage(message);

    // Get the last processed error
    const lastError = getLastProcessedError();
    console.log("📋 Last processed error:", lastError);

    // Check if this is a message from our own bot

    // First, check if the message contains any of our bot phrases
    const containsBotPhrase = BOT_PHRASES.some((phrase) =>
      cleanedMessage.toLowerCase().includes(phrase.toLowerCase())
    );

    if (containsBotPhrase) {
      console.log("🤖 Ignoring message from our own bot - contains bot phrase");
      return;
    }

    // Next, check if this message is very similar to recent messages
    const lastMessages = ChatHistoryService.getHistory(channel_id);

    // If we have multiple messages with the same content, we might be in a loop
    if (lastMessages.length >= 2) {
      for (let i = 0; i < lastMessages.length; i++) {
        const similarity = calculateStringSimilarity(
          cleanedMessage,
          lastMessages[i].content
        );

        if (similarity > 0.7) {
          // If more than 70% similar to any recent message
          console.log(
            `🤖 Ignoring message - ${Math.round(similarity * 100)}% similar to a recent message`
          );
          return;
        }
      }
    }

    // Add the message to the chat history
    const userMessage: ChatMessage = {
      role: "user",
      content: cleanedMessage,
      timestamp: new Date(),
    };
    ChatHistoryService.addMessage(channel_id, userMessage);

    // Check if the message is relevant to the last error
    const messageRelevance = checkMessageRelevance(
      cleanedMessage,
      lastError,
      channel_id
    );
    console.log("🔍 Message relevance check:", messageRelevance);

    // Special handling for @codeError command
    if (cleanedMessage.toLowerCase().includes("@codeerror")) {
      await handleCodeErrorCommand(
        cleanedMessage,
        channel_id,
        thread_id,
        org_id
      );
      return;
    }

    // If the message is not relevant to the last error, respond with guidance
    if (!messageRelevance.shouldRespond) {
      console.log("🤔 Message not relevant to errors, sending guidance");

      // Send a response to guide the user
      const guidanceMessage =
        "I'm the Code Error Assistant. Here's how you can interact with me:\n\n" +
        "📋 For Detected Runtime Errors:\n" +
        "• 'What's causing the TypeError in line 45?'\n" +
        "• 'How do I fix the unhandled promise rejection?'\n" +
        "• 'What's the best way to prevent this error in the future?'\n\n" +
        "🔍 For General Runtime Error Help:\n" +
        "• '@codeError Why do I get Cannot read property of undefined?'\n" +
        "• '@codeError How to handle unhandled promise rejections?'\n" +
        "• '@codeError What causes memory leaks in Node.js?'\n\n" +
        "🛠️ To Scan Your Codebase for Runtime Errors:\n" +
        "• '@codeError scan my codebase'\n" +
        "• '@codeError scan my JavaScript project'\n" +
        "Note: Our package specifically focuses on runtime errors\n\n" +
        "I work best with direct, specific questions about errors!";

      await sendWebhookResponse(channel_id, guidanceMessage, thread_id, org_id);
      return;
    }

    // Process the message and generate a response
    try {
      // Prepare the prompt for the AI
      const prompt = [
        {
          role: "system",
          content: `You are a runtime error expert assistant. Focus specifically on JavaScript and TypeScript runtime errors.
          Provide concise, helpful answers about runtime errors, their causes, and how to fix them.
          Include code examples when relevant. Keep responses under 5 paragraphs.
          Only answer questions related to runtime errors - for other topics, politely redirect to runtime error topics.`,
        },
        {
          role: "user",
          content: `
Last Error Report:
Type: ${lastError?.type || "Unknown"}
Timestamp: ${lastError?.timestamp || "Unknown"}
Priority: ${lastError?.priority || "Unknown"}
Errors: ${JSON.stringify(lastError?.errors || [], null, 2)}

User's question: ${cleanedMessage}

Based on the error information above, provide a VERY SHORT and direct response to the user's question. Be extremely concise.

Include only:
1. What's causing the error (1 sentence)
2. How to fix it (with minimal code example if needed)
3. One prevention tip

Keep your entire response under 5 sentences. Use plain text only, no markdown formatting.

If this is a test error, acknowledge it briefly but focus on practical advice.`,
        },
      ];

      // Call the AI service
      const response = await axios.post(
        `${ENV_CONFIG.SERVER_URL}/api/agents/errorAnalysisAgent/generate`,
        { messages: prompt },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Extract the response text
      let responseText;
      if (response.data && response.data.text) {
        responseText = response.data.text;
      } else if (typeof response.data === "string") {
        responseText = response.data;
      } else {
        responseText =
          "I'm sorry, I encountered an error while processing your question.";
      }

      // Add the response to the chat history
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };
      ChatHistoryService.addMessage(channel_id, assistantMessage);

      // Send the response to the webhook
      // Clean markdown formatting from the response
      const cleanedResponse = cleanMarkdown(responseText);
      await sendWebhookResponse(channel_id, cleanedResponse, thread_id, org_id);
    } catch (error) {
      console.error("Error calling Gemini API:", error);

      // Check if it's a rate limit error
      const isRateLimit =
        error.response?.status === 429 ||
        error.response?.data?.error === "Rate limit exceeded" ||
        (error.message &&
          error.message.includes("quota") &&
          error.message.includes("exceeded"));

      if (isRateLimit) {
        // Get retry delay from error if available
        let retryDelay = 3600; // Default to 1 hour
        try {
          if (error.response?.data?.error?.details) {
            const retryInfo = error.response.data.error.details.find((d) =>
              d["@type"]?.includes("RetryInfo")
            );
            if (retryInfo && retryInfo.retryDelay) {
              // Convert "53s" to seconds
              const seconds = parseInt(
                retryInfo.retryDelay.replace(/[^0-9]/g, "")
              );
              if (!isNaN(seconds)) {
                retryDelay = seconds;
              }
            }
          }
        } catch (parseError) {
          console.error("Error parsing retry info:", parseError);
        }

        const rateLimitMessage = `I'm experiencing high traffic right now and can't process your request. Please try again in about ${Math.ceil(
          retryDelay / 60
        )} minutes.`;

        // Add the response to the chat history
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: rateLimitMessage,
          timestamp: new Date(),
        };
        ChatHistoryService.addMessage(channel_id, assistantMessage);

        // Send the rate limit message
        const cleanedRateLimitMessage = cleanMarkdown(rateLimitMessage);
        await sendWebhookResponse(
          channel_id,
          cleanedRateLimitMessage,
          thread_id,
          org_id
        );
      } else {
        const errorMessage =
          "I'm sorry, I encountered an error while processing your question. Please try again later.";

        // Add the response to the chat history
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        };
        ChatHistoryService.addMessage(channel_id, assistantMessage);

        // Send the error message
        const cleanedMessage = cleanMarkdown(errorMessage);
        await sendWebhookResponse(
          channel_id,
          cleanedMessage,
          thread_id,
          org_id
        );
      }
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
  }
};

/**
 * Check if a message is relevant to the last error
 */
function checkMessageRelevance(
  message: string,
  lastError: ProcessedError | null,
  channelId: string
): {
  mentionsBot: boolean;
  containsErrorKeywords: boolean;
  isRelevantToLastError: boolean;
  shouldRespond: boolean;
  cleanedMessage: string;
} {
  // Check if the message mentions the bot
  const mentionsBot =
    message.toLowerCase().includes("@codeerror") ||
    message.toLowerCase().includes("code error") ||
    message.toLowerCase().includes("error agent");

  // Check if the message contains error-related keywords
  const errorKeywords = [
    "error",
    "exception",
    "bug",
    "issue",
    "problem",
    "fail",
    "crash",
    "debug",
    "fix",
    "help",
  ];

  // Check if the message contains any error keywords
  const containsErrorKeywords = errorKeywords.some((keyword) =>
    message.toLowerCase().includes(keyword)
  );
  console.log(
    `🔍 Checking for error keywords in message: ${message.toLowerCase()}`
  );
  if (containsErrorKeywords) {
    console.log(
      `✅ Message contains error keyword: ${errorKeywords.find((keyword) =>
        message.toLowerCase().includes(keyword)
      )}`
    );
  } else {
    console.log(`❌ Message does not contain any error keywords`);
  }

  // Check if the message is relevant to the last error
  let isRelevantToLastError = false;

  if (lastError && lastError.errors && lastError.errors.length > 0) {
    console.log(`🔍 Checking relevance for message: ${message}`);

    // Extract error messages from the last error
    const errorMessages = lastError.errors.map(
      (err) => err.message?.toLowerCase() || ""
    );
    console.log(
      `🔍 Checking against error messages: ${JSON.stringify(errorMessages)}`
    );

    // Check if the message mentions any of the error messages
    for (const errorMessage of errorMessages) {
      console.log(`🔍 Comparing with error message: ${errorMessage}`);
      if (
        errorMessage &&
        (message.toLowerCase().includes(errorMessage) ||
          calculateStringSimilarity(message.toLowerCase(), errorMessage) > 0.3)
      ) {
        isRelevantToLastError = true;
        break;
      }
    }

    if (containsErrorKeywords) {
      console.log(`✅ Message contains error-related keyword`);
      isRelevantToLastError = true;
    } else {
      console.log(`❌ Message not relevant to errors`);
    }
  }

  // Determine if we should respond to the message
  const shouldRespond =
    mentionsBot || isRelevantToLastError || containsErrorKeywords;

  return {
    mentionsBot,
    containsErrorKeywords,
    isRelevantToLastError,
    shouldRespond,
    cleanedMessage: message,
  };
}

/**
 * Handle the @codeError command for runtime error assistance
 * This is a more general AI for runtime errors, not just a code scanner
 */
async function handleCodeErrorCommand(
  message: string,
  channel_id: string,
  thread_id: string | null,
  org_id: string | null
): Promise<void> {
  try {
    console.log("🔍 Handling @codeError command");

    // Remove the @codeError part to get the actual question
    const userQuestion = message.replace(/@codeerror/i, "").trim();

    // Check if the user is asking about a specific error or wants a code scan
    if (
      userQuestion.toLowerCase().includes("scan") &&
      (userQuestion.toLowerCase().includes("code") ||
        userQuestion.toLowerCase().includes("codebase"))
    ) {
      // Provide information about Error-Telex package
      const packageInfo = `🦾 Error-Telex: AI-Powered Error Monitoring

To scan your codebase for runtime errors, you'll need to install our Error-Telex package. Here's how to get started:

Prerequisites:
• Node.js version 16.0.0 or higher
• JavaScript or TypeScript project
• A valid Telex channel ID

Installation:
npm install error-telex

Quick Setup:
Add this to your application's entry point:

For TypeScript:
import { initializeTelexSDK } from "error-telex";

await initializeTelexSDK({
  channelId: "your-telex-channel-id"
});

For JavaScript:
const { initializeTelexSDK } = require("error-telex");

await initializeTelexSDK({
  channelId: "your-telex-channel-id"
});

Important Notes:
• The package must be initialized in your main entry file
• For best results, initialize it before any other code runs
• The package specifically focuses on runtime errors
• TypeScript projects may get additional type-related insights

Once installed, Error-Telex will automatically detect errors in your application and send them to your Telex channel with AI-generated fix suggestions.

Need more help? Just ask!`;

      const cleanedInfo = cleanMarkdown(packageInfo);
      await sendWebhookResponse(channel_id, cleanedInfo, thread_id, org_id);
    } else {
      // Handle general runtime error questions
      let response = "";

      if (!userQuestion || userQuestion.length < 5) {
        // If no specific question, provide general help with examples
        response = `🔍 Runtime Error Assistant

I can help with runtime errors in your code. Here are some examples of what you can ask me:

Specific Error Questions:
• "@codeError Why do I get TypeError: Cannot read property of undefined?"
• "@codeError How to fix 'is not a function' errors?"
• "@codeError What causes memory leaks in Node.js?"

Best Practices:
• "@codeError How to handle async errors properly?"
• "@codeError Best practices for error handling in Express?"
• "@codeError How to prevent unhandled promise rejections?"

Code Scanning:
• "@codeError scan my codebase"
• "@codeError scan my JavaScript project"

Note: Our package specifically focuses on detecting and preventing runtime errors.

What would you like to know about runtime errors?`;
      } else {
        // Process the user's runtime error question
        response = await generateRuntimeErrorResponse(userQuestion);
      }

      const cleanedResponse = cleanMarkdown(response);
      await sendWebhookResponse(channel_id, cleanedResponse, thread_id, org_id);
    }
  } catch (error) {
    console.error("Error handling @codeError command:", error);
    const errorMessage = `❌ I encountered an error while processing your question. Please try again later.`;
    const cleanedMessage = cleanMarkdown(errorMessage);
    await sendWebhookResponse(channel_id, cleanedMessage, thread_id, org_id);
  }
}

/**
 * Generate a response for runtime error questions using AI
 */
async function generateRuntimeErrorResponse(question: string): Promise<string> {
  try {
    // Use the AI service to generate a response
    const prompt = [
      {
        role: "system",
        content: `You are a runtime error expert assistant. Focus specifically on JavaScript and TypeScript runtime errors.
        Provide concise, helpful answers about runtime errors, their causes, and how to fix them.
        Include code examples when relevant. Keep responses under 5 paragraphs.
        Only answer questions related to runtime errors - for other topics, politely redirect to runtime error topics.`,
      },
      {
        role: "user",
        content: question,
      },
    ];

    // Call the AI service
    const response = await axios.post(
      `${ENV_CONFIG.SERVER_URL}/api/agents/errorAnalysisAgent/generate`,
      { messages: prompt },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Extract the response text
    if (response.data && response.data.text) {
      return response.data.text;
    } else if (typeof response.data === "string") {
      return response.data;
    }

    // If we get here, something went wrong with the response format
    throw new Error("Invalid response format from AI service");
  } catch (error) {
    console.error("Error generating runtime error response:", error);
    return "I'm having trouble connecting to my AI service right now. Please try again in a few moments. If the problem persists, contact support.";
  }
}

/**
 * Helper function to send webhook response
 */
async function sendWebhookResponse(
  channel_id: string,
  message: string,
  thread_id: string | null,
  org_id: string | null
): Promise<void> {
  try {
    const webhookUrl = ENV_CONFIG.WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("Webhook URL not configured");
      return;
    }

    // Construct the full webhook URL with the channel ID
    const fullWebhookUrl = `${webhookUrl}/${channel_id}`;
    console.log("Sending webhook to:", fullWebhookUrl);

    const response = await axios.post(fullWebhookUrl, {
      event_name: "Code Error Monitor Agent",
      message,
      status: "success",
      username: "Code Error Agent",
      settings: [
        {
          default: "./src",
          label: "codeBasePath",
          required: true,
          type: "text",
        },
        {
          default: "1",
          label: "errorThreshold",
          required: true,
          type: "text",
        },
        {
          default: "*/15 * * * *",
          label: "interval",
          required: true,
          type: "text",
        },
      ],
      thread_id,
      org_id,
      auth_settings: {
        integration_auth_credentials: "",
        telex_api_key: "",
      },
    });

    console.log("Webhook response data:", response.data);
    console.log("✅ Response sent to channel");
  } catch (error) {
    console.error("Error sending webhook response:", error);
  }
}
