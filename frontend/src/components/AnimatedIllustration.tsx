
import { useEffect, useState } from 'react';

export const AnimatedIllustration = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`hidden lg:flex items-center justify-center transition-all duration-1000 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="relative w-96 h-96">
        {/* Animated background circles */}
        <div className="absolute inset-0 animate-spin" style={{ animation: 'spin 20s linear infinite' }}>
          <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
        </div>
        
        {/* Main illustration - Simple clean design */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-80 rounded-2xl overflow-hidden shadow-2xl">
            {/* Simple geometric illustration */}
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center">
                {/* Simple device icon */}
                <div className="w-32 h-32 mx-auto mb-6 bg-blue-500/20 rounded-2xl border border-blue-400/30 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Secure Device Control</h3>
                <p className="text-lg opacity-70 text-gray-300">Access Management System</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating elements around the main content */}
        <div 
          className="absolute top-0 left-0 transform -translate-x-8 -translate-y-8"
          style={{ 
            animation: 'float 3s ease-in-out infinite',
            animationDelay: '0s'
          }}
        >
          <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        <div 
          className="absolute top-0 right-0 transform translate-x-8 -translate-y-4"
          style={{ 
            animation: 'float 3s ease-in-out infinite',
            animationDelay: '0.5s'
          }}
        >
          <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        <div 
          className="absolute bottom-0 left-0 transform -translate-x-4 translate-y-8"
          style={{ 
            animation: 'float 3s ease-in-out infinite',
            animationDelay: '1s'
          }}
        >
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </div>
        </div>
        
        <div 
          className="absolute bottom-0 right-0 transform translate-x-6 translate-y-4"
          style={{ 
            animation: 'float 3s ease-in-out infinite',
            animationDelay: '1.5s'
          }}
        >
          <div className="w-7 h-7 bg-gradient-to-r from-indigo-400 to-cyan-500 rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
