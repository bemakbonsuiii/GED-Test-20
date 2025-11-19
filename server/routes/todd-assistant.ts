import { Request, Response } from "express";
import OpenAI from "openai";

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
    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    console.log("[Todd] API Key ends with:", apiKey?.slice(-10) || "NOT SET");

    // Create OpenAI client here to pick up the latest env var
    const openai = new OpenAI({
      apiKey: apiKey,
    });

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

CRITICAL EXCLUSIONS:
- NEVER suggest completed todos - they are already done
- NEVER suggest Blocker type todos in your suggestions - they should not be prioritized
- NEVER suggest Meeting type todos in your suggestions - only their children can be prioritized
- If a Meeting is important, suggest its children instead

When asked about priorities or reprioritization:
- **ABSOLUTE TOP PRIORITY: OVERDUE ITEMS** - Items with past due dates MUST be prioritized FIRST above everything else
- **CRITICAL PRIORITY: UPCOMING MEETINGS WITH INCOMPLETE PREP** - If a meeting is scheduled for today or tomorrow and has incomplete child to-dos, those child to-dos are CRITICAL and must be prioritized immediately after overdue items
- **DEPRIORITIZE items with future start dates** - If an item has a startDate that hasn't arrived yet, the user CANNOT take action on it, so it should NOT be prioritized
- **UNDERSTAND PARENT-CHILD RELATIONSHIPS & BLOCKERS** - Children must be completed before their parent can be completed
  - **CRITICAL**: If a task is a CHILD of a parent, it is BLOCKING that parent and should be PRIORITIZED
  - **Tasks that are blocking parents are HIGH PRIORITY** - they prevent important work from being completed
  - Children with approaching due dates should be prioritized even higher because they're blocking important work AND time-sensitive
  - If a to-do has children (hasChildren: true), those children are BLOCKERS for the parent
  - **BLOCKER TYPE**: Blockers are a special type of child to-do that MUST be completed before the parent can be worked on
  - When suggesting priorities, ALWAYS include children that are blocking parents, especially if those children have due dates
  - The fact that a parent is "blocked by incomplete children" is EXACTLY why you should suggest those children - to unblock the parent!
  - ALWAYS prioritize children over their parents in the suggestion list - children come first, parent comes after
  - **SPECIAL CASE**: If a parent is a MEETING scheduled for TODAY or TOMORROW, its children are EXTREMELY URGENT (meeting prep tasks)
- Consider due dates and time sensitivity
- Consider priority levels (P0 > P1 > P2)
- Consider task types and dependencies
- When the user asks for a specific number of priorities (e.g., "give me 5 items"), suggest EXACTLY that many todo IDs
- If no specific number is requested, suggest 3-5 specific todo IDs (minimum 3, maximum 5)
- If there aren't enough high-priority items, suggest lower-priority actionable items to reach the requested count
- Be conversational and helpful

Prioritization Order (STRICT - FOLLOW THIS EXACTLY):
1. **OVERDUE CHILDREN** (children that are blocking parents, past due) - ABSOLUTE TOP PRIORITY
2. **OVERDUE ITEMS** (past due date, NOT Blockers or Meetings) - CRITICAL
3. **MEETING PREP - TODAY** (children of meetings happening TODAY) - EXTREMELY URGENT
4. **MEETING PREP - TOMORROW** (children of meetings happening TOMORROW) - VERY URGENT
5. **CHILDREN DUE TOMORROW** (children blocking parents, due tomorrow) - EXTREMELY HIGH PRIORITY
6. **Items due TOMORROW** (not meetings/blockers, can be started) - VERY HIGH PRIORITY
7. **CHILDREN DUE WITHIN 3 DAYS** (children blocking parents) - VERY HIGH PRIORITY
8. **Items due within 3 days** (not meetings/blockers, can be started) - HIGH PRIORITY
9. **CHILDREN WITH ANY DUE DATE** (children blocking parents) - HIGH PRIORITY because they're blocking important work
10. **Items due within 1 week** (not meetings/blockers, can be started) - MEDIUM-HIGH PRIORITY
11. P0 priority items with due dates (that can be started today, NOT Blockers or Meetings)
12. P1 priority items with due dates (that can be started today, NOT Blockers or Meetings)
13. **Items with ANY due date** (not meetings/blockers, can be started) - MEDIUM PRIORITY
14. **ACTIONABLE CHILDREN** (children blocking parents, even without due dates) - MEDIUM PRIORITY
15. P0 priority items WITHOUT due dates (can be started today, NOT Blockers or Meetings)
16. P1 priority items WITHOUT due dates (can be started today, NOT Blockers or Meetings)
17. Items WITHOUT due dates (can be started today, NOT Blockers or Meetings) - LOW PRIORITY

