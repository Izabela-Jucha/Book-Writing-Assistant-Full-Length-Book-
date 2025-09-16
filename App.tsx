import React, { useState, useCallback, useEffect } from 'react';
import { AppState } from './types';
import type { BookDetails, BookOutline, BookMatter } from './types';
import { generateOutline, writePage, revisePage, reviseOutline, generateFrontMatter, generateBackMatter, reviseFullBook } from './services/geminiService';

import Header from './components/Header';
import InitialSetupForm from './components/InitialSetupForm';
import OutlineView from './components/OutlineView';
import LoadingSpinner from './components/LoadingSpinner';
import WritingView from './components/WritingView';
import FinalBookView from './components/FinalBookView';

const DRAFT_KEY = 'bookWriterAssistantDraft';

interface SavedState {
    appState: AppState;
    bookDetails: BookDetails;
    bookOutline: BookOutline;
    bookContent: string[][];
    bookMatter: BookMatter;
    currentPageContent: string;
    currentChapterIndex: number;
    currentPageIndex: number;
    viewedChapterIndex: number;
    viewedPageIndex: number;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [bookOutline, setBookOutline] = useState<BookOutline | null>(null);
  const [bookContent, setBookContent] = useState<string[][]>([]);
  const [bookMatter, setBookMatter] = useState<BookMatter | null>(null);
  const [currentPageContent, setCurrentPageContent] = useState<string>('');
  
