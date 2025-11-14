import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Todo {
  id: string;
  text: string;
  type: "Task" | "Deliverable" | "Quick Win" | "Meeting";
  priority: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  meetingTime?: string;
  notes?: string;
  project?: string;
  workspace: string;
  isEOD?: boolean;
  isPriority?: boolean;
  priorityOrder?: number;
}

export async function handleToddAssistant(req: Request, res: Response) {
  try {
    const { message, todos, priorityTodos } = req.body as {
      message: string;
      todos: Todo[];
      priorityTodos: Todo[];
    };

    if (!message || !Array.isArray(todos)) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const incompleteTodos = todos.filter((t) => !t.completed);

    const systemPrompt = `You are Todd, a friendly and helpful productivity assistant. Your role is to help users manage their to-do lists and priorities.

Current Context:
- Total incomplete todos: ${incompleteTodos.length}
- Current priority items: ${priorityTodos.length}

When asked about priorities or reprioritization:
- Consider due dates, EOD flags, priority levels (P0 > P1 > P2)
- Consider task types and dependencies
- Suggest specific todo IDs that should be in the priority list
- Be conversational and helpful

When responding with suggestions, format them as a JSON array of todo IDs at the end of your response, like this:
SUGGESTIONS: ["todo-id-1", "todo-id-2"]

Be concise but friendly. Address the user's specific question.`;

    const userPrompt = `Current todos:
${JSON.stringify(incompleteTodos.slice(0, 50).map(t => ({
  id: t.id,
  text: t.text,
  type: t.type,
  priority: t.priority,
  dueDate: t.dueDate,
  isEOD: t.isEOD,
  isPriority: t.isPriority,
  project: t.project
})), null, 2)}

Current priority list:
${priorityTodos.length > 0 ? JSON.stringify(priorityTodos.map(t => ({
  id: t.id,
  text: t.text,
  type: t.type,
  priority: t.priority
})), null, 2) : "Empty"}

User question: ${message}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return res.status(500).json({ error: "No response from AI" });
    }

    // Extract suggestions if present
    let suggestions: string[] = [];
    let cleanResponse = responseText;
    
    const suggestionsMatch = responseText.match(/SUGGESTIONS:\s*(\[.*?\])/s);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1]);
        cleanResponse = responseText.replace(/SUGGESTIONS:\s*\[.*?\]/s, '').trim();
      } catch (e) {
        console.error("Failed to parse suggestions:", e);
      }
    }

    res.json({ 
      response: cleanResponse,
      suggestions: suggestions.filter(id => todos.some(t => t.id === id))
    });
  } catch (error: any) {
    console.error("Todd assistant error:", error);
    res.status(500).json({
      error: "Failed to get response from Todd",
      details: error.message,
    });
  }
}
