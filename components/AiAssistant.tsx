

import React, { useState, useEffect, useRef, useCallback } from 'react';
import XIcon from './icons/XIcon';
import SparklesBotIcon from './icons/SparklesBotIcon';
import SendIcon from './icons/SendIcon';

interface AiAssistantProps {
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const SYSTEM_INSTRUCTION = `You are "Flowie", a friendly and helpful AI assistant for a productivity app called Flowmind. Your purpose is to assist users by answering their questions about the app's features. Your responses MUST be in Bahasa Indonesia.

Here is a summary of Flowmind's features:
- **Hari Ini (Today View):** Shows tasks due today. Users can filter and sort them. It includes a smart "Add with AI" feature where users can type natural language like "meeting tomorrow at 2 pm".
- **Tugas Terlewat (Overdue View):** Lists all tasks from previous days that are not completed. Users can move or delete these tasks in bulk.
- **7 Hari (Weekly View):** A 7-day calendar view showing tasks for the week. It helps users see their weekly progress.
- **Bulanan (Monthly View):** A full calendar view of the month with statistics on completed and pending tasks.
- **Jurnal (Journal):** A feature to write daily reflections. It automatically lists tasks completed that day and can generate a PDF of the journal entry.
- **Mode Fokus (Focus Mode):** A Pomodoro timer to help users focus on a specific task without distractions.
- **Tugas Penting (Important Tasks):** Users can mark tasks as important with a star icon.
- **Tugas Berulang (Recurring Tasks):** Tasks can be set to repeat daily.

Your rules are:
1. Always be polite, concise, and helpful. Answer in Bahasa Indonesia.
2. Answer questions based ONLY on the features listed above.
3. Do not make up features or provide information about other apps.
4. If you cannot answer a question, if the user is asking for help with a bug, or if they seem frustrated, you MUST respond with the following exact text: "Maaf, saya tidak dapat membantu dengan itu. Untuk bantuan lebih lanjut, silakan hubungi tim kami langsung di WhatsApp." and then provide the clickable link on a new line.
5. The WhatsApp number is 087713429002. You MUST format this as a link: https://wa.me/6287713429002
`;

const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
};

const AiAssistant: React.FC<AiAssistantProps> = ({ onClose }) => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Halo! Saya Flowie, asisten AI Anda. Apa yang bisa saya bantu jelaskan tentang Flowmind?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const assistantRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200); // Sesuai dengan durasi animasi
  }, [onClose]);

  useEffect(() => {
    // Animasikan masuk setelah komponen dimuat
    const timer = requestAnimationFrame(() => setVisible(true));
  
    // Logika untuk menutup saat mengklik di luar
    const handleClickOutside = (event: MouseEvent) => {
      if (assistantRef.current && !assistantRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
  
    return () => {
      cancelAnimationFrame(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const contents = newMessages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
      }));

      const response = await fetch('/.netlify/functions/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              model: 'gemini-2.5-flash',
              contents: contents,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
              }
          })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }

      const data = await response.json();
      const modelMessage: Message = { role: 'model', content: data.text };
      setMessages(prev => [...prev, modelMessage]);

    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorMessage: Message = {
        role: 'model',
        content: 'Maaf, terjadi kesalahan saat memproses permintaan Anda. Coba lagi nanti.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 sm:inset-auto sm:bottom-28 sm:right-6 lg:sm:bottom-32 lg:right-8 bg-black bg-opacity-20 backdrop-blur-sm flex justify-center items-end sm:items-center z-40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div
        ref={assistantRef}
        className={`bg-white dark:bg-slate-800 shadow-2xl w-full max-w-md h-[75vh] max-h-[550px] flex flex-col transition-transform duration-200 ease-out overflow-hidden ${visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-10'}`}
      >
        <header className="p-4 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-3">
            <SparklesBotIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Asisten AI Flowie</h2>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-5 h-5" />
          </button>
        </header>

        <main className="p-4 flex-1 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                <LinkifiedText text={msg.content} />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-700">
                <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Tanyakan sesuatu..."
              className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 dark:placeholder-slate-400 text-slate-800 dark:text-slate-200"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AiAssistant;