  // Tracks the latest written page
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  
  // Tracks the currently viewed page
  const [viewedChapterIndex, setViewedChapterIndex] = useState<number>(0);
  const [viewedPageIndex, setViewedPageIndex] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            setHasDraft(true);
        }
    } catch (e) {
        console.error("Could not read from local storage", e);
    }
  }, []);

  const handleError = (message: string) => {
    setError(message);
    setIsLoading(false);
  };

  const handleSaveDraft = useCallback(() => {
    if (!bookDetails || !bookOutline) return;
    try {
        const stateToSave: SavedState = {
            appState,
            bookDetails,
            bookOutline,
            bookContent,
            bookMatter,
            currentPageContent,
            currentChapterIndex,
            currentPageIndex,
            viewedChapterIndex,
            viewedPageIndex,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(stateToSave));
    } catch (e) {
        console.error("Failed to save draft to local storage", e);
        handleError("Could not save your progress. Your browser's storage might be full.");
    }
  }, [appState, bookDetails, bookOutline, bookContent, bookMatter, currentPageContent, currentChapterIndex, currentPageIndex, viewedChapterIndex, viewedPageIndex]);
  
  const handleLoadDraft = () => {
    try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            const loadedState: SavedState = JSON.parse(savedDraft);
            setAppState(loadedState.appState);
            setBookDetails(loadedState.bookDetails);
            setBookOutline(loadedState.bookOutline);
            setBookContent(loadedState.bookContent);
            setBookMatter(loadedState.bookMatter);
            setCurrentPageContent(loadedState.currentPageContent);
            setCurrentChapterIndex(loadedState.currentChapterIndex);
            setCurrentPageIndex(loadedState.currentPageIndex);
            setViewedChapterIndex(loadedState.viewedChapterIndex ?? loadedState.currentChapterIndex);
            setViewedPageIndex(loadedState.viewedPageIndex ?? loadedState.currentPageIndex);
            setHasDraft(false); // Draft is loaded, no need to show the prompt again
        }
    } catch (e) {
        console.error("Failed to load draft", e);
        handleError("The saved draft appears to be corrupted and could not be loaded.");
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
    }
  };

  const handleStartOutlineGeneration = useCallback(async (details: BookDetails) => {
    setIsLoading(true);
    setLoadingMessage('Generating your book outline...');
    setError(null);
    localStorage.removeItem(DRAFT_KEY); // Starting fresh
    setHasDraft(false);
    try {
      const outline = await generateOutline(details);
      setBookDetails(details);
      setBookOutline(outline);
      setAppState(AppState.OUTLINE);
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReviseOutline = useCallback(async (feedback: string) => {
    if (!bookDetails || !bookOutline) return;
    setIsLoading(true);
    setLoadingMessage('Revising outline based on your feedback...');
    setError(null);
    try {
        const revisedOutlineData = await reviseOutline(bookDetails, bookOutline, feedback);
        setBookOutline(revisedOutlineData);
    } catch (err) {
        handleError(err instanceof Error ? err.message : 'An unknown error occurred during revision.');
    } finally {
        setIsLoading(false);
    }
  }, [bookDetails, bookOutline]);

  const handleStartWriting = useCallback(async () => {
    if (!bookDetails || !bookOutline) return;
    setIsLoading(true);
    setLoadingMessage('Crafting Chapter 1, Page 1...');
    setError(null);
    try {
      const content = await writePage(bookDetails, bookOutline, 0, 0, null, bookDetails.numPagesPerChapter);
      setCurrentPageContent(content);
      setCurrentChapterIndex(0);
      setCurrentPageIndex(0);
      setViewedChapterIndex(0);
      setViewedPageIndex(0);
      setBookContent(Array(bookDetails.numChapters).fill(null).map(() => []));
      setAppState(AppState.WRITING);
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [bookDetails, bookOutline]);

  const handleStartAutomaticWriting = useCallback(async () => {
    if (!bookDetails || !bookOutline) return;
    setIsLoading(true);
    setError(null);

    try {
        setLoadingMessage('Generating professional front matter...');
        const frontMatterData = await generateFrontMatter(bookDetails, bookOutline);

        const allContent: string[][] = Array(bookDetails.numChapters).fill(null).map(() => []);
        let previousPage = null;

        for (let chapIdx = 0; chapIdx < bookDetails.numChapters; chapIdx++) {
            for (let pageIdx = 0; pageIdx < bookDetails.numPagesPerChapter; pageIdx++) {
                setLoadingMessage(`Writing Chapter ${chapIdx + 1}/${bookDetails.numChapters}, Page ${pageIdx + 1}...`);
                const pageContent = await writePage(bookDetails, bookOutline, chapIdx, pageIdx, previousPage, bookDetails.numPagesPerChapter);
                allContent[chapIdx][pageIdx] = pageContent;
                previousPage = pageContent;
            }
        }
        
        setBookContent(allContent);
        setLoadingMessage('Generating professional back matter...');
        const backMatterData = await generateBackMatter(bookDetails, bookOutline, allContent);

        setBookMatter({ ...frontMatterData, ...backMatterData } as BookMatter);
        setAppState(AppState.FINAL);
        handleSaveDraft();

    } catch (err) {
        handleError(err instanceof Error ? err.message : 'An error occurred during automatic writing.');
    } finally {
        setIsLoading(false);
    }
  }, [bookDetails, bookOutline, handleSaveDraft]);

  const handleRevisePage = useCallback(async (feedback: string) => {
    if (!bookDetails || !currentPageContent) return;
    setIsLoading(true);
    setLoadingMessage('Revising page based on your feedback...');
    setError(null);
    try {
        const revisedContent = await revisePage(currentPageContent, feedback, bookDetails);
        const newBookContent = bookContent.map(chapter => [...chapter]);
        if (!newBookContent[viewedChapterIndex]) {
            newBookContent[viewedChapterIndex] = [];
        }
        newBookContent[viewedChapterIndex][viewedPageIndex] = revisedContent;
        
        setBookContent(newBookContent);
        setCurrentPageContent(revisedContent);
    } catch (err) {
        handleError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, [bookDetails, currentPageContent, bookContent, viewedChapterIndex, viewedPageIndex]);
  
  const handleApproveAndContinue = useCallback(async () => {
    if (!bookDetails || !bookOutline) return;

    const newBookContent = bookContent.map(chapter => [...chapter]);
    if (!newBookContent[currentChapterIndex]) {
        newBookContent[currentChapterIndex] = [];
    }
    newBookContent[currentChapterIndex][currentPageIndex] = currentPageContent;
    setBookContent(newBookContent);

    let nextPageIndex = currentPageIndex + 1;
    let nextChapterIndex = currentChapterIndex;

    if (nextPageIndex >= bookDetails.numPagesPerChapter) {
        nextPageIndex = 0;
        nextChapterIndex++;
    }

    if (nextChapterIndex >= bookDetails.numChapters) {
        setLoadingMessage('Generating final book sections...');
        setIsLoading(true);
        const frontData = await generateFrontMatter(bookDetails, bookOutline);
        const backData = await generateBackMatter(bookDetails, bookOutline, newBookContent);
        setBookMatter({ ...frontData, ...backData } as BookMatter);
        setIsLoading(false);
        setAppState(AppState.FINAL);
        handleSaveDraft();
        return;
    }

    setIsLoading(true);
    setLoadingMessage(`Crafting Chapter ${nextChapterIndex + 1}, Page ${nextPageIndex + 1}...`);
    setError(null);

    try {
        const previousPageContent = currentPageContent;
        const content = await writePage(bookDetails, bookOutline, nextChapterIndex, nextPageIndex, previousPageContent, bookDetails.numPagesPerChapter);
        setCurrentPageContent(content);
        setCurrentChapterIndex(nextChapterIndex);
        setCurrentPageIndex(nextPageIndex);
        setViewedChapterIndex(nextChapterIndex);
        setViewedPageIndex(nextPageIndex);
    } catch (err) {
        handleError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, [bookDetails, bookOutline, bookContent, currentChapterIndex, currentPageIndex, currentPageContent, handleSaveDraft]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!bookDetails || !bookContent) return;

    let newViewedChapter = viewedChapterIndex;
    let newViewedPage = viewedPageIndex;

    if (direction === 'next') {
      newViewedPage++;
      if (newViewedPage >= bookDetails.numPagesPerChapter) {
        newViewedPage = 0;
        newViewedChapter++;
      }
    } else { // 'prev'
      newViewedPage--;
      if (newViewedPage < 0) {
        newViewedChapter--;
        newViewedPage = bookDetails.numPagesPerChapter - 1;
      }
    }

    const isNavigatingTooFar = newViewedChapter > currentChapterIndex || (newViewedChapter === currentChapterIndex && newViewedPage > currentPageIndex);
    if (isNavigatingTooFar || newViewedChapter < 0) {
      return;
    }
    
    setViewedChapterIndex(newViewedChapter);
    setViewedPageIndex(newViewedPage);
    setCurrentPageContent(bookContent[newViewedChapter]?.[newViewedPage] || '');
  }, [bookDetails, bookContent, viewedChapterIndex, viewedPageIndex, currentChapterIndex, currentPageIndex]);

  const handleFinalRevision = useCallback(async (feedback: string) => {
    if (!bookDetails || !bookOutline || !bookMatter || !bookContent) return;
    setIsLoading(true);
    setLoadingMessage('Performing final editorial revisions...');
    setError(null);
    try {
      const { revisedMatter, revisedContent } = await reviseFullBook(
        bookDetails,
        bookOutline,
        bookMatter,
        bookContent,
        feedback
      );

      // Apply changes to matter
      const newMatter = { ...bookMatter, ...revisedMatter };
      setBookMatter(newMatter);

      // Apply changes to content
      const newContent = bookContent.map(chapter => [...chapter]);
      revisedContent.forEach(change => {
        if (newContent[change.chapterIndex]) {
          newContent[change.chapterIndex][change.pageIndex] = change.newPageContent;
        }
      });
      setBookContent(newContent);

      setLoadingMessage('Revisions complete!');
      setTimeout(() => setIsLoading(false), 1500); // Show success message briefly

    } catch (err) {
      handleError(err instanceof Error ? err.message : 'An error occurred during final revision.');
    }
  }, [bookDetails, bookOutline, bookMatter, bookContent]);

  useEffect(() => {
    if (appState === AppState.WRITING || appState === AppState.FINAL) {
        handleSaveDraft();
    }
  }, [bookContent, currentPageContent, bookMatter, handleSaveDraft, appState]);

  // Auto-save timer effect
  useEffect(() => {
    let intervalId: number | undefined;

    if (appState === AppState.WRITING) {
      intervalId = window.setInterval(() => {
        handleSaveDraft();
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 4000);
      }, 120000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [appState, handleSaveDraft]);


  const handleStartOver = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setAppState(AppState.SETUP);
    setBookDetails(null);
    setBookOutline(null);
    setBookContent([]);
    setBookMatter(null);
    setCurrentPageContent('');
    setCurrentChapterIndex(0);
    setCurrentPageIndex(0);
    setViewedChapterIndex(0);
    setViewedPageIndex(0);
    setError(null);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.SETUP:
        return <InitialSetupForm onSubmit={handleStartOutlineGeneration} isLoading={isLoading} hasDraft={hasDraft} onLoadDraft={handleLoadDraft} />;
      case AppState.OUTLINE:
        return bookOutline && <OutlineView outline={bookOutline} onApprove={handleStartWriting} onRevise={handleReviseOutline} onApproveAndAutoWrite={handleStartAutomaticWriting} isLoading={isLoading} />;
      case AppState.WRITING:
        return bookDetails && bookOutline && (
          <WritingView
            chapterIndex={viewedChapterIndex}
            pageIndex={viewedPageIndex}
            currentChapterIndex={currentChapterIndex}
            currentPageIndex={currentPageIndex}
            chapterTitle={bookOutline.chapters[viewedChapterIndex].title}
            pageContent={currentPageContent}
            totalChapters={bookDetails.numChapters}
            totalPagesPerChapter={bookDetails.numPagesPerChapter}
            onRevise={handleRevisePage}
            onApproveAndContinue={handleApproveAndContinue}
            onNavigate={handleNavigate}
            onSaveDraft={handleSaveDraft}
            isLoading={isLoading}
            autoSaveStatus={autoSaveStatus}
            bookDetails={bookDetails}
            bookOutline={bookOutline}
            bookContent={bookContent}
          />
        );
      case AppState.FINAL:
        return bookDetails && bookOutline && (
            <FinalBookView
                title={bookOutline.titleOptions[0]}
                author={bookDetails.penName}
                chapters={bookOutline.chapters}
                content={bookContent}
                matter={bookMatter}
                onStartOver={handleStartOver}
                onRevise={handleFinalRevision}
                isLoading={isLoading}
            />
        );
      default:
        return <p>Something went wrong.</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900">
      {isLoading && <LoadingSpinner message={loadingMessage} />}
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6 max-w-4xl mx-auto" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </button>
            </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;