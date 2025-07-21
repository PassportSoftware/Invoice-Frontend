import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useSearchParams } from 'react-router-dom';

const schema = yup.object({
  pin: yup
    .string()
    .required('PIN is required')
    .matches(/^\d{6}$/, 'PIN must be exactly 6 digits')
}).required();

type FormData = yup.InferType<typeof schema>;

const PinVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId') || '';
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    setVerifying(true);
    setError(null);
    
    try {
      // Get the API base URL from environment variables
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/';
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      
      // First, get the invoice to verify it exists with the PIN
      const response = await fetch(`${normalizedBaseUrl}api/invoices/${invoiceId}?pin=${data.pin}`);
      
      if (!response.ok) {
        // Parse the error response
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Invoice not found or PIN is incorrect. Please try again.');
        setVerifying(false);
        return;
      }
      
      // We don't need to use the invoice data here, just check if it exists
      
      // Navigate to the invoice page with the PIN
      // The actual PIN verification will happen in the Invoice component
      navigate(`/invoice?invoiceId=${invoiceId}&pin=${data.pin}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setVerifying(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white text-center">
              <h4 className='mb-0'>Invoice Payment Portal</h4>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-3">
                  <label htmlFor="pin" className="form-label">Enter your 6-digit PIN</label>
                  <input
                    type="password"
                    className={`form-control ${errors.pin ? 'is-invalid' : ''}`}
                    id="pin"
                    {...register('pin')}
                    maxLength={6}
                    autoComplete="off"
                  />
                  {errors.pin && (
                    <div className="invalid-feedback">{errors.pin.message}</div>
                  )}
                  {error && (
                    <div className="alert alert-danger mt-3">{error}</div>
                  )}
                  <div className="form-text">
                    A 6-digit PIN was sent to your email along with the invoice payment link.
                  </div>
                </div>
                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary mx-auto" 
                    disabled={isSubmitting || verifying}
                  >
                    {isSubmitting || verifying ? 'Verifying...' : 'Verify PIN'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinVerification;
