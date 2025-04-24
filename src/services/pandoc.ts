/**
 * Represents the available document formats for conversion.
 */
export type DocumentFormat = 'pdf' | 'html' | 'docx';

/**
 * Asynchronously converts a document from Markdown to the specified format using Pandoc.
 *
 * @param markdownContent The Markdown content to convert.
 * @param format The desired output format.
 * @returns A promise that resolves to the converted document content.
 */
export async function convertMarkdown(markdownContent: string, format: DocumentFormat): Promise<string> {
  // TODO: Implement this by calling the Pandoc API.
  return `This is a stubbed ${format} document.`;
}
