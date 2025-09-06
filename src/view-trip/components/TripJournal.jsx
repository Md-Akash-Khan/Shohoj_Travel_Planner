import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FiEdit2, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';

function TripJournal({ trip }) {
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (trip?.notes) {
      setNotes(trip.notes);
    }
  }, [trip]);
  
  const handleSaveNotes = async () => {
    if (!trip?.id) return;
    
    setIsSaving(true);
    try {
      const tripRef = doc(db, 'AITrips', trip.id);
      await updateDoc(tripRef, {
        notes: notes
      });
      
      toast.success('Trip notes saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleClearNotes = () => {
    if (confirm('Are you sure you want to clear your notes?')) {
      setNotes('');
      if (!isEditing) {
        setIsEditing(true);
      }
    }
  };
  
  return (
    <div className="my-6 sm:my-8 p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">Trip Journal & Notes</h2>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs sm:text-sm"
            >
              <FiEdit2 size={16} /> Edit
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleClearNotes}
                className="flex items-center gap-1 text-red-500 text-xs sm:text-sm"
              >
                <FiTrash2 size={16} /> Clear
              </Button>
              <Button 
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs sm:text-sm"
              >
                <FiSave size={16} /> {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {isEditing ? (
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your trip notes, memories, or things to remember here..."
          className="min-h-[150px] sm:min-h-[200px]"
        />
      ) : (
        <div className="bg-gray-50 p-3 sm:p-4 rounded-md min-h-[150px] sm:min-h-[200px] whitespace-pre-wrap text-sm sm:text-base">
          {notes ? notes : (
            <p className="text-gray-400 italic">No notes yet. Click Edit to add some!</p>
          )}
        </div>
      )}
      
      <p className="text-xs sm:text-sm text-gray-500 mt-4">
        Your journal entries are saved with your trip and can be accessed anytime.
      </p>
    </div>
  );
}

export default TripJournal;