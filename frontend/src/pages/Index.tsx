
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AuthTabs } from '@/components/AuthTabs';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '@/components/AuthLayout';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-white"
        >
          <Loader2 className="h-8 w-8 animate-spin" />
        </motion.div>
      </div>
    );
  }

  return (
    <AuthLayout>
      <AuthTabs />
    </AuthLayout>
  );
};

export default Index;
