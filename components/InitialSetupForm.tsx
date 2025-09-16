import React, { useState, useEffect } from 'react';
import type { BookDetails } from '../types';

interface InitialSetupFormProps {
  onSubmit: (details: BookDetails) => void;
  isLoading: boolean;
  hasDraft: boolean;
  onLoadDraft: () => void;
}

const InitialSetupForm: React.FC<InitialSetupFormProps> = ({ onSubmit, isLoading, hasDraft, onLoadDraft }) => {
  const [showForm, setShowForm] = useState(!hasDraft);
  const [details, setDetails] = useState<BookDetails>({
    theme: '',
    genre: 'non-fiction',
    audience: '',
    writingStyle: 'hybrid',
    paragraphLength: 'standard',
    chapters: '',
    penName: '',
    numChapters: 8,
    numPagesPerChapter: 8,
    language: 'english'
  });

  useEffect(() => {
    setShowForm(!hasDraft);
  }, [hasDraft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: name === 'numChapters' || name === 'numPagesPerChapter' ? parseInt(value, 10) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(details);
  };

  const inputClasses = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  if (!showForm && hasDraft) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Welcome Back!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">You have a saved draft. Would you like to continue where you left off?</p>
        <div className="space-y-4">
          <button onClick={onLoadDraft} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
            Resume My Last Session
          </button>
          <button onClick={() => setShowForm(true)} className="w-full bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 font-bold py-3 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition duration-150 ease-in-out">
            Start a New Book
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Let's Start Your Book</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="theme" className={labelClasses}>What is your book’s main theme or topic?</label>
          <textarea id="theme" name="theme" value={details.theme} onChange={handleChange} required className={inputClasses} rows={3} placeholder="e.g., The future of artificial intelligence in daily life"></textarea>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="genre" className={labelClasses}>Is it fiction or non-fiction?</label>
                <select id="genre" name="genre" value={details.genre} onChange={handleChange} className={inputClasses}>
                    <option value="non-fiction">Non-Fiction</option>
                    <option value="fiction">Fiction</option>
                </select>
            </div>
             <div>
                <label htmlFor="audience" className={labelClasses}>Who is your target audience?</label>
                <input type="text" id="audience" name="audience" value={details.audience} onChange={handleChange} required className={inputClasses} placeholder="e.g., Young professionals, tech enthusiasts"/>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="writingStyle" className={labelClasses}>Writing Style</label>
              <select id="writingStyle" name="writingStyle" value={details.writingStyle} onChange={handleChange} className={inputClasses}>
                <option value="hybrid">Hybrid: Conversational + Practical (Bestseller)</option>
                <option value="conversational">Conversational (Like talking to a friend)</option>
                <option value="storytelling">Storytelling / Narrative (Like a novel)</option>
                <option value="practical">Practical / Instructional (Toolkits & steps)</option>
                <option value="raw">Brutally Honest / Raw (Authentic, no-fluff)</option>
                <option value="research">Research-Based / Authority (Expert tone)</option>
                <option value="inspirational">Inspirational / Motivational</option>
              </select>
            </div>
            <div>
              <label htmlFor="paragraphLength" className={labelClasses}>Paragraph Length</label>
              <select id="paragraphLength" name="paragraphLength" value={details.paragraphLength} onChange={handleChange} className={inputClasses}>
                <option value="standard">Standard (3-5 sentences)</option>
                <option value="short">Short & Punchy (1-3 sentences)</option>
                <option value="long">Detailed & Long (5+ sentences)</option>
              </select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label htmlFor="language" className={labelClasses}>Writing Language</label>
                <select id="language" name="language" value={details.language} onChange={handleChange} className={inputClasses}>
                    <option value="english">English</option>
                    <option value="polish">Polish</option>
                </select>
            </div>
            <div>
                <label htmlFor="penName" className={labelClasses}>What is your pen name?</label>
                <input type="text" id="penName" name="penName" value={details.penName} onChange={handleChange} required className={inputClasses} placeholder="e.g., Alex Ray"/>
            </div>
        </div>

        <div>
          <label htmlFor="chapters" className={labelClasses}>Any specific chapter titles or topics? (Optional)</label>
          <textarea id="chapters" name="chapters" value={details.chapters} onChange={handleChange} className={inputClasses} rows={3} placeholder="e.g., Chapter 1: The Spark, Chapter 2: The Rise of Machines..."></textarea>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="numChapters" className={labelClasses}>Number of Chapters</label>
                <input type="number" id="numChapters" name="numChapters" value={details.numChapters} onChange={handleChange} required min="1" max="20" className={inputClasses} />
            </div>
            <div>
                <label htmlFor="numPagesPerChapter" className={labelClasses}>Pages per Chapter</label>
                <input type="number" id="numPagesPerChapter" name="numPagesPerChapter" value={details.numPagesPerChapter} onChange={handleChange} required min="1" max="15" className={inputClasses} />
            </div>
        </div>

        <div>
          <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition duration-150 ease-in-out">
            {isLoading ? 'Generating...' : 'Generate Book Outline'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InitialSetupForm;