import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function AuthGuard({ children }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('user');
      if (!user) {
        toast.error('Please sign in to access this page');
        navigate('/', { replace: true });
      }
    };
    
    // Check on component mount
    checkAuth();
    
    // Set up event listener for storage changes (logout in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'user' && !e.newValue) {
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);
  
  // If we have a user, render children
  const user = localStorage.getItem('user');
  if (!user) {
    return null; // Return nothing while redirecting
  }
  
  return <>{children}</>;
}

export default AuthGuard;