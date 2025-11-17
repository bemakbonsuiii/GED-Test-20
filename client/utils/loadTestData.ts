type TodoType = "Task" | "Deliverable" | "Quick Win" | "Meeting";
type WorkspaceType = "personal" | "work" | "creative";
type Priority = "P0" | "P1" | "P2";

interface Project {
  id: string;
  name: string;
  description: string;
  workspace: WorkspaceType;
  createdAt: number;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  type: TodoType;
  startDate?: number;
  dueDate?: number;
  dueTime?: string;
  project?: string;
  workspace: WorkspaceType;
  priority: Priority;
  agenda?: string;
  meetingTime?: string;
  notes?: string;
  links?: string;
  parentId?: string;
  isPriority?: boolean;
  priorityOrder?: number;
}

export function loadTestData() {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  
  const projects: Project[] = [
    {
      id: "proj-1",
      name: "Website Redesign",
      description: "Complete overhaul of company website with new branding",
      workspace: "work",
      createdAt: now - 86400000 * 10
    },
    {
      id: "proj-2",
      name: "Q1 Marketing Campaign",
      description: "Launch new product marketing campaign for Q1",
      workspace: "work",
      createdAt: now - 86400000 * 15
    },
    {
      id: "proj-3",
      name: "Personal Finance",
      description: "Get finances organized and plan budget",
      workspace: "personal",
      createdAt: now - 86400000 * 5
    },
    {
      id: "proj-4",
      name: "Photography Portfolio",
      description: "Build online portfolio for photography work",
      workspace: "creative",
      createdAt: now - 86400000 * 20
    }
  ];

  const todos: Todo[] = [
    // High priority work tasks - some overdue
    {
      id: "todo-1",
      text: "Complete quarterly report",
      completed: false,
      createdAt: now - 86400000 * 5,
      type: "Deliverable",
      dueDate: todayMs - 86400000 * 2, // 2 days ago (overdue)
      dueTime: "17:00",
      project: "Q1 Marketing Campaign",
      workspace: "work",
      priority: "P0",
      notes: "Need to include metrics from all departments",
      isPriority: true,
      priorityOrder: 0
    },
    {
      id: "todo-2",
      text: "Review design mockups",
      completed: false,
      createdAt: now - 86400000 * 3,
      type: "Task",
      dueDate: todayMs, // Today
      dueTime: "15:00",
      project: "Website Redesign",
      workspace: "work",
      priority: "P0",
      links: "Figma|https://figma.com/mockups",
      isPriority: true,
      priorityOrder: 1
    },
    {
      id: "todo-3",
      text: "Fix critical bug in production",
      completed: false,
      createdAt: now - 3600000 * 4,
      type: "Quick Win",
      dueDate: todayMs,
      dueTime: "12:00",
      workspace: "work",
      priority: "P0",
      notes: "Users reporting errors on checkout page",
      isPriority: true,
      priorityOrder: 2
    },
    
    // Meetings with children
    {
      id: "todo-4",
      text: "Sprint Planning Meeting",
      completed: false,
      createdAt: now - 86400000 * 2,
      type: "Meeting",
      dueDate: todayMs + 86400000, // Tomorrow
      meetingTime: "10:00 AM",
      workspace: "work",
      priority: "P1",
      agenda: "Review last sprint, plan upcoming tasks, assign story points",
      links: "Zoom|https://zoom.us/j/123456"
    },
    {
      id: "todo-5",
      text: "Prepare sprint metrics slides",
      completed: false,
      createdAt: now - 86400000,
      type: "Task",
      dueDate: todayMs,
      dueTime: "23:59",
      workspace: "work",
      priority: "P1",
      parentId: "todo-4",
      isPriority: true,
      priorityOrder: 3
    },
    {
      id: "todo-6",
      text: "Review team capacity",
      completed: false,
      createdAt: now - 86400000,
      type: "Task",
      dueDate: todayMs,
      dueTime: "23:59",
      workspace: "work",
      priority: "P1",
      parentId: "todo-4",
      isPriority: true,
      priorityOrder: 4
    },
    {
      id: "todo-7",
      text: "Client presentation",
      completed: false,
      createdAt: now - 86400000 * 4,
      type: "Meeting",
      dueDate: todayMs + 86400000 * 3,
      meetingTime: "2:00 PM",
      project: "Website Redesign",
      workspace: "work",
      priority: "P0",
      agenda: "Present final designs and timeline",
      links: "Google Meet|https://meet.google.com/abc-defg-hij"
    },
    {
      id: "todo-8",
      text: "Create presentation deck",
      completed: true,
      createdAt: now - 86400000 * 3,
      type: "Deliverable",
      dueDate: todayMs - 86400000,
      workspace: "work",
      priority: "P0",
      parentId: "todo-7"
    },
    {
      id: "todo-9",
      text: "Practice presentation",
      completed: false,
      createdAt: now - 86400000 * 3,
      type: "Task",
      dueDate: todayMs + 86400000 * 2,
      dueTime: "18:00",
      workspace: "work",
      priority: "P0",
      parentId: "todo-7"
    },

    // Work tasks - various priorities
    {
      id: "todo-10",
      text: "Update documentation",
      completed: false,
      createdAt: now - 86400000 * 7,
      type: "Task",
      dueDate: todayMs + 86400000 * 5,
      dueTime: "23:59",
      project: "Website Redesign",
      workspace: "work",
      priority: "P2",
      notes: "Update API docs with new endpoints"
    },
    {
      id: "todo-11",
      text: "Code review for PR #234",
      completed: false,
      createdAt: now - 86400000,
      type: "Quick Win",
      dueDate: todayMs + 86400000,
      dueTime: "16:00",
      workspace: "work",
      priority: "P1",
      links: "GitHub|https://github.com/company/repo/pull/234"
    },
    {
      id: "todo-12",
      text: "Write unit tests",
      completed: false,
      createdAt: now - 86400000 * 3,
      type: "Task",
      workspace: "work",
      priority: "P2",
      project: "Website Redesign"
    },
    {
      id: "todo-13",
      text: "Set up CI/CD pipeline",
      completed: false,
      createdAt: now - 86400000 * 8,
      type: "Deliverable",
      dueDate: todayMs + 86400000 * 7,
      dueTime: "23:59",
      workspace: "work",
      priority: "P1",
      notes: "Use GitHub Actions for automated testing and deployment"
    },

    // Personal tasks
    {
      id: "todo-14",
      text: "Doctor's appointment",
      completed: false,
      createdAt: now - 86400000 * 10,
      type: "Meeting",
      dueDate: todayMs + 86400000 * 4,
      meetingTime: "9:00 AM",
      workspace: "personal",
      priority: "P0",
      agenda: "Annual checkup"
    },
    {
      id: "todo-15",
      text: "Organize tax documents",
      completed: false,
      createdAt: now - 86400000 * 12,
      type: "Task",
      dueDate: todayMs + 86400000 * 30,
      dueTime: "23:59",
      project: "Personal Finance",
      workspace: "personal",
      priority: "P1",
      notes: "Gather all receipts and forms for tax season"
    },
    {
      id: "todo-16",
      text: "Call mom",
      completed: false,
      createdAt: now - 86400000 * 2,
      type: "Quick Win",
      dueDate: todayMs,
      dueTime: "19:00",
      workspace: "personal",
      priority: "P1"
    },
    {
      id: "todo-17",
      text: "Buy groceries",
      completed: false,
      createdAt: now - 86400000,
      type: "Quick Win",
      dueDate: todayMs + 86400000,
      dueTime: "18:00",
      workspace: "personal",
      priority: "P2",
      notes: "Milk, eggs, bread, vegetables"
    },
    {
      id: "todo-18",
      text: "Review investment portfolio",
      completed: false,
      createdAt: now - 86400000 * 15,
      type: "Task",
      project: "Personal Finance",
      workspace: "personal",
      priority: "P2",
      links: "Vanguard|https://investor.vanguard.com"
    },
    {
      id: "todo-19",
      text: "Plan vacation",
      completed: false,
      createdAt: now - 86400000 * 5,
      type: "Task",
      dueDate: todayMs + 86400000 * 14,
      dueTime: "23:59",
      workspace: "personal",
      priority: "P2",
      notes: "Research destinations, book flights and hotels"
    },

    // Creative tasks
    {
      id: "todo-20",
      text: "Edit photoshoot from weekend",
      completed: false,
      createdAt: now - 86400000 * 3,
      type: "Task",
      dueDate: todayMs + 86400000 * 5,
      dueTime: "23:59",
      project: "Photography Portfolio",
      workspace: "creative",
      priority: "P1",
      notes: "Use Lightroom for initial edits"
    },
    {
      id: "todo-21",
      text: "Design new logo concepts",
      completed: false,
      createdAt: now - 86400000 * 6,
      type: "Deliverable",
      dueDate: todayMs + 86400000 * 8,
      dueTime: "23:59",
      workspace: "creative",
      priority: "P0",
      notes: "Client wants 3 options to choose from"
    },
    {
      id: "todo-22",
      text: "Update portfolio website",
      completed: false,
      createdAt: now - 86400000 * 20,
      type: "Task",
      project: "Photography Portfolio",
      workspace: "creative",
      priority: "P2",
      links: "Portfolio|https://myportfolio.com"
    },
    {
      id: "todo-23",
      text: "Learn new Photoshop technique",
      completed: false,
      createdAt: now - 86400000 * 4,
      type: "Quick Win",
      workspace: "creative",
      priority: "P2",
      links: "Tutorial|https://youtube.com/watch?v=example"
    },

    // Completed tasks (for metrics)
    {
      id: "todo-24",
      text: "Send weekly status email",
      completed: true,
      createdAt: now - 86400000 * 3,
      type: "Quick Win",
      dueDate: todayMs - 86400000 * 2,
      dueTime: "09:00",
      workspace: "work",
      priority: "P1"
    },
    {
      id: "todo-25",
      text: "Finish reading design book",
      completed: true,
      createdAt: now - 86400000 * 30,
      type: "Task",
      dueDate: todayMs - 86400000 * 5,
      workspace: "personal",
      priority: "P2"
    },
    {
      id: "todo-26",
      text: "Weekly team sync",
      completed: true,
      createdAt: now - 86400000 * 7,
      type: "Meeting",
      dueDate: todayMs - 86400000 * 7,
      meetingTime: "10:00 AM",
      workspace: "work",
      priority: "P1",
      agenda: "Discuss weekly progress and blockers"
    },
    
    // More future tasks
    {
      id: "todo-27",
      text: "Research new framework options",
      completed: false,
      createdAt: now - 86400000 * 2,
      type: "Task",
      dueDate: todayMs + 86400000 * 10,
      dueTime: "23:59",
      workspace: "work",
      priority: "P2",
      notes: "Compare React, Vue, and Svelte for next project"
    },
    {
      id: "todo-28",
      text: "Schedule dentist appointment",
      completed: false,
      createdAt: now - 86400000 * 14,
      type: "Quick Win",
      workspace: "personal",
      priority: "P2"
    },
    {
      id: "todo-29",
      text: "Quarterly planning session",
      completed: false,
      createdAt: now - 86400000 * 5,
      type: "Meeting",
      dueDate: todayMs + 86400000 * 20,
      meetingTime: "1:00 PM",
      workspace: "work",
      priority: "P1",
      agenda: "Set goals and priorities for next quarter",
      project: "Q1 Marketing Campaign"
    },
    {
      id: "todo-30",
      text: "Backup computer files",
      completed: false,
      createdAt: now - 86400000 * 8,
      type: "Task",
      dueDate: todayMs + 86400000 * 2,
      dueTime: "20:00",
      workspace: "personal",
      priority: "P1",
      notes: "Use external hard drive and cloud backup"
    }
  ];

  return { todos, projects };
}
