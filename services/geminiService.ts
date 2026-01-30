
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

// Helper function for transaction parsing using Gemini
export const parseTransactionPrompt = async (userInput: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse this Bengali shop transaction: "${userInput}".`,
    config: {
      systemInstruction: `Extract the customer name, amount (number), type, and reason/note. 
      Types must be one of: "বাকি (বাকী)", "বিকাশ বাকি", "বিকাশ জমা", "নগদ পরিশোধ". 
      If a specific reason is mentioned (like "recharge", "photocopy", "pen"), put it in the "note" field in Bengali.
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
          note: {
            type: Type.STRING,
            description: "The reason for the credit (e.g. recharge, photocopy)"
          },
          confidence: { type: Type.NUMBER }
        },
        required: ["name", "amount", "type"]
      }
    }
  });

  try {
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return null;
  }
};

// Helper function to get AI-driven financial advice
export const getFinancialAdvice = async (transactions: Transaction[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = JSON.stringify(transactions.slice(0, 20));
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Look at these recent transactions: ${summary}. Provide a short summary in Bengali (max 3 sentences) about who owes the most or what the trend is.`,
    config: {
      systemInstruction: "You are a friendly and helpful financial assistant for a small Bengali shopkeeper. Provide concise insights in Bengali.",
    }
  });

  return response.text;
};
