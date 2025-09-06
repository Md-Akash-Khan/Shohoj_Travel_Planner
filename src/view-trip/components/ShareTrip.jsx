import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FiShare2, FiCopy, FiMail, FiTwitter, FiFacebook } from 'react-icons/fi';
import { toast } from 'sonner';

function ShareTrip({ trip }) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  
  const shareUrl = window.location.href;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };
  
  const shareByEmail = () => {
    const subject = `Check out my trip to ${trip?.userSelection?.location?.label || 'this amazing place'}!`;
    const body = `I've planned a trip with ShohojTravel Planner and wanted to share it with you!\n\nCheck it out here: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const shareOnTwitter = () => {
    const text = `Check out my ${trip?.userSelection?.noOfDays}-day trip to ${trip?.userSelection?.location?.label} that I planned with ShohojTravel Planner!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  
  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  
  return (
    <div className="my-4 sm:my-6">
      <Button 
        onClick={() => setShowShareOptions(!showShareOptions)}
        className="flex items-center gap-2 text-sm"
      >
        <FiShare2 /> Share This Trip
      </Button>
      
      {showShareOptions && (
        <div className="mt-4 p-3 sm:p-4 bg-white rounded-lg shadow-md">
          <h3 className="font-medium mb-3 text-sm sm:text-base">Share your trip to {trip?.userSelection?.location?.label}</h3>
          
          <div className="flex items-center gap-2 mb-4">
            <Input value={shareUrl} readOnly className="flex-grow text-xs sm:text-sm" />
            <Button variant="outline" onClick={copyToClipboard} title="Copy link" className="shrink-0">
              <FiCopy />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={shareByEmail} className="flex items-center gap-1 text-xs sm:text-sm">
              <FiMail /> Email
            </Button>
            <Button variant="outline" onClick={shareOnTwitter} className="flex items-center gap-1 text-xs sm:text-sm">
              <FiTwitter /> Twitter
            </Button>
            <Button variant="outline" onClick={shareOnFacebook} className="flex items-center gap-1 text-xs sm:text-sm">
              <FiFacebook /> Facebook
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareTrip;