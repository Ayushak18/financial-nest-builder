import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedTransaction {
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense' | 'savings';
  category?: string;
  account?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      'https://lglsznnzluzurtkzxiek.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbHN6bm56bHV6dXJ0a3p4aWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMTMzOTUsImV4cCI6MjA2Nzg4OTM5NX0.MYN6Bv6J_sCDmv28SquJPKogTpHlSVhIxa8Gy0kNArI',
      { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { sessionId, filePath } = await req.json();
    console.log('Processing file:', filePath, 'for session:', sessionId);

    // Get the import session
    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update session status to processing
    await supabase
      .from('import_sessions')
      .update({ status: 'processing' })
      .eq('id', sessionId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('imports')
      .download(filePath);

    if (downloadError || !fileData) {
      await supabase
        .from('import_sessions')
        .update({ status: 'failed' })
        .eq('id', sessionId);
      
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let parsedTransactions: ParsedTransaction[] = [];
    
    try {
      if (session.file_type === 'csv') {
        parsedTransactions = await parseCSV(fileData);
      } else if (session.file_type === 'excel') {
        parsedTransactions = await parseExcel(fileData);
      } else if (session.file_type === 'pdf') {
        parsedTransactions = await parsePDF(fileData);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      await supabase
        .from('import_sessions')
        .update({ status: 'failed' })
        .eq('id', sessionId);
      
      return new Response(JSON.stringify({ error: 'Failed to parse file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create import items for each parsed transaction
    const importItems = parsedTransactions.map((transaction, index) => ({
      session_id: sessionId,
      raw_data: transaction,
      parsed_data: transaction,
      transaction_type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      category_name: transaction.category,
      account_name: transaction.account,
      status: 'pending'
    }));

    const { error: insertError } = await supabase
      .from('import_items')
      .insert(importItems);

    if (insertError) {
      console.error('Insert error:', insertError);
      await supabase
        .from('import_sessions')
        .update({ status: 'failed' })
        .eq('id', sessionId);
      
      return new Response(JSON.stringify({ error: 'Failed to save parsed data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update session with parsed status
    await supabase
      .from('import_sessions')
      .update({ 
        status: 'parsed',
        total_items: parsedTransactions.length 
      })
      .eq('id', sessionId);

    return new Response(JSON.stringify({ 
      success: true, 
      itemCount: parsedTransactions.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function parseCSV(fileData: Blob): Promise<ParsedTransaction[]> {
  const text = await fileData.text();
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    return parseTransactionRow(row);
  }).filter(t => t !== null) as ParsedTransaction[];
}

async function parseExcel(fileData: Blob): Promise<ParsedTransaction[]> {
  // For now, treat Excel files similar to CSV
  // In production, you'd use a proper Excel parsing library
  return parseCSV(fileData);
}

async function parsePDF(fileData: Blob): Promise<ParsedTransaction[]> {
  const text = await fileData.text();
  console.log('PDF text content (first 500 chars):', text.substring(0, 500));
  
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Enhanced patterns for bank statement formats
  const patterns = [
    // Pattern for format: "1 Aug 2025 1 Aug 2025 DESCRIPTION REFERENCE 2,188.36 77,627.25"
    /(\d{1,2}\s+\w{3}\s+\d{4})\s+(\d{1,2}\s+\w{3}\s+\d{4})\s+(.+?)\s+(\w+\s+TO\s+\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
    // Pattern for tabular format with debit/credit columns
    /(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+\w{3}\s+\d{4})\s+.+?\s+([\d,]+\.?\d*)\s*$/gm,
    // General date-description-amount patterns
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?[\d,]+\.?\d*)/g,
    /(\d{1,2}-\d{1,2}-\d{4})\s+(.+?)\s+([-+]?[\d,]+\.?\d*)/g,
  ];
  
  // Try to parse as tabular data first
  let headerFound = false;
  let dateColumnIndex = -1;
  let descriptionColumnIndex = -1;
  let debitColumnIndex = -1;
  let creditColumnIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for header row
    if (!headerFound && (line.includes('Date') || line.includes('Description') || line.includes('Debit') || line.includes('Credit'))) {
      headerFound = true;
      const columns = line.split(/\s{2,}|\t/); // Split by multiple spaces or tabs
      
      columns.forEach((col, index) => {
        const colLower = col.toLowerCase();
        if (colLower.includes('date') && !colLower.includes('value')) {
          dateColumnIndex = index;
        } else if (colLower.includes('description')) {
          descriptionColumnIndex = index;
        } else if (colLower.includes('debit')) {
          debitColumnIndex = index;
        } else if (colLower.includes('credit')) {
          creditColumnIndex = index;
        }
      });
      continue;
    }
    
    // Parse data rows if header was found
    if (headerFound && dateColumnIndex >= 0) {
      const columns = line.split(/\s{2,}|\t/);
      if (columns.length > Math.max(dateColumnIndex, descriptionColumnIndex, debitColumnIndex, creditColumnIndex)) {
        const dateStr = columns[dateColumnIndex]?.trim();
        const description = columns[descriptionColumnIndex]?.trim() || 'Transaction';
        const debitStr = columns[debitColumnIndex]?.trim() || '';
        const creditStr = columns[creditColumnIndex]?.trim() || '';
        
        // Process debit amount
        if (debitStr && debitStr !== '' && !isNaN(parseFloat(debitStr.replace(/[^\d.-]/g, '')))) {
          const amount = parseFloat(debitStr.replace(/[^\d.-]/g, ''));
          if (amount > 0) {
            transactions.push({
              date: formatDate(dateStr),
              description: description,
              amount: amount,
              type: 'expense'
            });
          }
        }
        
        // Process credit amount
        if (creditStr && creditStr !== '' && !isNaN(parseFloat(creditStr.replace(/[^\d.-]/g, '')))) {
          const amount = parseFloat(creditStr.replace(/[^\d.-]/g, ''));
          if (amount > 0) {
            transactions.push({
              date: formatDate(dateStr),
              description: description,
              amount: amount,
              type: 'income'
            });
          }
        }
      }
    }
  }
  
  // If tabular parsing didn't work, fall back to regex patterns
  if (transactions.length === 0) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let dateStr, description, amountStr;
        
        if (match.length === 7) {
          // Format: date, value_date, description, reference, debit, balance
          [, dateStr, , description, , amountStr] = match;
        } else if (match.length === 4) {
          // Format: date, description, amount
          [, dateStr, description, amountStr] = match;
        } else {
          continue;
        }
        
        const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
        
        if (!isNaN(amount) && Math.abs(amount) > 0) {
          transactions.push({
            date: formatDate(dateStr),
            description: description.trim(),
            amount: Math.abs(amount),
            type: amount < 0 ? 'expense' : 'income'
          });
        }
      }
    }
  }
  
  console.log(`Parsed ${transactions.length} transactions from PDF`);
  return transactions;
}

function parseTransactionRow(row: Record<string, string>): ParsedTransaction | null {
  const amount = parseFloat(row.amount || row.debit || row.credit || '0');
  if (isNaN(amount) || amount === 0) return null;
  
  const description = row.description || row.narration || row.details || 'Unknown';
  const dateStr = row.date || row['transaction date'] || row['value date'] || '';
  
  return {
    amount: Math.abs(amount),
    description,
    date: formatDate(dateStr),
    type: amount < 0 || row.debit ? 'expense' : 'income',
    category: row.category,
    account: row.account
  };
}

function formatDate(dateStr: string): string {
  try {
    // Handle various date formats
    const cleaned = dateStr.replace(/[^\d\/\-]/g, '');
    const date = new Date(cleaned);
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}