import React, { useState } from 'react';
import type { BookMatter, ChapterOutline } from '../types';

declare const saveAs: any;
declare const html2pdf: any;

interface FinalBookViewProps {
  title: string;
  author: string;
  chapters: ChapterOutline[];
  content: string[][];
  matter: BookMatter | null;
  onStartOver: () => void;
  onRevise: (feedback: string) => void;
  isLoading: boolean;
}

const FinalBookView: React.FC<FinalBookViewProps> = ({ title: propsTitle, author: propsAuthor, chapters, content, matter, onStartOver, onRevise, isLoading }) => {
  const [feedback, setFeedback] = useState('');
  const title = propsTitle || 'Untitled_Book';
  const author = propsAuthor || 'Unknown_Author';
  const baseFilename = `${title.replace(/ /g, '_')}_by_${author.replace(/ /g, '_')}`;

  const handleRevise = () => {
      if (feedback.trim()) {
          onRevise(feedback);
      }
  };

  const compileBookText = () => {
    let fullText = `Title: ${title}\nAuthor: ${author}\n\n`;
    
    if (matter) {
        fullText += `--- COPYRIGHT ---\n${matter.copyright}\n\n`;
        fullText += `--- DEDICATION ---\n${matter.dedication}\n\n`;
        fullText += `--- ACKNOWLEDGMENTS ---\n${matter.acknowledgments}\n\n`;
    }

    fullText += "--- TABLE OF CONTENTS ---\n";
    chapters.forEach((chapter, index) => {
        fullText += `${index + 1}. ${chapter.title}\n`;
    });
    fullText += "\n\n";
    
    if (matter) {
        fullText += `--- INTRODUCTION ---\n${matter.introduction}\n\n`;
    }

    content.forEach((chapterPages, chapterIndex) => {
        fullText += `--- Chapter ${chapterIndex + 1}: ${chapters[chapterIndex].title} ---\n\n`;
        const chapterContent = chapterPages.join('\n\n---\n\n');
        fullText += `${chapterContent}\n\n`;
    });
    
    if (matter) {
        fullText += `--- CONCLUSION ---\n${matter.conclusion}\n\n`;
        if (matter.appendix) fullText += `--- APPENDIX ---\n${matter.appendix}\n\n`;
        if (matter.glossary) fullText += `--- GLOSSARY ---\n${matter.glossary}\n\n`;
        fullText += `--- ABOUT THE AUTHOR ---\n${matter.authorBio}\n\n`;
    }

    return fullText;
  };
  
  const compileBookHtml = () => {
    let html = `
        <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        line-height: 1.5; 
                        font-size: 12pt; 
                    }
                    h1, h2, h3, h4 { 
                        font-family: 'Georgia', serif; 
                        font-weight: bold;
                        break-after: avoid; 
                    }
                    h1.title-page { font-size: 36pt; text-align: center; margin-top: 3in; }
                    h2.author-page { font-size: 24pt; text-align: center; margin-top: 0.5in; }
                    h3.section-title { font-size: 20pt; break-before: page; padding-top: 1in; }
                    p { 
                        white-space: pre-wrap; 
                        margin-bottom: 0;
                        text-align: justify;
                        text-indent: 0.5in; /* Indent first line of all paragraphs */
                    }
                    p:first-of-type, h3 + p, h4 + p {
                        text-indent: 0; /* No indent for first paragraph after a heading */
                    }
                    .page-break { page-break-after: always; }
                    .centered { text-align: center; text-indent: 0; }
                    .front-matter { padding-top: 2in; text-align: center; }
                    .front-matter p { text-indent: 0; }
                    .toc ul { list-style-type: none; padding-left: 0; }
                    .toc li { margin-bottom: 0.5em; }
                </style>
            </head>
            <body>
                <h1 class="title-page">${title}</h1>
                <h2 class="author-page">by ${author}</h2>
                <div class="page-break"></div>`;

    if (matter) {
        html += `<div class="front-matter centered"><p>${matter.copyright.replace(/\n/g, '<br>')}</p></div><div class="page-break"></div>`;
        html += `<div class="front-matter centered"><h4>Dedication</h4><p><em>${matter.dedication.replace(/\n/g, '<br>')}</em></p></div><div class="page-break"></div>`;
        html += `<h3 class="section-title">Acknowledgments</h3><p>${matter.acknowledgments.replace(/\n/g, '<br>')}</p><div class="page-break"></div>`;
    }

    html += `<div class="toc"><h3 class="section-title">Table of Contents</h3><ul>`;
    chapters.forEach((chapter, index) => {
        html += `<li><b>Chapter ${index + 1}:</b> ${chapter.title}</li>`;
    });
    html += `</ul></div><div class="page-break"></div>`;

    if (matter) {
        html += `<h3 class="section-title">Introduction</h3><p>${matter.introduction.replace(/\n/g, '<br>')}</p><div class="page-break"></div>`;
    }

    content.forEach((chapterPages, chapterIndex) => {
        html += `<h3 class="section-title">Chapter ${chapterIndex + 1}: ${chapters[chapterIndex].title}</h3>`;
        const chapterContent = chapterPages.map(page => `<p>${page.replace(/\n/g, '</p><p>')}</p>`).join('');
        html += chapterContent;
        html += `<div class="page-break"></div>`;
    });
    
    if(matter) {
        html += `<h3 class="section-title">Conclusion</h3><p>${matter.conclusion.replace(/\n/g, '<br>')}</p><div class="page-break"></div>`;
        if (matter.appendix) html += `<h3 class="section-title">Appendix</h3><p>${matter.appendix.replace(/\n/g, '<br>')}</p><div class="page-break"></div>`;
        if (matter.glossary) html += `<h3 class="section-title">Glossary</h3><p>${matter.glossary.replace(/\n/g, '<br>')}</p><div class="page-break"></div>`;
        html += `<h3 class="section-title">About the Author</h3><p>${matter.authorBio.replace(/\n/g, '<br>')}</p>`;
    }

    html += '</body></html>';
    return html;
  };


  const handleDownload = (format: 'txt' | 'docx') => {
    if (format === 'txt') {
        const bookText = compileBookText();
        const blob = new Blob([bookText], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${baseFilename}.txt`);
    } else if (format === 'docx') {
        const sourceHTML = `<html><head><meta charset='utf-8'></head><body>${compileBookHtml()}</body></html>`;
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        fileDownload.href = source;
        fileDownload.download = `${baseFilename}.doc`;
        fileDownload.click();
    }
  };
  
  const handleDownloadKdpPdf = (size: '6x9' | '6.69x9.61') => {
     const element = document.createElement('div');
     element.innerHTML = compileBookHtml();
     
     // Dynamically set page dimensions and margins based on the user's KDP size selection.
     let format: number[];
     let margins: number;
 
     if (size === '6x9') {
         format = [6, 9];
         margins = 0.75; // KDP-compliant margin for 6x9 trim size
     } else { // '6.69x9.61'
         format = [6.69, 9.61];
         margins = 0.8; // KDP-compliant margin for 6.69x9.61 trim size
     }
     
     const opt = {
        margin:       margins,
        filename:     `KDP_${size}_${baseFilename}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: format, orientation: 'portrait' }
     };

     html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">{title}</h2>
      <p className="text-xl text-gray-600 dark:text-gray-400 text-center mb-8">by {author}</p>
      
      <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <p className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-3">Download Your Book</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => handleDownload('txt')} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150">
                Simple Text (.txt)
            </button>
            <button onClick={() => handleDownload('docx')} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150">
                Word Document (.docx)
            </button>
            <button onClick={() => handleDownloadKdpPdf('6x9')} className="bg-fuchsia-700 text-white font-bold py-2 px-6 rounded-md hover:bg-fuchsia-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 transition duration-150">
                KDP PDF (6" x 9")
            </button>
            <button onClick={() => handleDownloadKdpPdf('6.69x9.61')} className="bg-teal-600 text-white font-bold py-2 px-6 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition duration-150">
                KDP PDF (6.69" x 9.61")
            </button>
        </div>
      </div>
       
      <div className="my-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-3 text-center">Final Revisions</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
            Provide any final, high-level feedback for the entire book, and the AI will act as an editor to implement the changes.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g., 'Make the conclusion more impactful and add a personal story to the introduction.'"
            className="w-full h-28 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition duration-150"
            disabled={isLoading}
          />
           <div className="mt-4 flex justify-center">
            <button 
              onClick={handleRevise} 
              disabled={isLoading || !feedback.trim()} 
              className="bg-yellow-500 text-white font-bold py-3 px-8 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-yellow-300 disabled:cursor-not-allowed transition duration-150 ease-in-out w-full sm:w-auto"
            >
              {isLoading ? 'Revising Full Book...' : 'Submit Final Revisions'}
            </button>
           </div>
      </div>
      
      <div className="flex justify-center my-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onStartOver} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150">
            Start New Book
        </button>
      </div>

      <div className="h-[60vh] overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
        {matter && (
            <>
                <h3 className="text-2xl font-semibold border-b pb-2 mb-4 dark:text-white dark:border-gray-600">Introduction</h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-4">{matter.introduction}</p>
            </>
        )}
        <h3 className="text-2xl font-semibold border-b pb-2 mb-4 dark:text-white dark:border-gray-600">Table of Contents</h3>
        <ul className="list-decimal list-inside space-y-2 mb-8 text-indigo-700 dark:text-indigo-400">
            {chapters.map((chapter, index) => (
                <li key={index} className="font-medium">{chapter.title}</li>
            ))}
        </ul>

        {content.map((chapterPages, chapterIndex) => (
            <div key={chapterIndex}>
                <h3 className="text-2xl font-semibold border-b pb-2 my-6 dark:text-white dark:border-gray-600">Chapter {chapterIndex + 1}: {chapters[chapterIndex].title}</h3>
                {chapterPages.map((pageContent, pageIndex) => (
                     <p key={pageIndex} className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-4">{pageContent}</p>
                ))}
            </div>
        ))}
         {matter && (
            <>
                <h3 className="text-2xl font-semibold border-b pb-2 my-6 dark:text-white dark:border-gray-600">Conclusion</h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-4">{matter.conclusion}</p>
                {matter.appendix && (
                    <>
                        <h3 className="text-2xl font-semibold border-b pb-2 my-6 dark:text-white dark:border-gray-600">Appendix</h3>
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-4">{matter.appendix}</p>
                    </>
                )}
                 {matter.glossary && (
                    <>
                        <h3 className="text-2xl font-semibold border-b pb-2 my-6 dark:text-white dark:border-gray-600">Glossary</h3>
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-4">{matter.glossary}</p>
                    </>
                )}
                <h3 className="text-2xl font-semibold border-b pb-2 my-6 dark:text-white dark:border-gray-600">About the Author</h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-4">{matter.authorBio}</p>
            </>
        )}
      </div>
    </div>
  );
};

export default FinalBookView;