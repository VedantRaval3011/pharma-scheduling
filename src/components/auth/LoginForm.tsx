'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    companyId: '',
    company: '',
    loginType: 'credentials'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        userId: formData.userId,
        password: formData.password,
        companyId: formData.companyId,
        company: formData.company,
        loginType: formData.loginType,
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    } catch  {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-start" style={{ backgroundColor: '#c0c0c0' }}>
      {/* Main Window */}
      <div className="w-[35rem] h-64 absolute left-56 top-28" style={{ 
        backgroundColor: '#f0f0f0',
        border: '2px outset #c0c0c0',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '11px'
      }}>
        {/* Title Bar */}
        <div className="h-6 flex items-center justify-between px-2" style={{ 
          background: 'linear-gradient(to bottom, #0054e3, #0040a6)',
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          <span>Login Security</span>
          <button className="w-4 h-4 flex items-center justify-center text-white hover:bg-red-600" style={{
            backgroundColor: '#c0504d',
            border: '1px outset #c0c0c0',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            ×
          </button>
        </div>

        {/* Content Area */}
        <div className="flex h-full">
          {/* Left Panel with Lock Image */}
          <div className="w-2/5 flex items-center justify-center" style={{ backgroundColor: '#f5f1e8' }}>
            <Image src="/lock.png" alt="lock" width={150} height={150} />
          </div>

          {/* Right Panel with Form */}
          <div className="w-3/5 p-4" style={{ backgroundColor: '#f5f1e8' }}>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* User ID */}
              <div className="flex items-center">
                <label className="w-20 text-right pr-2" style={{ 
                  color: '#654321', 
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}>
                  User ID:
                </label>
                <input
                  type="text"
                  required
                  className="w-60 h-5 px-1 border text-xs"
                  style={{ 
                    backgroundColor: '#fefefe',
                    border: '1px inset #c0c0c0',
                    fontFamily: 'MS Sans Serif, sans-serif'
                  }}
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                />
              </div>

              {/* Password */}
              <div className="flex items-center">
                <label className="w-20 text-right pr-2" style={{ 
                  color: '#654321', 
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}>
                  Password:
                </label>
                <input
                  type="password"
                  required
                  className="w-60 h-5 px-1 border text-xs"
                  style={{ 
                    backgroundColor: '#fefefe',
                    border: '1px inset #c0c0c0',
                    fontFamily: 'MS Sans Serif, sans-serif'
                  }}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {/* Company Id */}
              <div className="flex items-center">
                <label className="w-20 text-right pr-2" style={{ 
                  color: '#654321', 
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}>
                  Company Id:
                </label>
                <input
                  type="text"
                  required
                  className="w-60 h-5 px-1 border text-xs"
                  style={{ 
                    backgroundColor: '#fefefe',
                    border: '1px inset #c0c0c0',
                    fontFamily: 'MS Sans Serif, sans-serif'
                  }}
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value.toUpperCase() })}
                />
              </div>

              {/* Company */}
              <div className="flex items-center">
                <label className="w-20 text-right pr-2" style={{ 
                  color: '#654321', 
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}>
                  Company:
                </label>
                <input
                  type="text"
                  required
                  className="w-60 h-5 px-1 border text-xs"
                  style={{ 
                    backgroundColor: '#fefefe',
                    border: '1px inset #c0c0c0',
                    fontFamily: 'MS Sans Serif, sans-serif'
                  }}
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-red-600 text-xs mt-2">{error}</div>
              )}

              {/* Buttons */}
              <div className="flex justify-center items-cen space-x-2 mt-6">
                <button
                  type="button"
                  disabled={loading}
                  className="px-4 py-1 text-xs"
                  style={{ 
                    backgroundColor: '#e0e0e0',
                    border: '1px outset #c0c0c0',
                    fontFamily: 'MS Sans Serif, sans-serif',
                    fontWeight: 'normal'
                  }}
                  onClick={handleSubmit}
                >
                  {loading ? 'Signing in...' : 'Login'}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs"
                  style={{ 
                    backgroundColor: '#e0e0e0',
                    border: '1px outset #c0c0c0',
                    fontFamily: 'MS Sans Serif, sans-serif',
                    fontWeight: 'normal'
                  }}
                  onClick={() => {
                    setFormData({
                      userId: '',
                      password: '',
                      companyId: '',
                      company: '',
                      loginType: 'credentials'
                    });
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}