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
  try {
    console.log('PDF file size:', fileData.size, 'bytes');
    console.log('PDF file type:', fileData.type);
    
    // Convert PDF blob to ArrayBuffer for proper handling
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check if it's actually a PDF file
    const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 4));
    if (pdfHeader !== '%PDF') {
      console.log('Not a valid PDF file, header:', pdfHeader);
      throw new Error('Invalid PDF file format');
    }
    
    console.log('Valid PDF detected');
    
    // Convert to text for basic extraction (this is a simplified approach)
    let text = '';
    try {
      // Try to extract text using a simple approach
      const decoder = new TextDecoder('utf-8', { fatal: false });
      text = decoder.decode(uint8Array);
      console.log('PDF text extraction length:', text.length);
      console.log('PDF text sample (first 500 chars):', text.substring(0, 500));
    } catch (decodeError) {
      console.error('Failed to decode PDF as text:', decodeError);
      throw new Error('Unable to extract text from PDF');
    }
    
    const transactions: ParsedTransaction[] = [];
    
    // Enhanced regex patterns for the bank statement format shown
    const patterns = [
      // Pattern for: "1 Aug 2025 1 Aug 2025 TO TRANSFER-UPI/DR/... TRANSFER TO 489769516... 2,188.36 77,627.25"
      /(\d{1,2}\s+\w{3}\s+\d{4})\s+\d{1,2}\s+\w{3}\s+\d{4}\s+(.+?)\s+TRANSFER\s+TO\s+\d+\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
      
      // More flexible pattern for date-description-amount
      /(\d{1,2}\s+\w{3}\s+\d{4})\s+(.{20,}?)\s+([\d,]+\.?\d*)\s*$/gm,
      
      // Pattern for traditional CSV-like format
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*,\s*(.+?)\s*,\s*([\d,]+\.?\d*)/g,
      
      // General numeric pattern with dates
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+(.+?)\s+([\d,]+\.?\d*)/g,
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [fullMatch, dateStr, description, amountStr] = match;
        console.log('Pattern match:', { dateStr, description: description.substring(0, 50), amountStr });
        
        const cleanAmount = amountStr.replace(/[^\d.-]/g, '');
        const amount = parseFloat(cleanAmount);
        
        if (!isNaN(amount) && amount > 0) {
          // Clean up description
          const cleanDescription = description
            .replace(/TO TRANSFER-UPI\/DR\/\d+\/[^\/]+\//, '')
            .replace(/TRANSFER TO \d+/, '')
            .trim() || 'Bank Transfer';
          
          transactions.push({
            date: formatDate(dateStr),
            description: cleanDescription.substring(0, 100), // Limit description length
            amount: amount,
            type: 'expense' // Assume expenses for debit transactions
          });
        }
      }
      
      if (transactions.length > 0) {
        console.log(`Found ${transactions.length} transactions with pattern`);
        break; // Stop after first successful pattern
      }
    }
    
    // If no patterns worked, try a simpler line-by-line approach
    if (transactions.length === 0) {
      console.log('Trying line-by-line parsing...');
      const lines = text.split(/[\n\r]+/).filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        // Look for lines with dates and amounts
        const dateMatch = line.match(/(\d{1,2}\s+\w{3}\s+\d{4})/);
        const amountMatch = line.match(/([\d,]+\.?\d*)/g);
        
        if (dateMatch && amountMatch && amountMatch.length > 0) {
          // Take the first reasonable amount found
          for (const amountStr of amountMatch) {
            const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
            if (amount > 0 && amount < 1000000) { // Reasonable amount range
              transactions.push({
                date: formatDate(dateMatch[1]),
                description: 'Transaction from PDF',
                amount: amount,
                type: 'expense'
              });
              break;
            }
          }
        }
      }
    }
    
    console.log(`Final result: Parsed ${transactions.length} transactions from PDF`);
    return transactions;
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
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