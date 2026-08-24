import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let users = await prisma.user.findMany({
      include: {
        team: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (users.length === 0) {
      const defaultUser = await prisma.user.create({
        data: {
          email: 'user@workspace.local',
          name: '当前用户',
          role: 'ADMIN',
          title: '主账号',
          avatar: null,
        },
        include: { team: true },
      });
      users = [defaultUser];
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, title, role, teamId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const userEmail = email || `user_${Date.now()}@workspace.local`;
    const newUser = await prisma.user.create({
      data: {
        name,
        email: userEmail,
        title: title || '成员',
        role: role || 'MEMBER',
        teamId: teamId || null,
      },
      include: { team: true },
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, title } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        title: title !== undefined ? title : undefined,
      },
      include: { team: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

