import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { UnipileClient } from '@/lib/unipile';

const prisma = new PrismaClient();
const unipile = new UnipileClient();

const WELCOME_MESSAGE = 'Opa! Vi aqui que você me seguiu. Vamos ganhar dinheiro? 😎';

export async function POST() {
  const startTime = Date.now();
  let followersFound = 0;
  let messagesSent = 0;
  let errors = 0;
  let errorDetails: string[] = [];

  try {
    console.log('🔍 Buscando seguidores...');
    const followers = await unipile.getFollowers();
    followersFound = followers.length;
    console.log(`✅ Encontrados ${followersFound} seguidores`);

    for (const follower of followers) {
      try {
        const { id: instagramId, username, display_name } = follower;

        const existing = await prisma.followerMessage.findUnique({
          where: { instagramId },
        });

        if (!existing) {
          console.log(`🆕 Novo seguidor encontrado: @${username}`);

          await prisma.followerMessage.create({
            data: {
              instagramId,
              username,
              fullName: display_name || username,
              messageSent: false,
            },
          });

          console.log(`📤 Enviando mensagem para @${username}...`);
          const sent = await unipile.sendMessage(instagramId, WELCOME_MESSAGE);

          if (sent) {
            await prisma.followerMessage.update({
              where: { instagramId },
              data: {
                messageSent: true,
                sentAt: new Date(),
              },
            });
            messagesSent++;
            console.log(`✅ Mensagem enviada para @${username}`);
          } else {
            errors++;
            errorDetails.push(`Falha ao enviar para @${username}`);
            console.error(`❌ Falha ao enviar para @${username}`);
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        errors++;
        const errorMsg = `Erro processando ${follower.username}: ${error}`;
        errorDetails.push(errorMsg);
        console.error(errorMsg);
      }
    }

    await prisma.automationLog.create({
      data: {
        action: 'check_followers',
        followersFound,
        messagesSent,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails.join('; ') : null,
      },
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ Execução completa em ${duration}ms`);

    return NextResponse.json({
      success: true,
      followersFound,
      newFollowers: messagesSent,
      messagesSent,
      errors,
      duration: `${Math.round(duration / 1000)}s`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Erro crítico na automação:', error);
    
    await prisma.automationLog.create({
      data: {
        action: 'check_followers',
        followersFound,
        messagesSent,
        errors: errors + 1,
        errorDetails: `Erro crítico: ${error}`,
      },
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao processar automação',
        details: String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
