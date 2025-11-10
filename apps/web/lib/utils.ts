import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Value } from 'platejs';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const handleError = (error: string, cause: unknown) => {
    throw new Error(error, { cause })
}

export function parseJwt (token: string) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

/**
 * Convert HTML string to Plate Value format
 * Uses editor.api.html.deserialize on client-side
 * @param htmlString - HTML string to convert
 * @param editor - Plate editor instance (required for client-side)
 * @returns Plate Value or null for SSR/empty strings
 */
export const htmlToPlateValue = (htmlString: string, editor?: any): Value | null => {
  try {
    // If empty or whitespace only, return null (component will handle initialization)
    if (!htmlString || htmlString.trim() === '') {
      return null;
    }

    // Check if already JSON (Plate Value format)
    if (isPlateValue(htmlString)) {
      return JSON.parse(htmlString);
    }

    // For SSR, we can't deserialize HTML without editor instance
    if (typeof window === 'undefined' || !editor) {
      return null;
    }

    // Use Plate's built-in HTML deserializer
    const value = editor.api.html.deserialize({ element: htmlString });
    return value;
  } catch (error) {
    console.error('Failed to convert HTML to Plate value:', error);
    // Return default empty paragraph on error
    return [{ type: 'p', children: [{ text: '' }] }];
  }
};

/**
 * Check if string is a valid Plate Value JSON
 */
const isPlateValue = (json: string): boolean => {
  try {
    const parsed = JSON.parse(json);
    // Plate Value is an array of nodes
    return Array.isArray(parsed) && parsed.length > 0 && parsed[0].children;
  } catch {
    return false;
  }
};

/**
 * Convert Plate Value to HTML string
 * Note: This is a simplified client-side serializer
 * For server-side serialization, use serializeHtml from platejs
 * @param value - Plate Value to convert
 * @returns HTML string
 */
export const plateValueToHtml = (value: Value): string => {
  try {
    // If already a string, return as-is
    if (typeof value === 'string') {
      return value;
    }

    // Simple client-side serialization (for storage/preview)
    // For full HTML generation, use Plate's serializeHtml with editor instance
    const html = value.map(node => serializeNode(node)).join('\n');
    return html;
  } catch (error) {
    console.error('Failed to convert Plate value to HTML:', error);
    return '';
  }
};

/**
 * Simple node-to-HTML serializer for client-side usage
 * For full-featured server-side HTML generation, use Plate's serializeHtml
 */
const serializeNode = (node: any): string => {
  // Handle text nodes
  if ('text' in node) {
    let text = node.text;
    if (node.bold) text = `<strong>${text}</strong>`;
    if (node.italic) text = `<em>${text}</em>`;
    if (node.underline) text = `<u>${text}</u>`;
    if (node.strikethrough) text = `<s>${text}</s>`;
    if (node.code) text = `<code>${text}</code>`;
    if (node.subscript) text = `<sub>${text}</sub>`;
    if (node.superscript) text = `<sup>${text}</sup>`;
    return text;
  }

  // Handle element nodes
  const children = node.children?.map((child: any) => serializeNode(child)).join('') || '';
  
  switch (node.type) {
    case 'h1': return `<h1>${children}</h1>`;
    case 'h2': return `<h2>${children}</h2>`;
    case 'h3': return `<h3>${children}</h3>`;
    case 'h4': return `<h4>${children}</h4>`;
    case 'h5': return `<h5>${children}</h5>`;
    case 'h6': return `<h6>${children}</h6>`;
    case 'blockquote': return `<blockquote>${children}</blockquote>`;
    case 'p': return `<p>${children}</p>`;
    default: return children;
  }
};
export function toAbsoluteUrl(path: string) {
    return `${(process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')}${path}`
}
