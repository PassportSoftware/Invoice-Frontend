import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PaymentResponse } from '../mocks/invoiceData';

const PaymentConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentResult = location.state?.paymentResult as PaymentResponse;
  
  if (!paymentResult) {
    // Redirect to home if no payment result is available
    navigate('/', { replace: true });
    return null;
  }
  
  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Invoice Payment Portal</h4>
        </div>
        
        <div className="card-body">
          <h5 className="mb-4">Payment Summary</h5>
          
          <div className="row mb-3">
            <div className="col-md-6">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td><strong>Invoice Number:</strong></td>
                    <td>{paymentResult.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td><strong>Customer:</strong></td>
                    <td>{paymentResult.customer}</td>
                  </tr>
                  <tr>
                    <td><strong>Payment Option:</strong></td>
                    <td>{paymentResult.paymentOption}</td>
                  </tr>
                  <tr>
                    <td><strong>Payment Method:</strong></td>
                    <td>{paymentResult.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td><strong>Payment Amount:</strong></td>
                    <td>${paymentResult.paymentAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td><strong>Processing Fee (2.9%):</strong></td>
                    <td>${paymentResult.processingFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td><strong>Total Amount:</strong></td>
                    <td>${paymentResult.totalAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td><strong>Transaction Date:</strong></td>
                    <td>{paymentResult.transactionDate}</td>
                  </tr>
                  <tr>
                    <td><strong>Transaction ID:</strong></td>
                    <td>{paymentResult.transactionId}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {paymentResult.success && (
            <div className="alert alert-success" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              Your payment has been processed successfully!
            </div>
          )}
          
          <div className="d-flex justify-content-between mt-4">
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                // Use the hash_code from state if available, otherwise fall back to the invoice ID
                const invoiceId = location.state?.invoiceId || '';
                // We need to preserve the PIN from the state
                const pin = location.state?.pin;
                
                if (invoiceId && pin) {
                  navigate(`/invoice?invoiceId=${invoiceId}&pin=${pin}`);
                } else {
                  // Fallback to the home page if we don't have the necessary data
                  navigate('/');
                }
              }}
            >
              Back to Invoice
            </button>
            
            <button className="btn btn-primary">
              Download Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
