import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { PaymentResponse } from '../mocks/invoiceData';

// Use the VITE_API_BASE_URL from .env file
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/';

// Remove trailing slash if present to avoid double slashes in URLs
const normalizedBaseUrl = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;

// Define our invoice interface based on the API documentation
export interface InvoiceModel {
  id: number;
  hash_code: string;
  user_account_number: string;
  invoice_number: string;
  company_number: string;
  customer_number: string;
  invoice_amount: string; // API returns this as a string
  payment_due_date: string;
  payment_date: string | null;
  customer_ach_enabled: number; // API returns this as 0 or 1
  customer_cc_token: number; // API returns this as 0 or 1
  payment_method: string | null;
  cc_service_fee: string; // API returns this as a string
  control_number: string | null;
  status: string;
  date_paid: string | null;
  created_at: string;
  updated_at: string;
  // The API doesn't actually return a pin field
  pin?: string;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Invoice'],
  endpoints: (builder) => ({
    // Get invoice by ID or hash code
    getInvoice: builder.query<InvoiceModel, { invoiceId: string; pin: string }>({
      query: ({ invoiceId, pin }) => `${normalizedBaseUrl}api/invoices/${invoiceId}?pin=${pin}`,
      providesTags: (result) =>
        result ? [{ type: 'Invoice', id: result.invoice_number }] : ['Invoice'],
    }),
    
    // Update invoice with PIN verification
    updateInvoice: builder.mutation<InvoiceModel, { invoiceId: string; data: Partial<InvoiceModel> & { pin: string } }>({
      query: ({ invoiceId, data }) => ({
        url: `${normalizedBaseUrl}api/invoices/${invoiceId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'Invoice', id: result.invoice_number }] : ['Invoice'],
    }),
    
    // This is a helper mutation that combines getting the invoice and updating it
    // It's used for scheduling payments
    schedulePayment: builder.mutation<
      PaymentResponse,
      {
        invoiceId: string;
        pin: string;
        paymentMethod: 'ACH' | 'Credit Card' | 'Check';
        paymentDate: string;
      }
    >({
      async queryFn({ invoiceId, pin, paymentMethod, paymentDate }, _api, _extraOptions, fetchWithBQ) {
        try {
          // Update the invoice with payment details
          const updateResult = await fetchWithBQ({
            url: `${normalizedBaseUrl}api/invoices/${invoiceId}`,
            method: 'PUT',
            body: {
              pin,
              payment_method: paymentMethod,
              payment_date: paymentDate,
              status: 'Scheduled for payment'
            }
          });
          
          if (updateResult.error) {
            return { error: updateResult.error };
          }
          
          const invoice = updateResult.data as InvoiceModel;
          
          // Create a response object similar to the previous implementation
          const processingFee = paymentMethod === 'Credit Card' ? parseFloat(invoice.cc_service_fee) : 0;
          
          const response: PaymentResponse = {
            invoiceNumber: invoice.invoice_number,
            customer: invoice.customer_number,
            paymentOption: 'Payment on scheduled date',
            paymentMethod: paymentMethod === 'Credit Card'
              ? 'Credit card on file'
              : paymentMethod === 'ACH'
              ? 'ACH on file'
              : 'Check',
            paymentAmount: parseFloat(invoice.invoice_amount),
            processingFee,
            totalAmount: parseFloat(invoice.invoice_amount) + processingFee,
            transactionDate: paymentDate,
            transactionId: invoice.control_number,
            success: true,
          };
          
          return { data: response };
        } catch (error) {
          return { error: { status: 500, data: 'Failed to schedule payment' } };
        }
      },
      invalidatesTags: ['Invoice'],
    }),
  }),
});

export const { 
  useGetInvoiceQuery, 
  useUpdateInvoiceMutation,
  useSchedulePaymentMutation 
} = api;
