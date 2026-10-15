import { localizeDemo } from './demo-copy';
import { emptyWorkspace, dateKey, type Workspace } from '@buildos/shared';
export type DemoMode = 'empty' | 'full';
export function createDemo(mode: DemoMode = 'full'): Workspace {
  const workspace = emptyWorkspace();
  if (mode === 'empty') return workspace;
  const today = new Date();
  const day = (offset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return dateKey(date);
  };
  workspace.projects = [
    {
      id: 'demo-alatau',
      name: 'Alatau Residence',
      customer: 'Alatau Development',
      city: 'Алматы · Бостандыкский район',
      budget: 8500000000,
      start: day(-120),
      end: day(420),
      status: 'ACTIVE',
    },
    {
      id: 'demo-business',
      name: 'Northern Business Park',
      customer: 'Northern Group',
      city: 'Астана · Есильский район',
      budget: 3200000000,
      start: day(-60),
      end: day(240),
      status: 'ACTIVE',
    },
    {
      id: 'demo-school',
      name: 'School № 48',
      customer: 'City Development',
      city: 'Шымкент · Туранский район',
      budget: 1800000000,
      start: day(14),
      end: day(280),
      status: 'PLANNING',
    },
  ];
  const titles = [
    'Foundation · Block A',
    'Reinforcement · Floor 2',
    'Concrete acceptance',
    'Facade · Block B',
    'Ventilation inspection',
    'Electrical installation',
    'Waterproofing · Level −1',
    'Delivery coordination',
  ];
  workspace.tasks = Array.from({ length: 120 }, (_, i) => ({
    id: `demo-task-${i}`,
    projectId: workspace.projects[i % 3]!.id,
    title: titles[i % titles.length]!,
    assignee: ['А. Садыков', 'М. Ахметова', 'Д. Ким'][i % 3]!,
    due: day((i % 24) - 2),
    priority: i % 4 === 0 ? 'HIGH' : 'MEDIUM',
    status: i < 66 ? 'DONE' : i < 90 ? 'IN_PROGRESS' : 'TODO',
    weight: (i % 3) + 1,
  }));
  workspace.issues = [
    {
      id: 'demo-issue-1',
      projectId: 'demo-alatau',
      title: 'Waterproofing · Block A, level −1',
      description: 'Check the joint before the next stage.',
      assignee: 'А. Садыков',
      due: day(1),
      priority: 'HIGH',
      status: 'OPEN',
    },
    {
      id: 'demo-issue-2',
      projectId: 'demo-business',
      title: 'Concrete certificate · delivery 024',
      description: 'Attach the supplier certificate.',
      assignee: 'Д. Ким',
      due: day(3),
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
  ];
  workspace.budgetLines = workspace.projects.flatMap((project, i) => [
    {
      id: `demo-budget-${i}`,
      projectId: project.id,
      name: 'Construction materials',
      category: 'materials',
      planned: Math.round(project.budget * 0.6),
      actual: Math.round(project.budget * 0.23),
      committed: Math.round(project.budget * 0.18),
    },
    {
      id: `demo-labor-${i}`,
      projectId: project.id,
      name: 'Construction works',
      category: 'labor',
      planned: Math.round(project.budget * 0.4),
      actual: Math.round(project.budget * 0.12),
      committed: Math.round(project.budget * 0.09),
    },
  ]);
  workspace.members = [
    {
      id: 'demo-member-1',
      name: 'Аслан Садыков',
      role: 'Project Manager',
      email: 'aslan@example.com',
      phone: '',
    },
    {
      id: 'demo-member-2',
      name: 'Мадина Ахметова',
      role: 'Chief Engineer',
      email: 'madina@example.com',
      phone: '',
    },
    {
      id: 'demo-member-3',
      name: 'Даниил Ким',
      role: 'Site Engineer',
      email: 'daniil@example.com',
      phone: '',
    },
  ];
  workspace.requests = [
    'Бетон В30',
    'Арматура А500С',
    'Гидроизоляционная мембрана',
  ].map((name, i) => ({
    id: 'demo-request-' + i,
    projectId: workspace.projects[i]!.id,
    name,
    quantity: [120, 24, 850][i]!,
    unit: ['м³', 'т', 'м²'][i]!,
    due: day(i + 3),
    status: 'requested',
  }));
  workspace.activity = workspace.projects.map((project) => ({
    id: crypto.randomUUID(),
    kind: 'eventProject',
    title: project.name,
    createdAt: today.toISOString(),
  }));
  return localizeDemo(workspace, 'ru');
}
