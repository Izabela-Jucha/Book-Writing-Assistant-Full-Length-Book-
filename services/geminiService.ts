import { GoogleGenAI, Type } from "@google/genai";
import type { BookDetails, BookOutline, BookMatter } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generateOutlineSchema = {
  type: Type.OBJECT,
  properties: {
    titleOptions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Suggest 2-3 compelling book titles."
    },
    summary: {
      type: Type.STRING,
      description: "A short, engaging pitch for the back cover of the book."
    },
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING, description: "A brief description of this chapter's purpose and content." }
        },
        required: ["title", "description"]
      },
      description: "An array of chapter titles and descriptions."
    }
  },
  required: ["titleOptions", "summary", "chapters"]
};

const bookMatterSchema = {
    type: Type.OBJECT,
    properties: {
        copyright: { type: Type.STRING, description: "A standard book copyright page text. Include the author's pen name and the current year. Include an 'All rights reserved' clause and a placeholder for an ISBN." },
        dedication: { type: Type.STRING, description: "A short, heartfelt dedication based on the book's theme and audience." },
        acknowledgments: { type: Type.STRING, description: "A standard acknowledgments page text, thanking generic entities like 'my family', 'my editor', 'my agent', and 'the readers'." },
        introduction: { type: Type.STRING, description: "A compelling introduction for the book. It should set the stage, explain the book's purpose (Why this book), define its audience (Who this book is for), explain its structure (How to use this book), and hook the reader." },
        conclusion: { type: Type.STRING, description: "A powerful conclusion for the book. It should summarize the key takeaways and leave the reader with a final, inspiring call to action." },
        appendix: { type: Type.STRING, description: "If relevant, an appendix with supplementary material. If not needed, this should be an empty string." },
        glossary: { type: Type.STRING, description: "A glossary of key terms with clear, concise definitions. If no special terms are needed, this should be an empty string." },
        authorBio: { type: Type.STRING, description: "A short 'About the Author' biography, positioning the author as an expert on the book's theme." },
    },
    required: ["copyright", "dedication", "acknowledgments", "introduction", "conclusion", "appendix", "glossary", "authorBio"]
};


const getLanguageInstruction = (language: 'english' | 'polish'): string => {
    if (language === 'polish') {
        return 'IMPORTANT: The entire response, including all generated content (titles, summaries, descriptions, and all book sections), must be in Polish.';
    }
    return '';
}

export const generateOutline = async (details: BookDetails): Promise<BookOutline> => {
  const langInstruction = getLanguageInstruction(details.language);

  const prompt = `
    ${langInstruction}
    Based on the following book details, generate a detailed outline.

    Book Details:
    - Main Theme/Topic: ${details.theme}
    - Genre: ${details.genre}
    - Target Audience: ${details.audience}
    - Writing Style: ${details.writingStyle}
    - Author's Pen Name: ${details.penName}
    - Number of Chapters: ${details.numChapters}
    ${details.chapters ? `- Specific Chapter Ideas: ${details.chapters}` : ''}

    Generate ${details.numChapters} chapters.
    If the user provided specific chapter ideas, use them as inspiration, but feel free to refine them for better flow.

    **Key Strategies for SEO-Friendly Chapter Titles:**
    - **Keyword Optimization:** Incorporate the book's main keyword/theme near the start of the title when it feels natural.
    - **Conciseness:** Keep titles under 60 characters to avoid being cut off in search results.
    - **User-Centric & Compelling:** Write titles for the user. They should be descriptive, clear, and engaging to increase interest. Use modifiers like "How-To," "Tips," or "Guide," and highlight benefits.
    - **Structure and Clarity:** The titles should provide clear signposts for the reader.
    - **Uniqueness:** Ensure each chapter title is unique.
    - **Chapter Parts:** For complex topics that span multiple chapters, you can divide them into parts. For example: "Chapter 3: Mastering Productivity (Part 1: The System)" and "Chapter 4: Mastering Productivity (Part 2: The Tools)".

    The output must be a valid JSON object matching the provided schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: generateOutlineSchema,
    },
  });

  const jsonText = response.text.trim();
  try {
    return JSON.parse(jsonText) as BookOutline;
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", jsonText);
    throw new Error("The AI returned an invalid outline format. Please try again.");
  }
};

export const reviseOutline = async (
  details: BookDetails,
  originalOutline: BookOutline,
  feedback: string
): Promise<BookOutline> => {
  const langInstruction = getLanguageInstruction(details.language);

  const prompt = `
    ${langInstruction}
    You are an expert book planner. Your task is to revise an existing book outline based on user feedback.

    User Feedback:
    "${feedback}"

    Original Book Outline (as a JSON string):
    ${JSON.stringify(originalOutline)}

    Original Book Details:
    - Main Theme/Topic: ${details.theme}
    - Genre: ${details.genre}
    - Target Audience: ${details.audience}
    - Writing Style: ${details.writingStyle}
    - Number of Chapters: ${details.numChapters}

    Instructions:
    1.  Carefully consider the user's feedback and modify the outline accordingly.
    2.  You can change titles, summaries, and chapter descriptions.
    3.  When revising titles, you MUST adhere to the following SEO best practices:
        - **Keyword Optimization:** Incorporate the book's main keyword/theme near the start of the title when it feels natural.
        - **Conciseness:** Keep titles under 60 characters.
        - **User-Centric & Compelling:** Titles must be descriptive, clear, and engaging.
        - **Uniqueness:** Ensure each chapter title is unique.
        - **Chapter Parts:** You can structure related chapters as parts (e.g., "Topic (Part 1)", "Topic (Part 2)").
    4.  Ensure the revised outline still has exactly ${details.numChapters} chapters.
    5.  Maintain the overall structure and flow of a coherent book.
    6.  The output must be a valid JSON object matching the provided schema. Do not add any extra text or explanations.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: generateOutlineSchema,
    },
  });

  const jsonText = response.text.trim();
  try {
    return JSON.parse(jsonText) as BookOutline;
  } catch (e) {
    console.error("Failed to parse Gemini revision response as JSON:", jsonText);
    throw new Error("The AI returned an invalid revised outline format. Please try again.");
  }
};

