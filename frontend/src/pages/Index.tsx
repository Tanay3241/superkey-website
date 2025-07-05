
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AuthTabs } from '@/components/AuthTabs';
import { AnimatedIllustration } from '@/components/AnimatedIllustration';

const Index = () => {
  const { isAuthenticated, isLoading, authError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // If there's an auth error, it will be displayed by the AuthProvider
  if (authError) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="container max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between z-10">
        <div className="w-full lg:w-1/2 mb-10 lg:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Secure Device Control</h1>
          <p className="text-lg text-gray-300 mb-8">Role-based key distribution system for secure device management</p>
          <AuthTabs />
        </div>
        <div className="w-full lg:w-1/2 flex justify-center">
          <AnimatedIllustration />
        </div>
      </div>
    </div>
  );
};

export default Index;
