import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { AuthResponse } from '../types';

const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: 'google' | 'naver' }>();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      if (!provider) {
        setError('잘못된 요청입니다.');
        return;
      }

      // OAuth 콜백에서 전달된 파라미터 가져오기
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const token = searchParams.get('token');
      const userParam = searchParams.get('user');

      console.log('OAuth Callback - Provider:', provider);
      console.log('OAuth Callback - Code:', code);
      console.log('OAuth Callback - State:', state);
      console.log('OAuth Callback - Error:', errorParam);
      console.log('OAuth Callback - Token:', token);
      console.log('OAuth Callback - User:', userParam);

      // 백엔드가 이미 처리를 완료하고 token과 user를 쿼리 파라미터로 전달한 경우
      if (token && userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          login(token, user);
          navigate('/');
          return;
        } catch (err) {
          console.error('Failed to parse user data:', err);
          setError('사용자 정보 파싱에 실패했습니다.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
      }

      if (errorParam) {
        setError(`로그인이 취소되었거나 오류가 발생했습니다: ${errorParam}`);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('인증 코드를 받지 못했습니다.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // 백엔드에 코드를 전송하여 토큰과 사용자 정보를 받아옴
        console.log('Calling handleOAuthCallback with provider:', provider, 'code:', code);
        const data: AuthResponse = await authAPI.handleOAuthCallback(
          provider,
          code,
          state || provider // state가 없으면 provider 사용
        );

        console.log('OAuth Response:', data);

        if (data.token && data.user) {
          // 로그인 처리
          login(data.token, data.user);
          // 메인 페이지로 이동
          navigate('/');
        } else {
          setError('로그인 정보를 받지 못했습니다.');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        console.error('Error response:', err.response);
        const errorMessage = err.response?.data?.message || err.message || '로그인에 실패했습니다.';
        setError(`${errorMessage} (상태: ${err.response?.status || 'unknown'})`);
        setTimeout(() => navigate('/login'), 5000);
      }
    };

    handleCallback();
  }, [provider, searchParams, login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인 실패</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">로그인 페이지로 이동합니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">로그인 중...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