**CRITICAL RULES**:
- Children that are blocking parents are HIGH PRIORITY because they prevent important work from being done
- ALWAYS prioritize children with due dates, especially if they're due soon
- If a task is a child (has a parentId), it should be prioritized higher than similar tasks without parents
- NEVER exclude children just because their parent is blocked - that's backwards logic!

ABSOLUTE EXCLUSIONS:
- NEVER SUGGEST: Blocker type todos (they should not be in priorities at all)
- NEVER SUGGEST: Meeting type todos (only their children can be prioritized)
- EXCLUDE: Items with future start dates (user cannot work on them yet)

IMPORTANT RULES:
- When suggesting a parent with incomplete children, ALWAYS suggest the children BEFORE the parent in the list
- Parents with Blocker children should be suggested (they appear in "Blocked Priorities")

When responding with suggestions, format them as a JSON array of todo IDs at the end of your response, like this:
SUGGESTIONS: ["todo-id-1", "todo-id-2"]

IMPORTANT FOR AUTO-PRIORITIZATION (THIS IS MANDATORY):
- If the user specifies a number (e.g., "give me 5 items", "top 5", "prioritize 5 tasks"), you MUST return EXACTLY that many todo IDs - NO EXCEPTIONS
- If the user asks for 5 items, you MUST provide 5 todo IDs in your SUGGESTIONS array
- If no specific number is requested, return between 3-5 todo IDs (minimum 3, maximum 5)
- NEVER EVER return fewer items than requested - if there aren't enough critical items, include items due tomorrow, items due within 3 days, high-priority items, or ANY actionable items to meet the exact count requested
- It is BETTER to suggest lower-priority actionable items than to return fewer items than requested

