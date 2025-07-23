import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const AuthTabs = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast.error('Please enter both email and password', {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: 'white',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }
      });
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login. Please check your credentials.';
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: 'white',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 rounded-2xl bg-white/10 backdrop-blur-lg p-8 shadow-2xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1
            }}
            className="flex justify-center items-center gap-2 mb-6"
          >
            <div className="relative w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/40 to-pink-500/40 rounded-xl blur-sm"></div>
              <span className="relative text-2xl font-bold text-white">S</span>
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
              Superkey
            </h1>
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back
          </h2>
          <p className="text-gray-200">
            Sign in to your account to continue
          </p>
        </motion.div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-4"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-300" />
              <Input
                type="email"
                name="email"
                placeholder="Email address"
                required
                className="pl-10 h-12 bg-white/5 border-gray-200/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-300" />
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                required
                className="pl-10 pr-10 h-12 bg-white/5 border-gray-200/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-100 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
          </motion.div>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-4 text-center text-sm text-gray-300"
        >
          Don't have an account?{' '}
          <a href="#" className="font-medium text-purple-300 hover:text-purple-200 transition-colors">
            Contact administrator
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};
