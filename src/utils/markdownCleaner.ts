/**
 * Utility to clean markdown formatting from text
 */

/**
 * Removes markdown formatting from text
 * @param text The text to clean
 * @returns The cleaned text
 */
export function cleanMarkdown(text: string): string {
  if (!text) return '';
  
  // Replace code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, (match) => {
    // Extract the code content without the backticks
    const code = match.replace(/```(?:\w+)?\n([\s\S]*?)```/g, '$1').trim();
    return code;
  });
  
  // Replace inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Replace bold
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Replace italic
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  
  // Replace headers
  cleaned = cleaned.replace(/#{1,6}\s+(.+)/g, '$1');
  
  // Replace bullet points
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '• ');
  
  // Replace numbered lists
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '• ');
  
  // Replace horizontal rules
  cleaned = cleaned.replace(/^---+$/gm, '');
  
  // Replace links
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  
  // Replace images
  cleaned = cleaned.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  
  // Replace blockquotes
  cleaned = cleaned.replace(/^\s*>\s+/gm, '');
  
  // Replace multiple newlines with a single newline
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}
