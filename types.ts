
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface DocumentInfo {
  content: string | string[]; // Base64 for single image, text for txt, array of base64 for PDF
  type: 'text' | 'image' | 'pdf-images';
  name: string;
  mimeType?: string; // e.g., 'image/jpeg'
}
