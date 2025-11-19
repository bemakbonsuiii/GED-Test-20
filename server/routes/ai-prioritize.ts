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

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const prompt = `You are a productivity assistant helping prioritize tasks. Analyze the following to-dos and recommend the top 3-5 that should be worked on next.

CRITICAL EXCLUSIONS:
- NEVER suggest completed todos
- NEVER suggest Blocker type todos in your suggestions - they should not be prioritized
- NEVER suggest Meeting type todos in your suggestions - only their children can be prioritized

PRIORITIZATION ORDER (STRICT - FOLLOW THIS EXACTLY):
1. **OVERDUE CHILDREN** (children that are blocking parents, past due) - ABSOLUTE TOP PRIORITY
2. **OVERDUE ITEMS** (past due date, NOT Blockers or Meetings) - CRITICAL
3. **MEETING PREP - TODAY/TOMORROW** (children of meetings happening soon) - EXTREMELY URGENT
4. **CHILDREN DUE TOMORROW** (children blocking parents, due tomorrow) - EXTREMELY HIGH PRIORITY
5. **Items due TOMORROW** (not meetings/blockers, can be started) - VERY HIGH PRIORITY
6. **CHILDREN DUE WITHIN 3 DAYS** (children blocking parents) - VERY HIGH PRIORITY
7. **Items due within 3 days** (not meetings/blockers, can be started) - HIGH PRIORITY
8. **CHILDREN WITH ANY DUE DATE** (children blocking parents) - HIGH PRIORITY because they're blocking important work
9. **Items due within 1 week** (not meetings/blockers, can be started) - MEDIUM-HIGH PRIORITY
10. P0 priority items with due dates (that can be started today, NOT Blockers or Meetings)
11. P1 priority items with due dates (that can be started today, NOT Blockers or Meetings)
12. **ACTIONABLE CHILDREN** (children blocking parents, even without due dates) - MEDIUM PRIORITY
13. Items with ANY due date (not meetings/blockers, can be started) - MEDIUM PRIORITY
14. P0 priority items WITHOUT due dates
15. P1 priority items WITHOUT due dates
16. Items WITHOUT due dates - LOW PRIORITY

**CRITICAL RULES**:
- Children that are blocking parents (isChild=true) are HIGH PRIORITY because they prevent important work from being done
- ALWAYS prioritize children with due dates, especially if they're due soon
- If a task is a child (has a parentId), it should be prioritized higher than similar tasks without parents
- NEVER exclude children just because their parent is blocked - that's backwards logic!
- The fact that a parent is "blocked by incomplete children" is EXACTLY why you should suggest those children - to unblock the parent!
- ALWAYS prioritize items WITH due dates over items WITHOUT due dates

To-dos:
${JSON.stringify(todosData, null, 2)}

Return ONLY a JSON array of 3-5 todo IDs in priority order, with a brief reason for each. Format:
[
  { "id": "todo-id", "reason": "Brief explanation why this should be prioritized" },
  { "id": "todo-id", "reason": "Brief explanation why this should be prioritized" },
  { "id": "todo-id", "reason": "Brief explanation why this should be prioritized" }
]

CRITICAL: You MUST return EXACTLY the number of items shown in the first instruction above. If you were told to select ${itemCount} items, you MUST provide EXACTLY ${itemCount} todo IDs in your response array - no more, no less. This is MANDATORY.`;

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

    // Validate and limit to 5 recommendations
    if (!Array.isArray(recommendations)) {
      return res.status(500).json({ error: "Invalid recommendations format" });
    }

    const validRecommendations = recommendations
      .slice(0, 5)
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
