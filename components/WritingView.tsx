import React, { useState, useEffect, useRef } from 'react';
import type { BookDetails, BookOutline } from '../types';

declare const saveAs: any;
declare const html2pdf: any;

interface WritingViewProps {
  // These represent the currently VIEWED page
  chapterIndex: number;
  pageIndex: number;

  // These represent the LATEST WRITTEN page
  currentChapterIndex: number;
  currentPageIndex: number;

  chapterTitle: string;
  pageContent: string;
  totalChapters: number;
  totalPagesPerChapter: number;
  onRevise: (feedback: string) => void;
  onApproveAndContinue: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onSaveDraft: () => void;
  isLoading: boolean;
  autoSaveStatus: 'idle' | 'saved';
  bookDetails: BookDetails;
  bookOutline: BookOutline;
  bookContent: string[][];
}

const WritingView: React.FC<WritingViewProps> = ({
  chapterIndex,
  pageIndex,
  currentChapterIndex,
  currentPageIndex,
  chapterTitle,
  pageContent,
  totalChapters,
  totalPagesPerChapter,
  onRevise,
  onApproveAndContinue,
  onNavigate,
  onSaveDraft,
  isLoading,
  autoSaveStatus,
  bookDetails,
  bookOutline,
  bookContent
}) => {
  const [feedback, setFeedback] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success'>('idle');
  const contentRef = useRef<HTMLDivElement>(null);

  const isViewingLatestPage = chapterIndex === currentChapterIndex && pageIndex === currentPageIndex;
  const isFirstPageOfBook = chapterIndex === 0 && pageIndex === 0;

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    setFeedback('');
  }, [chapterIndex, pageIndex, pageContent]);

  const handleRevise = () => {
    if (feedback.trim()) {
      onRevise(feedback);
    }
  };

  const handleSaveDraft = () => {
    onSaveDraft();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };
  
  const isLastPageOfChapter = pageIndex + 1 === totalPagesPerChapter;
  const isLastPageOfBook = isLastPageOfChapter && chapterIndex + 1 === totalChapters;

  const getButtonText = () => {
    if (isLoading && isViewingLatestPage) return 'Please wait...';
    if (isLastPageOfBook) return 'Approve & Finalize Book';
    if (isLastPageOfChapter) return `Approve & Start Chapter ${currentChapterIndex + 2}`;
    return `Approve & Write Page ${currentPageIndex + 2}`;
  };

  // --- Download Logic ---
  const getFullContentForDownload = () => {
      const fullContent = JSON.parse(JSON.stringify(bookContent));
      if (!fullContent[chapterIndex]) {
        fullContent[chapterIndex] = [];
      }
      fullContent[chapterIndex][pageIndex] = pageContent;
      return fullContent;
  };

  const title = bookOutline.titleOptions[0] || 'Untitled_Book';
  const author = bookDetails.penName || 'Unknown_Author';
  const baseFilename = `DRAFT_${title.replace(/ /g, '_')}_by_${author.replace(/ /g, '_')}`;

  const compileBookText = (contentToCompile: string[][]) => {
    let fullText = `Title: ${title}\nAuthor: ${author}\n\n--- DRAFT ---\n\n`;
    
    fullText += "Table of Contents\n";
    bookOutline.chapters.forEach((chapter, index) => {
        fullText += `${index + 1}. ${chapter.title}\n`;
    });
    fullText += "\n\n";

    contentToCompile.forEach((chapterPages, chapterIndex) => {
      if (chapterPages && chapterPages.some(p => p && p.trim() !== '')) {
        fullText += `--- Chapter ${chapterIndex + 1}: ${bookOutline.chapters[chapterIndex].title} ---\n\n`;
        const chapterContent = chapterPages.filter(p => p && p.trim() !== '').join('\n\n---\n\n');
        fullText += `${chapterContent}\n\n`;
      }
    });
    return fullText;
  };

  const compileBookHtml = (contentToCompile: string[][]) => {
    let html = `<html><head><meta charset="UTF-8"><title>${title}</title><style>body { font-family: 'Times New Roman', Times, serif; } h1,h2,h3 { font-family: Arial, sans-serif; } h1{text-align:center;} h2{text-align:center;} p{white-space: pre-wrap; margin-bottom: 1em;} .page-break{page-break-after: always;}</style></head><body><h1>${title}</h1><h2>by ${author}</h2><p><i>(Draft)</i></p><div class="page-break"></div><h3>Table of Contents</h3><ul>`;
    bookOutline.chapters.forEach((chapter, index) => {
        html += `<li><b>Chapter ${index + 1}:</b> ${chapter.title}</li>`;
    });
    html += `</ul><div class="page-break"></div>`;

    contentToCompile.forEach((chapterPages, chapterIndex) => {
      if (chapterPages && chapterPages.some(p => p && p.trim() !== '')) {
        html += `<h3>Chapter ${chapterIndex + 1}: ${bookOutline.chapters[chapterIndex].title}</h3>`;
        const chapterContent = chapterPages.filter(p => p && p.trim() !== '').map(page => `<p>${page.replace(/\n/g, '<br>')}</p>`).join('');
        html += chapterContent;
        html += `<div class="page-break"></div>`;
      }
    });
    html += '</body></html>';
    return html;
  };

  const handleDownload = (format: 'txt' | 'docx' | 'pdf') => {
      const contentToCompile = getFullContentForDownload();
      
      if (format === 'txt') {
          const bookText = compileBookText(contentToCompile);
          const blob = new Blob([bookText], { type: 'text/plain;charset=utf-8' });
          saveAs(blob, `${baseFilename}.txt`);
      } else if (format === 'docx') {
          const sourceHTML = `<html><head><meta charset='utf-8'></head><body>${compileBookHtml(contentToCompile)}</body></html>`;
          const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
          const fileDownload = document.createElement("a");
          fileDownload.href = source;
          fileDownload.download = `${baseFilename}.doc`;
          fileDownload.click();
      } else if (format === 'pdf') {
          const element = document.createElement('div');
          element.innerHTML = compileBookHtml(contentToCompile);
          html2pdf().from(element).set({
              margin: 1,
              filename: `${baseFilename}.pdf`,
              jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
          }).save();
      }

      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 2500);
  };
  // --- End Download Logic ---
  
  const navButtonClasses = "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition duration-150";

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {chapterTitle}
            </h2>
            <p className="text-lg text-indigo-500 dark:text-indigo-400 font-medium">Chapter {chapterIndex + 1}, Page {pageIndex + 1}</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => onNavigate('prev')} disabled={isFirstPageOfBook || isLoading} className={navButtonClasses}>
              &larr; Previous
            </button>
            <button onClick={() => onNavigate('next')} disabled={isViewingLatestPage || isLoading} className={navButtonClasses}>
              Next &rarr;
            </button>
          </div>
        </div>

        <div ref={contentRef} className="h-[60vh] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 prose dark:prose-invert max-w-none">
           <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{pageContent}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg h-fit">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Review & Refine</h3>
        <div className="space-y-4">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g., 'Can you add a real-life example here?' or 'Make this section more impactful.'"
            className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <div className="flex space-x-2">
            <button
                onClick={handleSaveDraft}
                disabled={isLoading}
                className={`w-1/3 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ${
                saveStatus === 'saved'
                    ? 'bg-green-500'
                    : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                }`}
            >
                {saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
            </button>
            <button
                onClick={handleRevise}
                disabled={isLoading || !feedback.trim()}
                className="w-2/3 bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-yellow-300 disabled:cursor-not-allowed transition duration-150"
            >
                {isLoading ? 'Revising...' : 'Revise Page'}
            </button>
          </div>
          <button
            onClick={onApproveAndContinue}
            disabled={isLoading || !isViewingLatestPage}
            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition duration-150"
            title={!isViewingLatestPage ? "Navigate to the latest page to continue writing" : ""}
          >
            {getButtonText()}
          </button>
        </div>

        <div className="text-center h-5 mt-3">
          {autoSaveStatus === 'saved' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Progress auto-saved just now.
            </p>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Download Draft</h3>
            <div className="flex flex-col space-y-2">
                 <button onClick={() => handleDownload('txt')} disabled={isLoading} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition duration-150">
                    Download (.txt)
                </button>
                <button onClick={() => handleDownload('docx')} disabled={isLoading} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition duration-150">
                    Download (.docx)
                </button>
                <button onClick={() => handleDownload('pdf')} disabled={isLoading} className="bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400 transition duration-150">
                    Download (.pdf)
                </button>
            </div>
            {downloadStatus === 'success' && <p className="text-green-500 text-sm mt-2 text-center animate-pulse">Download started!</p>}
        </div>

      </div>
    </div>
  );
};

export default WritingView;
