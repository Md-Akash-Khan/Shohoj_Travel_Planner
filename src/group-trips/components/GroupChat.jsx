import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FiSend, FiX, FiMessageSquare, FiImage } from 'react-icons/fi';
import { toast } from 'sonner';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
// Remove Firebase storage imports since we won't be using them
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { db, storage } from '@/service/firebaseConfig';
import { db } from '@/service/firebaseConfig';
// Add this import at the top
import { createNotification } from '@/service/NotificationService';

function GroupChat({ trip }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [indexError, setIndexError] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Get current user from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }

    // Fetch messages when component mounts or isOpen changes
    if (trip?.id && isOpen) {
      console.log("Fetching messages for trip:", trip.id);
      
      // Try to fetch messages without orderBy first if we had an index error
      if (indexError) {
        const simpleQuery = query(
          collection(db, 'tripMessages'),
          where('tripId', '==', trip.id)
        );
        
        getDocs(simpleQuery)
          .then((querySnapshot) => {
            const fetchedMessages = [];
            querySnapshot.forEach((doc) => {
              fetchedMessages.push({
                id: doc.id,
                ...doc.data()
              });
            });
            // Sort manually since we can't use orderBy
            fetchedMessages.sort((a, b) => {
              if (!a.timestamp) return 1;
              if (!b.timestamp) return -1;
              return a.timestamp.seconds - b.timestamp.seconds;
            });
            console.log("Fetched messages (simple query):", fetchedMessages.length);
            setMessages(fetchedMessages);
            scrollToBottom();
          })
          .catch(error => {
            console.error("Error fetching messages (simple query):", error);
            // Removed toast message for error loading messages
          });
      } else {
        // Try with the full query including orderBy
        try {
          const q = query(
            collection(db, 'tripMessages'),
            where('tripId', '==', trip.id),
            orderBy('timestamp', 'asc')
          );

          const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedMessages = [];
            querySnapshot.forEach((doc) => {
              fetchedMessages.push({
                id: doc.id,
                ...doc.data()
              });
            });
            console.log("Fetched messages:", fetchedMessages.length);
            setMessages(fetchedMessages);
            
            // Scroll to bottom after messages update
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }, (error) => {
            console.error("Error fetching messages:", error);
            
            // Check if it's an index error
            if (error.message && error.message.includes("requires an index")) {
              console.log("Index error detected, switching to simple query");
              setIndexError(true);
            }
            
            // Removed toast message for error loading messages
          });

          // Cleanup function
          return () => unsubscribe();
        } catch (error) {
          console.error("Error setting up message listener:", error);
          if (error.message && error.message.includes("requires an index")) {
            setIndexError(true);
          }
          // Removed toast message for error loading messages
        }
      }
    }
  }, [trip, isOpen, indexError]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Convert image to Base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error('Please sign in to send messages');
      return;
    }

    if ((!message.trim() && !selectedImage) || loading) {
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploading(true);
        try {
          // Stricter size limit for Base64 (1MB is recommended)
          if (selectedImage.size > 1 * 1024 * 1024) { // 1MB limit
            toast.error('Image size should be less than 1MB for direct upload');
            setUploading(false);
            setLoading(false);
            return;
          }

          // Convert image to Base64
          imageUrl = await convertToBase64(selectedImage);
          console.log("Image converted to Base64");
          
        } catch (uploadError) {
          console.error("Error converting image:", uploadError);
          toast.error("Failed to process image: " + (uploadError.message || "Unknown error"));
          setLoading(false);
          setUploading(false);
          return; // Exit early if image conversion fails
        } finally {
          setUploading(false);
        }
      }

      // Only proceed with sending message if there's text or image was uploaded successfully
      if (message.trim() || imageUrl) {
        // Make sure we're using the exact same trip ID format
        const tripId = trip.id;
        
        // Create message data
        const messageData = {
          tripId: tripId,
          text: message.trim(),
          imageUrl: imageUrl,
          sender: {
            id: currentUser.id || currentUser.email,
            name: currentUser.name,
            picture: currentUser.picture
          },
          timestamp: serverTimestamp()
        };
        
        // Add message to Firestore
        console.log("Sending message to Firestore:", messageData);
        const docRef = await addDoc(collection(db, 'tripMessages'), messageData);
        console.log("Message sent with ID:", docRef.id);
        
        // Send notifications to other trip members
        if (trip.joinedUsers && trip.joinedUsers.length > 0) {
          const otherMembers = trip.joinedUsers.filter(
            user => user.email !== currentUser.email
          );
          
          const destinationName = trip?.userSelection?.location?.label || 'the trip';
          
          for (const member of otherMembers) {
            try {
              await createNotification(
                member.email,
                trip.id,
                `${currentUser.name} sent a message in ${destinationName}`,
                'message',
                destinationName
              );
            } catch (notifError) {
              console.error('Error sending notification:', notifError);
            }
          }
        }
        
        // Add local message for immediate display
        const localMessage = {
          ...messageData,
          id: docRef.id,
          timestamp: new Date() // Use local date for display
        };
        
        // Add to messages array if we're not getting real-time updates
        if (indexError) {
          setMessages(prev => [...prev, localMessage]);
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
        
        // Clear input fields
        setMessage('');
        setSelectedImage(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message: ' + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 1MB for Base64)
      if (file.size > 1 * 1024 * 1024) {
        toast.error('Image size should be less than 1MB');
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      // Handle both Firestore Timestamp and JavaScript Date objects
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Just now';
    }
  };

  // Add this new function to handle image downloads
  const handleImageDownload = (imageUrl, senderName) => {
    try {
      // Create an anchor element
      const downloadLink = document.createElement('a');
      
      // Set the href to the image URL
      downloadLink.href = imageUrl;
      
      // Set download attribute with a filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadLink.download = `image-from-${senderName}-${timestamp}.png`;
      
      // Append to body, click and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-lg flex items-center justify-center z-40"
      >
        <FiMessageSquare size={24} />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 w-full sm:w-[400px] md:w-[450px] h-[500px] sm:h-[600px] bg-white shadow-lg rounded-t-lg flex flex-col z-50">
          {/* Chat Header */}
          <div className="bg-primary text-white p-3 sm:p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold text-sm sm:text-base truncate">Group Chat - {trip?.userSelection?.location?.label || 'Trip'}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white">
              <FiX size={20} />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-10 text-sm sm:text-base">
                No messages yet. Be the first to say hello!
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender.id === currentUser?.id || msg.sender.email === currentUser?.email ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[80%] ${msg.sender.id === currentUser?.id || msg.sender.email === currentUser?.email ? 'bg-primary text-white' : 'bg-gray-100'} rounded-lg p-2 sm:p-3`}>
                    {msg.sender.id !== currentUser?.id && msg.sender.email !== currentUser?.email && (
                      <div className="flex items-center mb-1">
                        <img 
                          src={msg.sender.picture || '/user-placeholder.png'} 
                          alt={msg.sender.name} 
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-2" 
                        />
                        <span className="text-xs font-medium">{msg.sender.name}</span>
                      </div>
                    )}
                    
                    {msg.text && <p className="mb-1 text-sm sm:text-base">{msg.text}</p>}
                    
                    {msg.imageUrl && (
                      <div className="mt-2">
                        <img 
                          src={msg.imageUrl} 
                          alt="Shared image" 
                          className="rounded-md max-h-40 sm:max-h-60 cursor-pointer" 
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                        <div className="mt-1 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageDownload(msg.imageUrl, msg.sender.name);
                            }}
                            className={`text-xs ${msg.sender.id === currentUser?.id || msg.sender.email === currentUser?.email ? 'text-gray-200' : 'text-gray-500'} underline`}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className={`text-xs ${msg.sender.id === currentUser?.id || msg.sender.email === currentUser?.email ? 'text-gray-200' : 'text-gray-500'} mt-1 text-right`}>
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="px-3 sm:px-4 py-2 border-t">
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="h-16 sm:h-20 rounded-md" 
                />
                <button 
                  onClick={removeSelectedImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <FiX size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => fileInputRef.current.click()}
                disabled={uploading || loading}
                className="shrink-0"
              >
                <FiImage size={18} sm:size={20} />
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </Button>
              
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 resize-none text-sm sm:text-base"
                rows={1}
                disabled={uploading || loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <Button 
                onClick={handleSendMessage} 
                disabled={(!message.trim() && !selectedImage) || loading || uploading}
                size="icon"
                className={`shrink-0 ${loading || uploading ? "opacity-50" : ""}`}
              >
                {loading || uploading ? (
                  <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <FiSend size={18} sm:size={20} />
                )}
              </Button>
            </div>
            {/* Removed status messages for uploading and sending */}
          </div>
        </div>
      )}
    </>
  );
}

export default GroupChat;