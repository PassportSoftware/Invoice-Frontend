export interface Invoice {
  id: string;
  customer: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  originalAmount: number;
  creditMemo: {
    id: string;
    amount: number;
  };
  outstandingBalance: number;
  pin: string; // 6-digit PIN for verification
}

export interface PaymentResponse {
  invoiceNumber: string;
  customer: string;
  paymentOption: string;
  paymentMethod: string;
  paymentAmount: number;
  processingFee: number;
  totalAmount: number;
  transactionDate: string;
  transactionId: string | null;
  success: boolean;
}

// Mock invoice data
export const mockInvoices: Invoice[] = [
  {
    id: '1',
    customer: 'Acme Corporation',
    invoiceNumber: 'INV-2023-0042',
    issueDate: '2023-04-15',
    dueDate: '2023-05-15',
    originalAmount: 2500.00,
    creditMemo: {
      id: 'CM-001',
      amount: 150.00
    },
    outstandingBalance: 2350.00,
    pin: '123456'
  },
  {
    id: '2',
    customer: 'Globex Industries',
    invoiceNumber: 'INV-2023-0055',
    issueDate: '2023-04-20',
    dueDate: '2023-05-20',
    originalAmount: 3750.00,
    creditMemo: {
      id: 'CM-002',
      amount: 250.00
    },
    outstandingBalance: 3500.00,
    pin: '654321'
  },
  {
    id: '3',
    customer: 'Wayne Enterprises',
    invoiceNumber: 'INV-2023-0061',
    issueDate: '2023-04-25',
    dueDate: '2023-05-25',
    originalAmount: 5000.00,
    creditMemo: {
      id: 'CM-003',
      amount: 500.00
    },
    outstandingBalance: 4500.00,
    pin: '987654'
  }
];
