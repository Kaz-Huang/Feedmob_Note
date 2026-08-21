export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  title?: string | null;
  teamId?: string | null;
  team?: Team | null;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

export interface Reaction {
  id: string;
  logId: string;
  userId: string;
  user: User;
  emoji: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  logId: string;
  userId: string;
  user: User;
  content: string;
  blockId?: string | null;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  userId: string;
  user: User;
  date: string;
  title?: string | null;
  hasBlocker: boolean;
  mood?: string | null;
  contentJson: string; // JSON parsed editor content
  contentText: string;
  tags: { tag: Tag }[];
  comments: Comment[];
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
}

export interface LogFilterParams {
  teamId?: string;
  userId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  tag?: string;
  hasBlocker?: boolean;
  keyword?: string;
}
