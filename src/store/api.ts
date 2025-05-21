import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Invoice, PaymentResponse } from '../mocks/invoiceData';
import { mockInvoices } from '../mocks/invoiceData';

// In a real app, this would be an environment variable
const BASE_URL = '/api';

// For demo purposes, we'll simulate API calls using our mock data
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Invoice'],
  endpoints: (builder) => ({
    // Get invoice by ID and verify PIN
    getInvoice: builder.query<Invoice | null, { invoiceId: string; pin: string }>(
      {
        queryFn: ({ invoiceId, pin }) => {
          // Simulate API delay
          return new Promise((resolve) => {
            setTimeout(() => {
              const invoice = mockInvoices.find((inv) => inv.id === invoiceId);
              
              if (!invoice) {
                resolve({ data: null });
                return;
              }
              
              if (invoice.pin !== pin) {
                resolve({ error: { status: 401, data: 'Invalid PIN' } });
                return;
              }
              
              resolve({ data: invoice });
            }, 500);
          });
        },
        providesTags: (result) =>
          result ? [{ type: 'Invoice', id: result.id }] : ['Invoice'],
      }
    ),
    
    // Process payment
    processPayment: builder.mutation<
      PaymentResponse,
      {
        invoiceId: string;
        paymentOption: 'full' | 'partial' | 'dueDate';
        paymentMethod: 'creditCard' | 'ach' | 'check';
        paymentAmount?: number;
        additionalMessage?: string;
      }
    >({
      queryFn: ({
        invoiceId,
        paymentOption,
        paymentMethod,
        paymentAmount,
        // Use additionalMessage in the actual implementation
      }) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const invoice = mockInvoices.find((inv) => inv.id === invoiceId);
            
            if (!invoice) {
              resolve({ error: { status: 404, data: 'Invoice not found' } });
              return;
            }
            
            const amount =
              paymentOption === 'full'
                ? invoice.outstandingBalance
                : paymentOption === 'partial'
                ? paymentAmount || 0
                : invoice.outstandingBalance;
            
            const processingFee = paymentMethod === 'creditCard' ? amount * 0.029 : 0;
            
            const response: PaymentResponse = {
              invoiceNumber: invoice.invoiceNumber,
              customer: invoice.customer,
              paymentOption: paymentOption === 'full' 
                ? 'Full payment now'
                : paymentOption === 'partial'
                ? 'Partial payment now'
                : 'Payment on due date',
              paymentMethod: paymentMethod === 'creditCard'
                ? 'Credit card on file'
                : paymentMethod === 'ach'
                ? 'ACH on file'
                : 'Check',
              paymentAmount: amount,
              processingFee,
              totalAmount: amount + processingFee,
              transactionDate: new Date().toLocaleDateString(),
              transactionId: `TRX-${Math.floor(Math.random() * 1000000)}`,
              success: true,
            };
            
            resolve({ data: response });
          }, 1000);
        });
      },
      invalidatesTags: (result) =>
        result ? [{ type: 'Invoice', id: result.invoiceNumber }] : ['Invoice'],
    }),
  }),
});

export const { useGetInvoiceQuery, useProcessPaymentMutation } = api;
