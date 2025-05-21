import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useGetInvoiceQuery, useProcessPaymentMutation } from '../store/api';

type PaymentOption = 'full' | 'partial' | 'dueDate';
type PaymentMethod = 'creditCard' | 'ach' | 'check';

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
  paymentMethod: yup.string().required('Payment method is required').oneOf(['creditCard', 'ach', 'check']),
  additionalMessage: yup.string().max(100, 'Message cannot exceed 100 characters'),
});

// Credit card processing fee percentage
const CREDIT_CARD_FEE_PERCENTAGE = 2.9;

const Invoice: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId') || '';
  const pin = searchParams.get('pin') || '';
  
  const { data: invoice, isLoading, error } = useGetInvoiceQuery({ invoiceId, pin });
  const [processPayment, { isLoading: isProcessing }] = useProcessPaymentMutation();
  
  const [showPartialPayment, setShowPartialPayment] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: yupResolver(schema) as any, // Type assertion to fix resolver type issue
    // Remove default values to have them unselected by default
  });
  
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
      const result = await processPayment({
        invoiceId,
        ...data
      }).unwrap();
      
      // Navigate to payment confirmation page
      navigate('/confirmation', { state: { paymentResult: result } });
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
  
  if (error || !invoice) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error!</h4>
          <p>Unable to load invoice details. Please check your PIN and try again.</p>
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
  
  return (
    <div className="container mt-4">
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Invoice Payment Portal</h4>
        </div>
        
        <div className="card-body">
          <h5 className="text-start">Invoice Details</h5>
          <div className="row mb-3">
            <div className="col-md-6 text-start">
              <p className="mb-1"><strong>Customer:</strong> {invoice.customer}</p>
              <p className="mb-1"><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
              <p className="mb-1"><strong>Issue Date:</strong> {invoice.issueDate}</p>
              <p className="mb-1"><strong>Due Date:</strong> {invoice.dueDate}</p>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <p className="mb-2"><strong>Original Amount:</strong></p>
                    <p className="mb-2">${invoice.originalAmount.toFixed(2)}</p>
                  </div>
                  <div className="d-flex justify-content-between">
                    <p className="mb-2"><strong>Credit Memo ({invoice.creditMemo.id}):</strong></p>
                    <p className="mb-2 text-success">-${invoice.creditMemo.amount.toFixed(2)}</p>
                  </div>
                  {selectedPaymentMethod === 'creditCard' && (
                    <div className="d-flex justify-content-between">
                      <p className="mb-2"><strong>Processing Fee ({CREDIT_CARD_FEE_PERCENTAGE}%):</strong></p>
                      <p className="mb-2 text-danger">+${(invoice.outstandingBalance * CREDIT_CARD_FEE_PERCENTAGE / 100).toFixed(2)}</p>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between">
                    <p className="mb-0"><strong>Total Due:</strong></p>
                    <p className="mb-0 fw-bold">${selectedPaymentMethod === 'creditCard' 
                      ? (invoice.outstandingBalance + (invoice.outstandingBalance * CREDIT_CARD_FEE_PERCENTAGE / 100)).toFixed(2)
                      : invoice.outstandingBalance.toFixed(2)}</p>
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
                  Pay the invoice now in full (${invoice.outstandingBalance.toFixed(2)})
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
                      ${(invoice.outstandingBalance - (watch('paymentAmount') || 0)).toFixed(2)}
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
                  // onChange handled by useEffect
                  // Remove checked attribute to fix radio button behavior
                />
                <label className="form-check-label text-start" htmlFor="payDueDate">
                  Pay the invoice in full on its due date ({invoice.dueDate})
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
                      value="creditCard"
                      className="form-check-input"
                      {...register('paymentMethod')}
                      // Remove checked attribute to fix radio button behavior
                    />
                    <label className="form-check-label text-start" htmlFor="payCredit">
                      Pay using my credit card on file
                    </label>
                    {selectedPaymentMethod === 'creditCard' && (
                      <p className="text-warning ms-4 text-start">A {CREDIT_CARD_FEE_PERCENTAGE}% surcharge will be added to your payment amount.</p>
                    )}
                  </div>
                  
                  <div className="form-check text-start">
                    <input
                      type="radio"
                      id="payACH"
                      value="ach"
                      className="form-check-input"
                      {...register('paymentMethod')}
                      // Remove checked attribute to fix radio button behavior
                    />
                    <label className="form-check-label text-start" htmlFor="payACH">
                      Pay using my ACH on file
                    </label>
                    {selectedPaymentMethod === 'ach' && (
                      <p className="text-muted ms-4 text-start">No additional fees.</p>
                    )}
                  </div>
                  
                  <div className="form-check text-start">
                    <input
                      type="radio"
                      id="payCheck"
                      value="check"
                      className="form-check-input"
                      {...register('paymentMethod')}
                      // Remove checked attribute to fix radio button behavior
                    />
                    <label className="form-check-label text-start" htmlFor="payCheck">
                      I prefer to send a check
                    </label>
                    {selectedPaymentMethod === 'check' && (
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
                  {isProcessing ? 'Processing...' : 'Submit Payment'}
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
