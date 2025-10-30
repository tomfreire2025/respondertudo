import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  try {
    const prisma = new PrismaClient();

    const [
      totalFollowers,
      totalMessagesSent,
      todayFollowers,
      recentActivity,
      lastLog
    ] = await Promise.all([
      prisma.followerMessage.count(),
      prisma.followerMessage.count({ where: { messageSent: true } }),
      prisma.followerMessage.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.followerMessage.findMany({
        where: { messageSent: true },
        orderBy: { sentAt: 'desc' },
        take: 5,
        select: {
          username: true,
          fullName: true,
          sentAt: true,
          responded: true,
        }
      }),
      prisma.automationLog.findFirst({
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const respondedCount = await prisma.followerMessage.count({
      where: { responded: true }
    });
    const responseRate = totalMessagesSent > 0 
      ? Math.round((respondedCount / totalMessagesSent) * 100)
      : 0;

    await prisma.$disconnect();

    return NextResponse.json({
      totalFollowers,
      messagesSent: totalMessagesSent,
      newToday: todayFollowers,
      responseRate,
      recentActivity: recentActivity.map(a => ({
        user: `@${a.username}`,
        fullName: a.fullName,
        action: 'Seguiu você',
        time: getRelativeTime(a.sentAt),
        status: 'sent',
        responded: a.responded
      })),
      lastCheck: lastLog?.createdAt?.toISOString() || new Date().toISOString(),
      lastExecution: {
        followersFound: lastLog?.followersFound || 0,
        messagesSent: lastLog?.messagesSent || 0,
        errors: lastLog?.errors || 0,
      }
    });

  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}

function getRelativeTime(date: Date | null): string {
  if (!date) return 'Agora';
  
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min atrás`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}