Be concise but friendly. Address the user's specific question.`;

    const now = Date.now();
    const futureStartItems = incompleteTodos.filter(
      (t) => t.startDate && t.startDate > now,
    );

    // Check for overdue items
    const overdueItems = incompleteTodos.filter((t) => {
      if (!t.dueDate) return false;
      const dueTime =
        typeof t.dueDate === "string"
          ? new Date(t.dueDate).getTime()
          : t.dueDate;
      return dueTime < now;
    });

    // Check for upcoming meetings (today or tomorrow) with incomplete children
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2); // End of tomorrow
    tomorrow.setHours(0, 0, 0, 0);

    const upcomingMeetingsWithIncompletePrep = incompleteTodos.filter((t) => {
      if (t.type !== "Meeting") return false;
      if (!t.dueDate) return false;
      const dueTime =
        typeof t.dueDate === "string"
          ? new Date(t.dueDate).getTime()
          : t.dueDate;
      if (dueTime < today.getTime() || dueTime >= tomorrow.getTime())
        return false;
      // Check if this meeting has incomplete children
      const hasIncompleteChildren = todos.some(
        (child) => child.parentId === t.id && !child.completed,
      );
      return hasIncompleteChildren;
    });

    const meetingPrepTasks = upcomingMeetingsWithIncompletePrep.flatMap(
      (meeting) => {
        return incompleteTodos.filter((t) => t.parentId === meeting.id);
      },
    );

    // Check for items due tomorrow (excluding meeting prep tasks already tracked)
    const tomorrowEnd = new Date(tomorrow);
    const dueTomorrow = incompleteTodos.filter((t) => {
      if (!t.dueDate) return false;
      if (t.type === "Meeting" || t.type === "Blocker") return false;
      // Exclude items that are already counted as meeting prep tasks
      if (meetingPrepTasks.some((prep) => prep.id === t.id)) return false;
      const dueTime =
        typeof t.dueDate === "string"
          ? new Date(t.dueDate).getTime()
          : t.dueDate;
      return dueTime >= tomorrow.getTime() && dueTime < tomorrowEnd.getTime();
    });

    // Check for items due within next 3 days (excluding already tracked items)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const dueWithin3Days = incompleteTodos.filter((t) => {
      if (!t.dueDate) return false;
      if (t.type === "Meeting" || t.type === "Blocker") return false;
      // Exclude items already counted
      if (meetingPrepTasks.some((prep) => prep.id === t.id)) return false;
      if (dueTomorrow.some((item) => item.id === t.id)) return false;
      const dueTime =
        typeof t.dueDate === "string"
          ? new Date(t.dueDate).getTime()
          : t.dueDate;
      return dueTime >= tomorrowEnd.getTime() && dueTime < threeDaysFromNow.getTime();
    });

    // Build parent-child relationship map
    const todosWithChildren = incompleteTodos.filter((t) =>
      todos.some((child) => child.parentId === t.id && !child.completed),
    );
    const childTodos = incompleteTodos.filter((t) => t.parentId);

    const userPrompt = `${overdueItems.length > 0 ? `🚨 OVERDUE ITEMS (CRITICAL - PAST DUE): ${overdueItems.length}\n` : ""}${upcomingMeetingsWithIncompletePrep.length > 0 ? `🔴 URGENT: ${upcomingMeetingsWithIncompletePrep.length} MEETING(S) TODAY/TOMORROW WITH INCOMPLETE PREP TASKS (${meetingPrepTasks.length} tasks)\n` : ""}${dueTomorrow.length > 0 ? `⚠️ DUE TOMORROW (VERY HIGH PRIORITY): ${dueTomorrow.length} items\n` : ""}${dueWithin3Days.length > 0 ? `📅 DUE WITHIN 3 DAYS (HIGH PRIORITY): ${dueWithin3Days.length} items\n` : ""}${futureStartItems.length > 0 ? `⏳ FUTURE START ITEMS (cannot start yet): ${futureStartItems.length}\n` : ""}${todosWithChildren.length > 0 ? `🔗 PARENT ITEMS (blocked by children): ${todosWithChildren.length}\n` : ""}${childTodos.length > 0 ? `👶 CHILD ITEMS (blockers for parents): ${childTodos.length}\n` : ""}
${
  upcomingMeetingsWithIncompletePrep.length > 0
    ? `\nUPCOMING MEETINGS WITH INCOMPLETE PREP:\n${upcomingMeetingsWithIncompletePrep
        .map((m) => {
          const dueTime =
            typeof m.dueDate === "string"
              ? new Date(m.dueDate).getTime()
              : m.dueDate!;
          const dueDate = new Date(dueTime);
          const isToday = dueDate.toDateString() === new Date().toDateString();
          const incompletePrepTasks = todos.filter(
            (t) => t.parentId === m.id && !t.completed,
          );
          return `  📅 ${isToday ? "TODAY" : "TOMORROW"}: "${m.text}" - ${incompletePrepTasks.length} prep task(s) not done: ${incompletePrepTasks.map((t) => `"${t.text}"`).join(", ")}`;
        })
        .join("\n")}\n`
    : ""
}
Current todos:
${JSON.stringify(
  incompleteTodos.slice(0, 100).map((t) => {
    const canStart = !t.startDate || t.startDate <= now;
    const hasChildren = todos.some(
      (child) => child.parentId === t.id && !child.completed,
    );
    const hasBlockerChildren = todos.some(
      (child) =>
        child.parentId === t.id && child.type === "Blocker" && !child.completed,
    );
    const isChild = !!t.parentId;
    const isBlocker = t.type === "Blocker";
    const parentInfo = t.parentId
      ? todos.find((p) => p.id === t.parentId)
      : null;

    // Check if overdue
    const isOverdue =
      t.dueDate &&
      (typeof t.dueDate === "string"
        ? new Date(t.dueDate).getTime()
        : t.dueDate) < now;

    // Check if this is a meeting prep task (child of upcoming meeting)
    const isMeetingPrep =
      parentInfo &&
      parentInfo.type === "Meeting" &&
      parentInfo.dueDate &&
      upcomingMeetingsWithIncompletePrep.some((m) => m.id === parentInfo.id);

    return {
      id: t.id,
      text: t.text,
      type: t.type,
      priority: t.priority,
      startDate: t.startDate,
      canStartNow: canStart
        ? hasBlockerChildren
          ? "🚫 NOT ACTIONABLE - has incomplete BLOCKER children"
          : true
        : `⏳ CANNOT START UNTIL ${new Date(t.startDate!).toLocaleDateString()}`,
      dueDate: t.dueDate,
      isOverdue: isOverdue ? "🚨 OVERDUE - CRITICAL PRIORITY" : false,
      isEOD: t.isEOD ? "⚠️ EOD - URGENT" : false,
      isMeetingPrep: isMeetingPrep
        ? `🔴 MEETING PREP - CRITICAL (for "${parentInfo?.text}")`
        : false,
      isPriority: t.isPriority,
      project: t.project,
      hasChildren: hasChildren ? "🔗 BLOCKED - has incomplete children" : false,
      hasBlockerChildren: hasBlockerChildren
        ? "🚫 NOT ACTIONABLE - has incomplete BLOCKER children (must resolve blockers first)"
        : false,
      isChild: isChild
        ? `👶 CHILD of: "${parentInfo?.text || "parent"}"`
        : false,
      isBlocker: isBlocker
        ? `🚧 BLOCKER - blocks parent "${parentInfo?.text || "parent"}" from being actionable`
        : false,
      parentId: t.parentId || undefined,
    };
  }),
  null,
  2,
)}

Current priority list:
${
  priorityTodos.length > 0
    ? JSON.stringify(
        priorityTodos.map((t) => ({
          id: t.id,
          text: t.text,
          type: t.type,
          priority: t.priority,
        })),
        null,
        2,
      )
    : "Empty"
}

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
        console.log(
          "AI returned suggestions:",
          suggestions.length,
          suggestions,
        );
        cleanResponse = responseText
          .replace(/SUGGESTIONS:\s*\[.*?\]/s, "")
          .trim();
      } catch (e) {
        console.error("Failed to parse suggestions:", e);
      }
    } else {
      console.log("No suggestions found in AI response");
    }

    const filteredSuggestions = suggestions.filter((id) =>
      todos.some((t) => t.id === id && !t.completed),
    );
    console.log(
      "Filtered suggestions:",
      filteredSuggestions.length,
      filteredSuggestions,
    );

    res.json({
      response: cleanResponse,
      suggestions: filteredSuggestions,
    });
  } catch (error: any) {
    console.error("Todd assistant error:", error);

    // Handle OpenAI rate limit errors
    if (error.status === 429) {
      return res.status(429).json({
        error: "OpenAI rate limit reached. Please wait a moment and try again.",
        details: error.message,
        retryAfter: error.headers?.["retry-after"] || 20,
      });
    }

    // Handle other OpenAI API errors
    if (error.status) {
      return res.status(error.status).json({
        error: `OpenAI API error: ${error.message}`,
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to get response from Todd",
      details: error.message,
    });
  }
}
