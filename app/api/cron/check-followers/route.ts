import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/automation/check-followers`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      status: 'success',
      cron: 'check-followers',
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 }
    );
  }
}
