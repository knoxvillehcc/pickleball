import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const credFilePath = path.join(process.cwd(), 'credentials.json');

export async function GET() {
  try {
    const data = await fs.readFile(credFilePath, 'utf8');
    const parsed = JSON.parse(data);
    return NextResponse.json({ 
      ...parsed, 
      password: parsed.password ? '************' : '',
    });
  } catch (error) {
    return NextResponse.json({}, { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    let existing = {};
    
    try {
      const existingData = await fs.readFile(credFilePath, 'utf8');
      existing = JSON.parse(existingData);
    } catch (e) {}

    let finalPassword = body.password;
    if (finalPassword === '************') {
      finalPassword = existing.password;
    }

    const dataToSave = {
      url: body.url || '',
      db: body.db || '',
      username: body.username || '',
      password: finalPassword || '',
      environment: body.environment || 'production',
      dryRunDefault: body.dryRunDefault !== undefined ? body.dryRunDefault : true,
    };

    await fs.writeFile(credFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }
}