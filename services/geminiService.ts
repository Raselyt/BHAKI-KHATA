
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

// Helper function for transaction parsing using Gemini
export const parseTransactionPrompt = async (userInput: string) => {
  // Always create a new instance right before making an API call to ensure it always uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse this Bengali shop transaction: "${userInput}".`,
    config: {
      systemInstruction: `Extract the customer name, amount (number), and type. 
      Types must be one of: "বাকি (বাকী)", "বিকাশ বাকি", "বিকাশ জমা", "নগদ পরিশোধ". 
      Return the data in JSON format.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          type: { 
            type: Type.STRING,
            description: "Transaction type in Bengali"
          },
          confidence: { type: Type.NUMBER }
        },
        required: ["name", "amount", "type"]
      }
    }
  });

  try {
    // Accessing .text property directly as per guidelines
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return null;
  }
};

// Helper function to get AI-driven financial advice
export const getFinancialAdvice = async (transactions: Transaction[]) => {
  // Always create a new instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = JSON.stringify(transactions.slice(0, 20));
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Look at these recent transactions: ${summary}. Provide a short summary in Bengali (max 3 sentences) about who owes the most or what the trend is.`,
    config: {
      systemInstruction: "You are a friendly and helpful financial assistant for a small Bengali shopkeeper. Provide concise insights in Bengali.",
    }
  });

  // Accessing .text property directly as per guidelines
  return response.text;
};