const getStyleInstructions = (style: BookDetails['writingStyle'], length: BookDetails['paragraphLength']): string => {
  let styleInstruction = '';
  switch (style) {
    case 'conversational':
      styleInstruction = `**Writing Style: Conversational.** Write in a casual, direct style as if you're talking to a friend. Use "you" and "we" frequently. Use relatable examples and a friendly, encouraging tone. The reader should feel like they are having a conversation, not being lectured.`;
      break;
    case 'storytelling':
      styleInstruction = `**Writing Style: Storytelling / Narrative.** Weave the content into a compelling narrative. Use stories, anecdotes, and real-world case studies as the primary method of explaining concepts. Focus on creating an emotional connection with the reader.`;
      break;
    case 'practical':
      styleInstruction = `**Writing Style: Practical / Instructional.** Be direct and structured. Use clear frameworks, steps, and checklists. The focus is on action and providing the reader with a toolkit they can use immediately.`;
      break;
    case 'hybrid':
      styleInstruction = `**Writing Style: Hybrid (Conversational + Practical).** This is a top-selling style. Combine a friendly, conversational tone with highly practical, actionable content. Start with relatable stories, but ensure every major point concludes with clear steps, templates, or exercises. The goal is to be both entertaining and incredibly useful.`;
      break;
    case 'research':
      styleInstruction = `**Writing Style: Research-Based / Authority.** Adopt a professional, expert tone. Back up claims with data, studies, and expert analysis (you can create plausible-sounding sources if needed). The writing should be credible and authoritative.`;
      break;
    case 'inspirational':
      styleInstruction = `**Writing Style: Inspirational / Motivational.** Use uplifting, big-picture language. Incorporate powerful quotes and calls to action. The goal is to speak to the reader's emotions and inspire them to make a change.`;
      break;
    case 'raw':
      styleInstruction = `**Writing Style: Brutally Honest / Raw.** Be blunt, authentic, and cut through the fluff. Use humor or even a bit of shock value to make a point. This voice is refreshing and resonates with audiences tired of polished "guru" voices.`;
      break;
    default:
        styleInstruction = `**Writing Style: Conversational.** Write in a casual, direct style.`;
  }

  let lengthInstruction = '';
  switch (length) {
    case 'short':
      lengthInstruction = 'Paragraphs must be very short and punchy (1-3 sentences) to create a fast-paced reading experience.';
      break;
    case 'standard':
      lengthInstruction = 'Use standard paragraph lengths (3-5 sentences), balancing detail with readability.';
      break;
    case 'long':
      lengthInstruction = 'Write in more detailed, longer paragraphs (5+ sentences) to explore topics in depth. This is suitable for a more academic or research-heavy style.';
      break;
  }

  return `${styleInstruction}\n${lengthInstruction}`;
}

