import { Request, Response } from "express";
import OpenAI from "openai";

interface Todo {
  id: string;
  text: string;
  type: "Task" | "Deliverable" | "Quick Win" | "Meeting";
  priority: string;
  completed: boolean;
  startDate?: number;
  dueDate?: string;
  dueTime?: string;
  meetingTime?: string;
  agenda?: string;
  notes?: string;
  links?: string;
  project?: string;
  workspace: string;
  parentId?: string;
}

export async function handleAIPrioritize(req: Request, res: Response) {
  try {
    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;

    // Create OpenAI client here to pick up the latest env var
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const { todos } = req.body as { todos: Todo[] };

    if (!todos || !Array.isArray(todos)) {
      return res.status(400).json({ error: "Invalid todos data" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Filter out completed todos
    const incompleteTodos = todos.filter((t) => !t.completed);

    if (incompleteTodos.length === 0) {
      return res.json({ recommendations: [] });
    }

    // Prepare todo data for AI with parent-child relationships
    const todosData = incompleteTodos.map((todo) => {
      const hasChildren = todos.some((t) => t.parentId === todo.id && !t.completed);
      const isChild = !!todo.parentId;
      return {
        id: todo.id,
        text: todo.text,
        type: todo.type,
        priority: todo.priority,
        dueDate: todo.dueDate,
        dueTime: todo.dueTime,
        meetingTime: todo.meetingTime,
        notes: todo.notes,
        project: todo.project,
        workspace: todo.workspace,
        hasChildren: hasChildren,
        isChild: isChild,
        parentId: todo.parentId
      };
    });

    const prompt = `You are a productivity assistant helping prioritize tasks. Analyze the following to-dos and recommend the top 3 that should be worked on next.

Consider:
- Due dates and times (prioritize urgent items)
- Priority levels (P0 > P1 > P2)
- **Parent-Child Relationships**: Children MUST be completed before their parent can be completed
  - Items with hasChildren=true are BLOCKED until their children are done
  - Items with isChild=true are BLOCKERS and should be prioritized over their parents
  - ALWAYS prioritize children over parents
- Task types (Deliverables and Meetings may need preparation)
- Project context and workspace

To-dos:
${JSON.stringify(todosData, null, 2)}

Return ONLY a JSON array of exactly 3 todo IDs in priority order, with a brief reason for each. Format:
[
  { "id": "todo-id", "reason": "Brief explanation why this should be prioritized" },
  { "id": "todo-id", "reason": "Brief explanation why this should be prioritized" },
  { "id": "todo-id", "reason": "Brief explanation why this should be prioritized" }
]

If there are fewer than 3 incomplete todos, return only what's available.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful productivity assistant. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return res.status(500).json({ error: "No response from AI" });
    }

    // Parse the JSON response
    let recommendations;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      recommendations = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    // Validate and limit to 3 recommendations
    if (!Array.isArray(recommendations)) {
      return res.status(500).json({ error: "Invalid recommendations format" });
    }

    const validRecommendations = recommendations
      .slice(0, 3)
      .filter((rec) => rec.id && rec.reason);

    res.json({ recommendations: validRecommendations });
  } catch (error: any) {
    console.error("AI Prioritization error:", error);
    res.status(500).json({
      error: "Failed to generate recommendations",
      details: error.message,
    });
  }
}
