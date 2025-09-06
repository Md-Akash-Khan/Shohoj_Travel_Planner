import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Create a new notification
export const createNotification = async (recipientEmail, tripId, message, type, destination) => {
  try {
    // Validate inputs
    if (!recipientEmail || !message) {
      console.error('Missing required fields for notification');
      return { success: false, error: 'Missing required fields' };
    }

    const notificationData = {
      recipientEmail,
      tripId,
      message,
      type: type || 'general',
      destination: destination || '',
      read: false,
      timestamp: serverTimestamp()
    };

    console.log('Creating notification:', notificationData);
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    console.log('Notification created with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

// Get all notifications for a user
export const getAllNotifications = async (userEmail) => {
  try {
    if (!userEmail) {
      return { success: false, error: 'User email is required' };
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientEmail', '==', userEmail),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const notifications = [];
    
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, notifications };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return { success: false, error: error.message, notifications: [] };
  }
};

// Get unread notifications for a user
export const getUnreadNotifications = async (userEmail) => {
  try {
    if (!userEmail) {
      return { success: false, error: 'User email is required' };
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientEmail', '==', userEmail),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const notifications = [];
    
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, notifications };
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return { success: false, error: error.message, notifications: [] };
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' };
    }

    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userEmail) => {
  try {
    if (!userEmail) {
      return { success: false, error: 'User email is required' };
    }

    // Get all unread notifications
    const unreadResult = await getUnreadNotifications(userEmail);
    if (!unreadResult.success) {
      throw new Error(unreadResult.error);
    }

    // Update each notification
    const updatePromises = unreadResult.notifications.map(notification => 
      markNotificationAsRead(notification.id)
    );
    
    await Promise.all(updatePromises);
    
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};