export const writePage = async (
  details: BookDetails,
  outline: BookOutline,
  chapterIndex: number,
  pageIndex: number,
  previousPageContent: string | null,
  totalPagesPerChapter: number
): Promise<string> => {
  const chapterInfo = outline.chapters[chapterIndex];
  const bookTitle = outline.titleOptions[0];
  const langInstruction = details.language === 'polish' ? 'You must write the entire page content in Polish.' : '';
  const styleInstructions = getStyleInstructions(details.writingStyle, details.paragraphLength);

  let specificInstructions = '';
  if (pageIndex === 0) {
    let storyInstruction = 'This is the FIRST page of the chapter. You must open with an engaging story (5–7 sentences) that emotionally connects the reader to this chapter\'s topic before transitioning into the main content. Avoid long, abstract prologues.';
    if (chapterIndex > 0) {
        const previousChapterInfo = outline.chapters[chapterIndex - 1];
        storyInstruction += ` This story must create a smooth transition from the previous chapter, titled "${previousChapterInfo.title}", and connect its themes to the new chapter's topic.`;
    }
    specificInstructions += storyInstruction;
  }

  if (pageIndex > 0 && pageIndex < totalPagesPerChapter - 1 && (pageIndex + 1) % 3 === 0 ) {
       specificInstructions += '\nTo keep the reader engaged, this page must include an interactive element. This is a rule for every 2-3 pages. Please insert one of the following: an "Exercise", a "Quiz", a "Checklist", a "Table", a "Reflection Question", or a "Mini-Case Study". If you choose a Mini-Case Study, it should be 120-150 words and describe a real-world problem with a simple, tangible result (e.g., "what previously took 2 hours now takes only 12 minutes").';
  }

  if (pageIndex === totalPagesPerChapter - 1) {
    specificInstructions += `
      This is the LAST page of the chapter. You must conclude the page with the following three distinct sections, using these exact titles as plain text, in this order:
      1.  "Micro-summary": A concise recap of the chapter's key takeaways in 3-5 sentences.
      2.  "Task for Today": A single, practical, and relevant exercise that helps the reader apply what they've learned immediately.
      3.  "Bonus Pack": Provide a genuinely useful, real-world resource for the reader. This must be one of the following:
          - A usable template. This could be a ready-to-use template with its full structure (e.g., a complete weekly planner) or a template with clear placeholders for the reader to fill in (e.g., \`[Your Goal Here]\`). The goal is maximum practical value.
          - A practical checklist (list all actionable items).
          - A list of real, verifiable websites, books, or tools for further learning.
          **CRITICAL RULE: Do not invent or hallucinate websites, links, books, or any other resources. Every resource you mention must be real and accessible. Use your search tool to verify information if necessary. The goal is to provide tangible, real-world value.**
    `;
  }

  const prompt = `
    You are a bestselling non-fiction author and copywriter with millions of books sold. Your writing is clear, engaging, and professional, following the standards of a commercially successful book.
    ${langInstruction}

    **Core Writing Persona & Style:**
    ${styleInstructions}

    **Core Writing Rules:**
    1.  **Professional Formatting:** Write with impeccable structure. Use proper punctuation and well-structured paragraphs. The final rendered book will use a serif font and have indented first lines for paragraphs, so structure your text accordingly with clear paragraph breaks. **Crucially, do not use any markdown syntax like '###', '**', or '_'.** Emphasis should be achieved through strong word choice and sentence structure, not special characters. You may use tables where appropriate for data.
    2.  **Originality is Paramount:** NEVER copy text from the internet. Use your deep research capabilities via Google Search to generate 100% original content.
    3.  **Concise & Impactful:** Keep introductions concise. Avoid common platitudes or repetitive statements. Get straight to the point.
    4.  **No Repetition:** Do not repeat the same ideas, examples, or metaphors within the same chapter.
    5.  **Metaphor Limit:** Use a maximum of two fresh, inventive metaphors per chapter. Avoid clichés.
    6.  **Verifiable Resources:** Any external resources mentioned (websites, books, tools, etc.) in the 'Bonus Pack' must be real and verifiable. Do not hallucinate.

    **Current Task:**
    Write Page ${pageIndex + 1} for Chapter ${chapterIndex + 1} of the book titled "${bookTitle}".

    **Book & Chapter Context:**
    - Genre: ${details.genre} (Adapt your style for non-fiction)
    - Target Audience: ${details.audience}
    - Chapter Title: "${chapterInfo.title}"
    - Chapter Description: ${chapterInfo.description}
    ${previousPageContent ? `This new page must flow seamlessly from the previous one. Here is the end of the previous page for context: "...${previousPageContent.slice(-200)}"` : ""}

    **Specific Instructions for This Page:**
    - The total word count for this page should be approximately 1000-2000 words.
    - ${specificInstructions}
    - Do NOT include the chapter or page title in the output. Just provide the raw page content, following all structural rules.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        tools: [{googleSearch: {}}],
    }
  });

  return response.text;
};


export const revisePage = async (
  originalContent: string,
  feedback: string,
  details: BookDetails
): Promise<string> => {
  const langInstruction = details.language === 'polish' ? 'The revised page content must be in Polish.' : '';
  const styleInstructions = getStyleInstructions(details.writingStyle, details.paragraphLength);

  const prompt = `
    You are a skilled editor and bestselling author. Revise the following book page based on the user's feedback, while adhering to the core writing rules and persona.
    ${langInstruction}

    **Core Writing Persona & Style to Maintain:**
    ${styleInstructions}

    **Core Writing Rules to Follow:**
    1.  **Professional Formatting:** Write with impeccable structure. The final rendered book will use a serif font and have indented first lines for paragraphs, so structure your text accordingly. **Do not use markdown for headers (like '###') or emphasis (like '**' or '_').** Use standard bullet points (using a hyphen '-') and numbered lists for clarity. You may use tables for complex data.
    2.  **Originality is Paramount:** The content must remain original.
    3.  **Concise & Impactful:** Keep content concise and avoid platitudes.
    4.  **No Repetition:** Avoid repeating ideas or metaphors unnecessarily.
    5.  **Metaphor Limit:** The chapter should not exceed two metaphors in total.
    6.  **Valuable Templates & Verifiable Resources:** This is critical. Any templates must be practical. Any external resources mentioned (websites, books, tools, etc.) must be real and verifiable. Do not add or change resources to ones that are not real. Double-check any resources you add.

    **Book Details:**
    - Target Audience: ${details.audience}

    **User Feedback:**
    "${feedback}"

    **Original Page Content:**
    ---
    ${originalContent}
    ---

    **Instructions:**
    1.  Rewrite the page incorporating the feedback.
    2.  Ensure the revised page strictly follows all persona, style, and writing rules mentioned above.
    3.  Return only the full, revised page content.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};

