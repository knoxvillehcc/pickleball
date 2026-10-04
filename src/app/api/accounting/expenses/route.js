import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getExpenses, insertExpense, updateExpense, deleteExpense } from '@/lib/expensesDb';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await getSessionAndPermissions('expenses');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventTag = searchParams.get('eventTag') || 'all';
    const status   = searchParams.get('status') || 'all';

    const expenses = await getExpenses({ eventTag, status });
    return NextResponse.json({ success: true, expenses });
  } catch (err) {
    console.error('[Expenses API GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await getSessionAndPermissions('expenses');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const {
      expense_date,
      vendor_name,
      account_code,
      account_name,
      amount,
      payment_method,
      payment_ref,
      description,
      event_tag,
      analytic_account,
    } = body;

    if (!vendor_name || !account_code || !amount || Number(amount) <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Vendor name, account category, and a positive amount are required.',
      }, { status: 400 });
    }

    const newExpense = await insertExpense({
      expense_date: expense_date || new Date().toISOString().split('T')[0],
      vendor_name: vendor_name.trim(),
      account_code: String(account_code),
      account_name: account_name || '',
      amount: parseFloat(amount),
      payment_method: payment_method || 'check',
      payment_ref: payment_ref ? payment_ref.trim() : '',
      description: description ? description.trim() : '',
      event_tag: event_tag || 'general',
      analytic_account: analytic_account || (event_tag !== 'general' ? event_tag : ''),
      status: 'draft',
      created_by: auth.user?.email || 'admin',
    });

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (err) {
    console.error('[Expenses API POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await getSessionAndPermissions('expenses');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID required' }, { status: 400 });
    }

    if (updates.amount !== undefined) {
      updates.amount = parseFloat(updates.amount);
    }

    const updated = await updateExpense(id, updates);
    return NextResponse.json({ success: true, expense: updated });
  } catch (err) {
    console.error('[Expenses API PUT] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await getSessionAndPermissions('expenses');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID required' }, { status: 400 });
    }

    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Expenses API DELETE] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
