import React from 'react';
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
  const invoiceId = searchParams.get('invoiceId');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: yupResolver(schema)
  });

  const onSubmit = (data: FormData) => {
    // In a real app, we would validate the PIN against the API
    // For demo purposes, we'll just navigate to the invoice page
    navigate(`/invoice?invoiceId=${invoiceId}&pin=${data.pin}`);
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
                  <div className="form-text">
                    A 6-digit PIN was sent to your email along with the invoice payment link.
                  </div>
                </div>
                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary mx-auto" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify PIN'}
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
