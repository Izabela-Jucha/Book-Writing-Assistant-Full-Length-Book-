
import React, { useState } from 'react';
import type { BookOutline } from '../types';

interface OutlineViewProps {
  outline: BookOutline;
  onApprove: () => void;
  onRevise: (feedback: string) => void;
  onApproveAndAutoWrite: () => void;
  isLoading: boolean;
}

const OutlineView: React.FC<OutlineViewProps> = ({ outline, onApprove, onRevise, onApproveAndAutoWrite, isLoading }) => {
  const [feedback, setFeedback] = useState('');

  const handleRevise = () => {
    if (feedback.trim()) {
      onRevise(feedback);
      setFeedback('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">Your Book Outline</h2>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Suggested Titles</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            {outline.titleOptions.map((title, index) => <li key={index}>{title}</li>)}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Back Cover Summary</h3>
          <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-md italic">{outline.summary}</p>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-3">Chapter Plan</h3>
          <div className="space-y-4">
            {outline.chapters.map((chapter, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">Chapter {index + 1}: {chapter.title}</h4>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{chapter.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-3 text-center">Want Changes?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
            If the outline isn't quite right, provide some feedback below and the AI will revise it for you.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g., 'Can you make the title more mysterious?' or 'Change Chapter 3 to focus on the protagonist's childhood.'"
            className="w-full h-28 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition duration-150"
            disabled={isLoading}
          />
           <div className="mt-4 flex justify-center">
            <button 
              onClick={handleRevise} 
              disabled={isLoading || !feedback.trim()} 
              className="bg-yellow-500 text-white font-bold py-3 px-8 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-yellow-300 disabled:cursor-not-allowed transition duration-150 ease-in-out w-full sm:w-auto"
            >
              {isLoading ? 'Revising...' : 'Revise Outline'}
            </button>
           </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-3">Ready to Write?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Choose how you want to proceed.</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
             <button 
                onClick={onApprove} 
                disabled={isLoading} 
                className="bg-green-600 text-white font-bold py-3 px-8 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition duration-150 ease-in-out w-full sm:w-auto"
              >
                Manual Mode (Page-by-Page)
              </button>
              <button 
                onClick={onApproveAndAutoWrite} 
                disabled={isLoading} 
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition duration-150 ease-in-out w-full sm:w-auto"
              >
                Auto-Write Full Book
              </button>
          </div>
      </div>
    </div>
  );
};

export default OutlineView;
