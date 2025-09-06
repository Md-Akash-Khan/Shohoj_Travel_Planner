import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../service/firebaseConfig';
import { getUnreadNotifications, getAllNotifications } from '../service/NotificationService';

// Create context
export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current user from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      // If no user, we shouldn't be loading
      setLoading(false);
    }
  }, []);

  // Set up real-time listener for notifications
  useEffect(() => {
    if (!currentUser?.email) {
      // If no user email, we shouldn't be loading
      setLoading(false);
      return;
    }

    console.log('Setting up notification listener for:', currentUser.email);
    setLoading(true);
    setError(null);
    
    try {
      // Create a query for this user's notifications
      const q = query(
        collection(db, 'notifications'),
        where('recipientEmail', '==', currentUser.email),
        orderBy('timestamp', 'desc')
      );
      
      // Set up the real-time listener
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notificationsList = [];
        let unreadCounter = 0;
        
        querySnapshot.forEach((doc) => {
          const notificationData = {
            id: doc.id,
            ...doc.data()
          };
          
          notificationsList.push(notificationData);
          
          // Count unread notifications
          if (!notificationData.read) {
            unreadCounter++;
          }
        });
        
        console.log('Notifications updated:', notificationsList.length, 'Unread:', unreadCounter);
        setNotifications(notificationsList);
        setUnreadCount(unreadCounter);
        setLoading(false);
      }, (error) => {
        console.error("Error listening to notifications:", error);
        setError(error.message);
        setLoading(false);
        
        // Fallback to non-realtime if listener fails
        fetchNotificationsManually(currentUser.email);
      });
      
      // Cleanup listener on unmount
      return () => {
        console.log('Cleaning up notification listener');
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up notification listener:", error);
      setError(error.message);
      setLoading(false);
      
      // Fallback to non-realtime if listener setup fails
      fetchNotificationsManually(currentUser.email);
    }
  }, [currentUser]);
  
  // Fallback function for manual fetching
  const fetchNotificationsManually = async (email) => {
    if (!email) {
      setLoading(false);
      return;
    }
    
    console.log('Manually fetching notifications for:', email);
    setLoading(true);
    setError(null);
    
    try {
      // Get all notifications
      const allResult = await getAllNotifications(email);
      if (allResult.success) {
        setNotifications(allResult.notifications);
        
        // Count unread notifications
        const unreadCount = allResult.notifications.filter(n => !n.read).length;
        setUnreadCount(unreadCount);
      } else {
        throw new Error(allResult.error || 'Failed to fetch notifications');
      }
      
      console.log('Manually fetched notifications:', 
        allResult.success ? allResult.notifications.length : 0, 
        'Unread:', allResult.success ? allResult.notifications.filter(n => !n.read).length : 0);
    } catch (error) {
      console.error('Error fetching notifications manually:', error);
      setError(error.message);
      // Set empty arrays to prevent UI from being stuck in loading state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh notifications
  const refreshNotifications = () => {
    if (currentUser?.email) {
      console.log('Manually refreshing notifications');
      fetchNotificationsManually(currentUser.email);
    }
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        loading,
        error,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook for using the notification context
export const useNotifications = () => useContext(NotificationContext);