import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useGetInvoiceQuery, useSchedulePaymentMutation } from '../store/api';
import type { InvoiceModel } from '../store/api';

type PaymentOption = 'full' | 'partial' | 'dueDate';
type PaymentMethod = 'Credit Card' | 'ACH' | 'Check';

interface PaymentFormData {
  paymentOption: PaymentOption;
  paymentAmount?: number;
  paymentMethod: PaymentMethod;
  additionalMessage?: string;
}

const schema = yup.object().shape({
  paymentOption: yup.string().required('Payment option is required').oneOf(['full', 'partial', 'dueDate']),
  paymentAmount: yup.number().when('paymentOption', {
    is: 'partial',
    then: (schema) => schema.required('Payment amount is required').positive('Amount must be positive'),
    otherwise: (schema) => schema.optional(),
  }),
  paymentMethod: yup.string().required('Payment method is required').oneOf(['Credit Card', 'ACH', 'Check']),
  additionalMessage: yup.string().max(100, 'Message cannot exceed 100 characters'),
});

// No longer need a constant for credit card fee as it comes from the API

const Invoice: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId') || '';
  const pin = searchParams.get('pin') || '';
  
  // First, get the invoice details
  const { data: invoice, isLoading, error: fetchError } = useGetInvoiceQuery({ invoiceId, pin }) as { data: InvoiceModel | undefined, isLoading: boolean, error: any };
  const [schedulePayment, { isLoading: isProcessing }] = useSchedulePaymentMutation();
  
  const [showPartialPayment, setShowPartialPayment] = useState(false);
  
  // If we have invoice data, the PIN was already verified by the API
  // No need for local verification since the API returns 200 only if PIN is valid
  const isVerified = !!invoice;
  
  // Determine if the invoice already has payment data
  const hasExistingPayment = invoice && invoice.payment_method && invoice.payment_date;
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: yupResolver(schema) as any, // Type assertion to fix resolver type issue
  });
  
  // Set form values when invoice data is loaded
  React.useEffect(() => {
    if (hasExistingPayment && invoice) {
      // Determine the payment option based on the payment date
      const paymentDate = new Date(invoice.payment_date!);
      const dueDate = new Date(invoice.payment_due_date);
      
      // If payment date is the same as due date or in the future, set to "dueDate" option
      // Otherwise, set to "full" for immediate payment
      if (paymentDate >= dueDate || 
          invoice.status.toLowerCase().includes('scheduled')) {
        setValue('paymentOption', 'dueDate');
      } else {
        setValue('paymentOption', 'full');
      }
      
      // Set the payment method if it exists
      if (invoice.payment_method === 'Credit Card' || 
          invoice.payment_method === 'ACH' || 
          invoice.payment_method === 'Check') {
        setValue('paymentMethod', invoice.payment_method as PaymentMethod);
      }
    }
  }, [invoice, hasExistingPayment, setValue]);
  
  // Watch payment option to conditionally show partial payment field
  const paymentOption = watch('paymentOption');
  const selectedPaymentMethod = watch('paymentMethod');
  
  // Update partial payment visibility when payment option changes
  React.useEffect(() => {
    if (paymentOption === 'partial') {
      setShowPartialPayment(true);
    } else {
      setShowPartialPayment(false);
    }
  }, [paymentOption]);
  
  const onSubmit = async (data: any) => { // Use any to fix type compatibility issue
    try {
      // Convert payment method to API format
      const paymentMethod = data.paymentMethod as PaymentMethod;
      
      // Get today's date in YYYY-MM-DD format for payment date
      const today = new Date();
      const paymentDate = today.toISOString().split('T')[0];
      
      // Schedule the payment using the API
      const result = await schedulePayment({
        invoiceId,
        pin,
        paymentMethod,
        paymentDate
      }).unwrap();
      
      // Navigate to payment confirmation page
      // Pass both the payment result and the PIN to maintain state when returning
      navigate('/confirmation', { 
        state: { 
          paymentResult: result,
          pin: pin, // Include the PIN so we can navigate back to the invoice
          // Use the hash_code if invoice is available, otherwise use the original invoiceId
          invoiceId: invoice?.hash_code || invoiceId
        } 
      });
    } catch (error) {
      console.error('Failed to process payment:', error);
      // Handle error
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading invoice details...</p>
        </div>
      </div>
    );
  }
  
  if (fetchError || !invoice) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error!</h4>
          <p>Unable to load invoice details. The invoice ID may be invalid.</p>
          <hr />
          <button
            className="btn btn-outline-danger"
            onClick={() => navigate('/')}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // If we get here with no invoice data, it means the API call failed
  // This could be due to network issues or invalid credentials
  if (!isVerified && !isLoading) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Invoice Access Failed</h4>
          <p>Unable to access invoice data. This could be due to an invalid PIN or invoice ID.</p>
          <hr />
          <button
            className="btn btn-outline-danger"
            onClick={() => navigate('/')}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  if (!isVerified) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Verifying...</span>
          </div>
          <p className="mt-2">Verifying PIN...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mt-4">
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Invoice Payment Portal</h4>
        </div>
        
        <div className="card-body">
          {hasExistingPayment && (
            <div className="alert alert-info mb-3">
              <strong>Payment Scheduled:</strong> This invoice has been scheduled for payment on {new Date(invoice.payment_date!).toLocaleDateString()} using {invoice.payment_method}.
            </div>
          )}
          
          <div className="row">
            {/* Invoice Details on the left */}
            <div className="col-md-6">
              <h5 className="text-start">Invoice Details</h5>
              <div className="text-start">
                <p><strong>Customer Number:</strong> {invoice.customer_number}</p>
                <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                <p><strong>Company Number:</strong> {invoice.company_number}</p>
                <p><strong>Due Date:</strong> {new Date(invoice.payment_due_date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {invoice.status}</p>
                {invoice.payment_date && (
                  <p><strong>Payment Date:</strong> {new Date(invoice.payment_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            
            {/* Total Due card on the right */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Payment Summary</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <p className="mb-2"><strong>Invoice Amount:</strong></p>
                    <p className="mb-2">${parseFloat(invoice.invoice_amount).toFixed(2)}</p>
                  </div>
                  {selectedPaymentMethod === 'Credit Card' && (
                    <div className="d-flex justify-content-between">
                      <p className="mb-2"><strong>Credit Card Service Fee:</strong></p>
                      <p className="mb-2 text-danger">+${parseFloat(invoice.cc_service_fee).toFixed(2)}</p>
                    </div>
                  )}
                  <hr />
                  <div className="d-flex justify-content-between">
                    <h5 className="mb-0"><strong>Total Due:</strong></h5>
                    <h5 className="mb-0">
                      ${selectedPaymentMethod === 'Credit Card'
                        ? (parseFloat(invoice.invoice_amount) + parseFloat(invoice.cc_service_fee)).toFixed(2)
                        : parseFloat(invoice.invoice_amount).toFixed(2)}
                    </h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <h5 className="mt-4 text-start">Payment Options</h5>
            <div className="mb-3">
              <div className="form-check text-start">
                <input
                  type="radio"
                  id="payFull"
                  value="full"
                  className="form-check-input"
                  {...register('paymentOption')}
                  // onChange handled by useEffect
                  // Remove checked attribute to fix radio button behavior
                />
                <label className="form-check-label text-start" htmlFor="payFull">
                  Pay the invoice now in full (${parseFloat(invoice.invoice_amount).toFixed(2)})
                </label>
              </div>
              
              <div className="form-check text-start">
                <input
                  type="radio"
                  id="payPartial"
                  value="partial"
                  className="form-check-input"
                  {...register('paymentOption')}
                  // onChange handled by useEffect
                  // Remove checked attribute to fix radio button behavior
                />
                <label className="form-check-label text-start" htmlFor="payPartial">
                  Pay the invoice now in part
                </label>
              </div>
              
              {showPartialPayment && (
                <div className="ms-4 mt-2">
                  <div className="mb-2">
                    <label htmlFor="paymentAmount" className="form-label">Payment Amount</label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${errors.paymentAmount ? 'is-invalid' : ''}`}
                        id="paymentAmount"
                        {...register('paymentAmount')}
                      />
                      {errors.paymentAmount && (
                        <div className="invalid-feedback">{errors.paymentAmount.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="mb-2">
                    <p className="text-muted text-start">
                      Remaining balance after this payment: 
                      ${(parseFloat(invoice.invoice_amount) - (watch('paymentAmount') || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="form-check text-start">
                <input
                  type="radio"
                  id="payDueDate"
                  value="dueDate"
                  className="form-check-input"
                  {...register('paymentOption')}
                />
                <label className="form-check-label text-start" htmlFor="payDueDate">
                  Pay on due date ({new Date(invoice.payment_due_date).toLocaleDateString()})
                </label>
              </div>
            </div>
            
            {paymentOption && (
              <>
                <h5 className="mt-4 text-start">Payment Method</h5>
                <div className="mb-3">
                  <div className="form-check text-start">
                    <input
                      type="radio"
                      id="payCredit"
                      value="Credit Card"
                      className="form-check-input"
                      {...register('paymentMethod')}
                      disabled={!invoice.customer_cc_token}
                    />
                    <label className="form-check-label text-start" htmlFor="payCredit">
                      Pay using my credit card on file
                    </label>
                    {selectedPaymentMethod === 'Credit Card' && (
                      <p className="text-warning ms-4 text-start">A service fee of ${parseFloat(invoice.cc_service_fee).toFixed(2)} will be added to your payment amount.</p>
                    )}
                    {!invoice.customer_cc_token && (
                      <p className="text-muted ms-4 text-start">You don't have a credit card on file.</p>
                    )}
                  </div>
                  
                  <div className="form-check text-start">
                    <input
                      type="radio"
                      id="payACH"
                      value="ACH"
                      className="form-check-input"
                      {...register('paymentMethod')}
                      disabled={!invoice.customer_ach_enabled}
                    />
                    <label className="form-check-label text-start" htmlFor="payACH">
                      Pay using my ACH on file
                    </label>
                    {selectedPaymentMethod === 'ACH' && (
                      <p className="text-muted ms-4 text-start">No additional fees.</p>
                    )}
                    {!invoice.customer_ach_enabled && (
                      <p className="text-muted ms-4 text-start">You don't have ACH set up.</p>
                    )}
                  </div>
                  
                  <div className="form-check text-start">
                    <input
                      type="radio"
                      id="payCheck"
                      value="Check"
                      className="form-check-input"
                      {...register('paymentMethod')}
                    />
                    <label className="form-check-label text-start" htmlFor="payCheck">
                      I prefer to send a check
                    </label>
                    {selectedPaymentMethod === 'Check' && (
                      <p className="text-muted ms-4 text-start">This will be recorded for cash forecasting purposes.</p>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {paymentOption && (
              <>
                <h5 className="mt-4 text-start">Additional Message (Optional)</h5>
                <div className="mb-3">
                  <textarea
                    className={`form-control ${errors.additionalMessage ? 'is-invalid' : ''}`}
                    rows={3}
                    placeholder="Add a message regarding this payment (max 100 characters)"
                    {...register('additionalMessage')}
                    maxLength={100}
                  ></textarea>
                  {errors.additionalMessage && (
                    <div className="invalid-feedback">{errors.additionalMessage.message}</div>
                  )}
                  <div className="form-text text-end">
                    {(watch('additionalMessage')?.length || 0)}/100 characters
                  </div>
                </div>
              </>
            )}
            
            {selectedPaymentMethod && (
              <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : hasExistingPayment ? 'Update Payment Details' : 'Submit Payment'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