export const generateFrontMatter = async (details: BookDetails, outline: BookOutline): Promise<Partial<BookMatter>> => {
    const langInstruction = getLanguageInstruction(details.language);
    const frontMatterSchema = {
        type: Type.OBJECT,
        properties: {
            copyright: bookMatterSchema.properties.copyright,
            dedication: bookMatterSchema.properties.dedication,
            acknowledgments: bookMatterSchema.properties.acknowledgments,
            introduction: bookMatterSchema.properties.introduction,
        },
        required: ["copyright", "dedication", "acknowledgments", "introduction"]
    };

    const prompt = `
        ${langInstruction}
        You are a professional book publisher. Generate the front matter for a new book.
        
        Book Details:
        - Title: ${outline.titleOptions[0]}
        - Author: ${details.penName}
        - Theme: ${details.theme}
        - Audience: ${details.audience}
        
        Generate the content for the Copyright, Dedication, Acknowledgments, and Introduction sections. The introduction should be comprehensive, covering the book's purpose, who it's for, and how to use it.
        Return the response as a valid JSON object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: frontMatterSchema,
        },
    });

    try {
        return JSON.parse(response.text.trim()) as Partial<BookMatter>;
    } catch (e) {
        console.error("Failed to parse front matter JSON:", response.text);
        throw new Error("The AI returned invalid front matter.");
    }
};

export const generateBackMatter = async (details: BookDetails, outline: BookOutline, bookContent: string[][]): Promise<Partial<BookMatter>> => {
    const langInstruction = getLanguageInstruction(details.language);
    const backMatterSchema = {
        type: Type.OBJECT,
        properties: {
            conclusion: bookMatterSchema.properties.conclusion,
            appendix: bookMatterSchema.properties.appendix,
            glossary: bookMatterSchema.properties.glossary,
            authorBio: bookMatterSchema.properties.authorBio,
        },
        required: ["conclusion", "appendix", "glossary", "authorBio"]
    };

    // To avoid an overly long prompt, we'll just send chapter titles and descriptions as context
    const chapterContext = outline.chapters.map((ch, i) => `Chapter ${i+1}: ${ch.title} - ${ch.description}`).join('\n');

    const prompt = `
        ${langInstruction}
        You are a professional book publisher. Generate the back matter for a book that has just been written.
        
        Book Details:
        - Title: ${outline.titleOptions[0]}
        - Author: ${details.penName}
        - Theme: ${details.theme}
        - Audience: ${details.audience}
        - Chapter Outline: ${chapterContext}

        Generate the content for the Conclusion, Appendix, Glossary, and "About the Author" sections.
        - The Conclusion should summarize the book's key learnings and provide a final call to action.
        - The Appendix should only contain relevant supplementary materials if truly necessary for a book on this topic; otherwise, it should be a very brief note or an empty string.
        - The Glossary should define key terms introduced in the book. If none are needed, return an empty string.
        - The Author Bio should be compelling.
        Return the response as a valid JSON object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: backMatterSchema,
        },
    });

    try {
        return JSON.parse(response.text.trim()) as Partial<BookMatter>;
    } catch (e) {
        console.error("Failed to parse back matter JSON:", response.text);
        throw new Error("The AI returned invalid back matter.");
    }
};

