import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Todo {
  id: string;
  text: string;
  type: "Task" | "Deliverable" | "Quick Win" | "Meeting" | "Blocker";
  priority: string;
  completed: boolean;
  startDate?: number;
  dueDate?: string;
  dueTime?: string;
  meetingTime?: string;
  notes?: string;
  project?: string;
  workspace: string;
  isPriority?: boolean;
  priorityOrder?: number;
  parentId?: string;
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

IMPORTANT CONTEXT ABOUT PRIORITY PANEL:
- The "Today's Priorities" panel has TWO sections:
  1. "Actionable" - todos that can be worked on immediately (no blocker children)
  2. "Blocked Priorities" - important todos that have incomplete Blocker children
- When you suggest a todo with Blocker children, it will automatically appear in the "Blocked Priorities" section
- You SHOULD suggest important todos even if they're blocked - users need to see what's important but blocked

When asked about priorities or reprioritization:
- **ABSOLUTE TOP PRIORITY: OVERDUE ITEMS** - Items with past due dates MUST be prioritized FIRST above everything else
- **CRITICAL PRIORITY: UPCOMING MEETINGS WITH INCOMPLETE PREP** - If a meeting is scheduled for today or tomorrow and has incomplete child to-dos, those child to-dos are CRITICAL and must be prioritized immediately after overdue items
- **DEPRIORITIZE items with future start dates** - If an item has a startDate that hasn't arrived yet, the user CANNOT take action on it, so it should NOT be prioritized
- **UNDERSTAND PARENT-CHILD RELATIONSHIPS & BLOCKERS** - Children must be completed before their parent can be completed
  - You CAN and SHOULD suggest parents that have Blocker children - they will appear in the "Blocked Priorities" section
  - If a to-do has children (hasChildren: true), those children are BLOCKERS for the parent
  - **BLOCKER TYPE**: Blockers are a special type of child to-do that MUST be completed before the parent can be worked on
  - If a to-do has incomplete Blocker children, it will automatically appear in "Blocked Priorities" section
  - When suggesting important work, suggest it even if it's blocked - users need to see what's important
  - When suggesting a parent with children, say something like: "Complete [child names] first to unblock [parent name]"
  - ALWAYS prioritize children over their parents in the suggestion list - children come first, parent comes after
  - Blockers can have their own actionable children (to break down the blocking work)
  - **SPECIAL CASE**: If a parent is a MEETING scheduled for TODAY or TOMORROW, its children are EXTREMELY URGENT (meeting prep tasks)
- Consider due dates and time sensitivity
- Consider priority levels (P0 > P1 > P2)
- Consider task types and dependencies
- Suggest specific todo IDs that should be in the priority list
- Be conversational and helpful

Prioritization Order (STRICT):
1. **OVERDUE BLOCKERS** (Blocker type AND past due date) - ABSOLUTE TOP PRIORITY
2. **OVERDUE CHILDREN** (past due date AND is a child) - CRITICAL
3. **OVERDUE ITEMS** (past due date) - CRITICAL
4. **MEETING PREP - TODAY** (children of meetings happening TODAY) - EXTREMELY URGENT
5. **MEETING PREP - TOMORROW** (children of meetings happening TOMORROW) - VERY URGENT
6. **BLOCKERS** (Blocker type todos) - these must be done before their parents can be worked on
7. Children of high-priority items (these block their parents)
8. Items with today's due date that are children
9. Items with today's due date (and no future start date)
10. P0 priority blockers
11. P0 priority children
12. P0 priority items (that can be started today AND have no blocker children)
13. Children of items with approaching deadlines
14. Items with approaching deadlines (that can be started today AND have no blocker children)
15. P1 priority blockers
16. P1 priority children
17. P1 priority items (that can be started today AND have no blocker children)
18. Everything else that can be started today
19. Important blocked work (has Blocker children) - will appear in "Blocked Priorities" section
20. EXCLUDE ONLY: Items with future start dates (user cannot work on them yet)
21. IMPORTANT: When suggesting a parent with incomplete children, ALWAYS suggest the children BEFORE the parent in the list
22. DO NOT EXCLUDE: Parents with Blocker children - these should be suggested and will appear in "Blocked Priorities"

When responding with suggestions, format them as a JSON array of todo IDs at the end of your response, like this:
SUGGESTIONS: ["todo-id-1", "todo-id-2"]

Be concise but friendly. Address the user's specific question.`;

    const now = Date.now();
    const futureStartItems = incompleteTodos.filter(t => t.startDate && t.startDate > now);

    // Check for overdue items
    const overdueItems = incompleteTodos.filter(t => {
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      return dueTime < now;
    });

    // Check for upcoming meetings (today or tomorrow) with incomplete children
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2); // End of tomorrow
    tomorrow.setHours(0, 0, 0, 0);

    const upcomingMeetingsWithIncompletePrep = incompleteTodos.filter(t => {
      if (t.type !== "Meeting") return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      if (dueTime < today.getTime() || dueTime >= tomorrow.getTime()) return false;
      // Check if this meeting has incomplete children
      const hasIncompleteChildren = todos.some(child => child.parentId === t.id && !child.completed);
      return hasIncompleteChildren;
    });

    const meetingPrepTasks = upcomingMeetingsWithIncompletePrep.flatMap(meeting => {
      return incompleteTodos.filter(t => t.parentId === meeting.id);
    });

    // Build parent-child relationship map
    const todosWithChildren = incompleteTodos.filter(t =>
      todos.some(child => child.parentId === t.id && !child.completed)
    );
    const childTodos = incompleteTodos.filter(t => t.parentId);

    const userPrompt = `${overdueItems.length > 0 ? `🚨 OVERDUE ITEMS (CRITICAL - PAST DUE): ${overdueItems.length}\n` : ''}${upcomingMeetingsWithIncompletePrep.length > 0 ? `🔴 URGENT: ${upcomingMeetingsWithIncompletePrep.length} MEETING(S) TODAY/TOMORROW WITH INCOMPLETE PREP TASKS (${meetingPrepTasks.length} tasks)\n` : ''}${futureStartItems.length > 0 ? `⏳ FUTURE START ITEMS (cannot start yet): ${futureStartItems.length}\n` : ''}${todosWithChildren.length > 0 ? `🔗 PARENT ITEMS (blocked by children): ${todosWithChildren.length}\n` : ''}${childTodos.length > 0 ? `👶 CHILD ITEMS (blockers for parents): ${childTodos.length}\n` : ''}
${upcomingMeetingsWithIncompletePrep.length > 0 ? `\nUPCOMING MEETINGS WITH INCOMPLETE PREP:\n${upcomingMeetingsWithIncompletePrep.map(m => {
  const dueTime = typeof m.dueDate === 'string' ? new Date(m.dueDate).getTime() : m.dueDate!;
  const dueDate = new Date(dueTime);
  const isToday = dueDate.toDateString() === new Date().toDateString();
  const incompletePrepTasks = todos.filter(t => t.parentId === m.id && !t.completed);
  return `  📅 ${isToday ? 'TODAY' : 'TOMORROW'}: "${m.text}" - ${incompletePrepTasks.length} prep task(s) not done: ${incompletePrepTasks.map(t => `"${t.text}"`).join(', ')}`;
}).join('\n')}\n` : ''}
Current todos:
${JSON.stringify(incompleteTodos.slice(0, 50).map(t => {
  const canStart = !t.startDate || t.startDate <= now;
  const hasChildren = todos.some(child => child.parentId === t.id && !child.completed);
  const hasBlockerChildren = todos.some(child => child.parentId === t.id && child.type === 'Blocker' && !child.completed);
  const isChild = !!t.parentId;
  const isBlocker = t.type === 'Blocker';
  const parentInfo = t.parentId ? todos.find(p => p.id === t.parentId) : null;

  // Check if overdue
  const isOverdue = t.dueDate && (typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate) < now;

  // Check if this is a meeting prep task (child of upcoming meeting)
  const isMeetingPrep = parentInfo && parentInfo.type === "Meeting" && parentInfo.dueDate &&
    upcomingMeetingsWithIncompletePrep.some(m => m.id === parentInfo.id);

  return {
    id: t.id,
    text: t.text,
    type: t.type,
    priority: t.priority,
    startDate: t.startDate,
    canStartNow: canStart ? (hasBlockerChildren ? "🚫 NOT ACTIONABLE - has incomplete BLOCKER children" : true) : `⏳ CANNOT START UNTIL ${new Date(t.startDate!).toLocaleDateString()}`,
    dueDate: t.dueDate,
    isOverdue: isOverdue ? "🚨 OVERDUE - CRITICAL PRIORITY" : false,
    isEOD: t.isEOD ? "⚠️ EOD - URGENT" : false,
    isMeetingPrep: isMeetingPrep ? `🔴 MEETING PREP - CRITICAL (for "${parentInfo?.text}")` : false,
    isPriority: t.isPriority,
    project: t.project,
    hasChildren: hasChildren ? "🔗 BLOCKED - has incomplete children" : false,
    hasBlockerChildren: hasBlockerChildren ? "🚫 NOT ACTIONABLE - has incomplete BLOCKER children (must resolve blockers first)" : false,
    isChild: isChild ? `👶 CHILD of: "${parentInfo?.text || 'parent'}"` : false,
    isBlocker: isBlocker ? `🚧 BLOCKER - blocks parent "${parentInfo?.text || 'parent'}" from being actionable` : false,
    parentId: t.parentId || undefined
  };
}), null, 2)}

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
