/**
 * Helper functions for the application
 */

export const HelperService = {
  /**
   * Cleans a message from Telex by removing HTML tags and trimming whitespace
   * @param message The message to clean
   * @returns The cleaned message
   */
  cleanTelexMessage: (message: string): string => {
    // Handle null or undefined messages
    if (!message) return "";

    // Replace <br> and <p> tags with newlines for better readability
    let cleanedMessage = message
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<p>/gi, "");

    // Remove all other HTML tags
    cleanedMessage = cleanedMessage.replace(/<\/?[^>]+(>|$)/g, "");

    // Replace multiple consecutive newlines with a single newline
    cleanedMessage = cleanedMessage.replace(/\n{3,}/g, "\n\n");

    // Decode HTML entities
    cleanedMessage = cleanedMessage
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Trim whitespace and return
    return cleanedMessage.trim();
  },
};