export const reviseFullBook = async (
    details: BookDetails,
    outline: BookOutline,
    matter: BookMatter,
    content: string[][],
    feedback: string
): Promise<{ revisedMatter: Partial<BookMatter>, revisedContent: { chapterIndex: number, pageIndex: number, newPageContent: string }[] }> => {

    const langInstruction = getLanguageInstruction(details.language);
    
    const revisionSchema = {
        type: Type.OBJECT,
        properties: {
            revisedMatter: {
                type: Type.OBJECT,
                properties: {
                    copyright: { type: Type.STRING },
                    dedication: { type: Type.STRING },
                    acknowledgments: { type: Type.STRING },
                    introduction: { type: Type.STRING },
                    conclusion: { type: Type.STRING },
                    appendix: { type: Type.STRING },
                    glossary: { type: Type.STRING },
                    authorBio: { type: Type.STRING },
                },
                description: "Contains only the front/back matter sections that were changed. Omit any sections that were not revised."
            },
            revisedContent: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        chapterIndex: { type: Type.INTEGER, description: "0-based index of the chapter." },
                        pageIndex: { type: Type.INTEGER, description: "0-based index of the page within the chapter." },
                        newPageContent: { type: Type.STRING, description: "The full, revised content for this specific page." }
                    },
                    required: ["chapterIndex", "pageIndex", "newPageContent"]
                },
                description: "An array of all pages that were revised. Only include pages that have changed."
            }
        },
        // FIX: The key 'revisedContent' was passed as a variable instead of a string literal.
        required: ["revisedMatter", "revisedContent"]
    };

    const prompt = `
        ${langInstruction}
        You are a master book editor tasked with performing the final revisions on a complete manuscript based on the author's feedback.

        **Author's Final Feedback:**
        "${feedback}"

        **Full Manuscript Context (JSON format):**
        - **Book Details:** ${JSON.stringify(details)}
        - **Book Outline:** ${JSON.stringify(outline)}
        - **Front & Back Matter:** ${JSON.stringify(matter)}
        - **Full Book Content (first 100 chars of each page for context):** 
        ${content.map((pages, cIdx) => `  Chapter ${cIdx + 1}: [${pages.map((p, pIdx) => `Page ${pIdx + 1}: "${p.substring(0, 100)}..."`).join(', ')}]`).join('\n')}

        **Your Task:**
        1.  Carefully analyze the author's feedback and identify which parts of the manuscript need to be changed. This could be anything from the introduction, a specific chapter, or the conclusion.
        2.  Rewrite ONLY the sections that require changes. Adhere strictly to the established writing style, tone, and professional formatting rules.
        3.  Your response MUST be a valid JSON object that contains ONLY the changes.
        
        **Response Instructions:**
        - Your output must match the provided JSON schema.
        - For \`revisedMatter\`, only include the keys for sections you actually changed (e.g., if you only changed the conclusion, the object should be \`{"conclusion": "new content..."}\`).
        - For \`revisedContent\`, create an array of objects, where each object specifies the exact \`chapterIndex\` and \`pageIndex\` of a page you revised, along with its \`newPageContent\`. If no pages in the main content were changed, return an empty array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: revisionSchema,
        },
    });
    
    try {
        const jsonResponse = JSON.parse(response.text.trim());
        return jsonResponse as { revisedMatter: Partial<BookMatter>, revisedContent: { chapterIndex: number, pageIndex: number, newPageContent: string }[] };
    } catch (e) {
        console.error("Failed to parse full book revision JSON:", response.text);
        throw new Error("The AI returned an invalid format for the final revision.");
    }
};