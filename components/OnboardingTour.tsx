
import React, { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import XIcon from './icons/XIcon';

interface OnboardingTourProps {
  onClose: () => void;
  onStepChange?: (stepIndex: number) => void;
}

const TOUR_STEPS = [
  {
    selector: null,
    title: 'Selamat Datang di Flowmind!',
    content: 'Aplikasi perencana cerdas Anda. Mari kita lihat fitur-fitur utama dalam tur singkat ini untuk membantu Anda memulai.',
    position: 'center',
  },
  {
    selector: '[data-tour-id="sidebar-nav"]',
    title: 'Navigasi Mudah',
    content: 'Gunakan sidebar ini untuk beralih antar tampilan: Hari Ini, Terlewat, Mingguan, Bulanan, dan Jurnal.',
    position: 'right',
  },
  {
    selector: '[data-tour-id="overdue-move-button"]',
    title: 'Pindahkan Tugas Terlewat',
    content: 'Tugas yang terlewat akan muncul di sini. Klik tombol ini untuk memindahkannya dengan mudah ke hari ini, besok, atau lusa.',
    position: 'bottom',
  },
  {
    selector: '[data-tour-id="smart-add-task"]',
    title: 'Tambah Tugas dengan AI',
    content: 'Ketik permintaan dalam bahasa alami di sini, seperti "Rapat dengan tim desain besok jam 2 siang", dan AI kami akan menjadwalkannya.',
    position: 'bottom',
  },
  {
    selector: '[data-tour-id="task-list"]',
    title: 'Detail & Mode Fokus',
    content: 'Klik pada tugas mana pun untuk melihat detail, menambahkan checklist, atau memulai sesi fokus Pomodoro.',
    position: 'top',
  },
  {
    selector: '[data-tour-id="add-task-button"]',
    title: 'Tambah Tugas Manual',
    content: 'Atau, klik tombol ini untuk menambahkan tugas baru secara manual kapan saja.',
    position: 'left',
  },
  {
    selector: '[data-tour-id="ai-assistant-button"]',
    title: 'Asisten AI Cerdas',
    content: 'Bingung? Klik di sini untuk bertanya pada asisten AI kami tentang fitur aplikasi.',
    position: 'left',
  },
  {
    selector: '[data-tour-id="journal-nav"]',
    title: 'Jurnal Harian Anda',
    content: 'Setelah menyelesaikan tugas, kunjungi Jurnal untuk merefleksikan kemajuan Anda dan menyimpannya sebagai PDF.',
    position: 'right',
  },
  {
    selector: null,
    title: 'Anda Siap!',
    content: 'Sekarang Anda sudah mengetahui dasar-dasarnya. Selamat menikmati pengalaman merencanakan yang lebih cerdas!',
    position: 'center',
  },
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onClose, onStepChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  
  const step = TOUR_STEPS[currentStep];
  const isCentered = !step.selector;

  // Memberi tahu induk tentang perubahan langkah
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleNext = useCallback(() => {
    setHighlightStyle({}); // Hide old highlight during transition
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  }, [currentStep, handleClose]);

  const handlePrev = useCallback(() => {
    setHighlightStyle({});
    // FIX: Pastikan langkah tidak pernah kurang dari 0, bahkan dengan klik cepat.
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);


  useLayoutEffect(() => {
    const targetSelector = step.selector;

    if (!targetSelector) {
      setHighlightStyle({ width: 0, height: 0 });
      setTooltipStyle({});
      return;
    }

    let resizeListener: (() => void) | null = null;
    let findElementTimeout: number | undefined;
    let positionTimeout: number | undefined;

    const tryToFindAndPosition = (attempt = 0) => {
      const targetElement = document.querySelector(targetSelector) as HTMLElement;

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        const updatePosition = () => {
          if (!document.body.contains(targetElement)) return;
          const rect = targetElement.getBoundingClientRect();
          const padding = 10;
  
          setHighlightStyle({
            position: 'fixed',
            width: rect.width + padding,
            height: rect.height + padding,
            top: rect.top - padding / 2,
            left: rect.left - padding / 2,
          });
  
          const tooltipEl = document.getElementById('tour-tooltip');
          if (tooltipEl) {
            const tooltipRect = tooltipEl.getBoundingClientRect();
            const isMobile = window.innerWidth < 768;
  
            let mobileStyles: React.CSSProperties = { position: 'fixed', left: '1rem', right: '1rem', margin: '0 auto' };
            if (isMobile) {
              const isTargetInBottomHalf = rect.top + rect.height / 2 > window.innerHeight / 2;
              if (isTargetInBottomHalf) {
                mobileStyles.top = '1rem';
              } else {
                mobileStyles.bottom = '1rem';
              }
              setTooltipStyle(mobileStyles);
            } else {
              let top = 0, left = 0;
  
              switch (step.position) {
                case 'right':
                  top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                  left = rect.right + 15;
                  break;
                case 'left':
                  left = rect.left - tooltipRect.width - 15;
                  top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                  break;
                case 'bottom':
                  top = rect.bottom + 15;
                  left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                  break;
                case 'top':
                default:
                  top = rect.top - tooltipRect.height - 15;
                  left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                  break;
              }
  
              if (left < 10) left = 10;
              if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
              }
              if (top < 10) top = 10;
              if (top + tooltipRect.height > window.innerHeight - 10) {
                top = window.innerHeight - tooltipRect.height - 10;
              }
              setTooltipStyle({ top, left, position: 'fixed' });
            }
          }
        };
  
        positionTimeout = window.setTimeout(updatePosition, 300);
        resizeListener = updatePosition;
        window.addEventListener('resize', resizeListener);

      } else if (attempt < 50) { // Increased attempts for safety
        findElementTimeout = window.setTimeout(() => tryToFindAndPosition(attempt + 1), 50);
      } else {
        console.warn(`[Flowmind Tour] Element not found: ${targetSelector}. Skipping step.`);
        handleNext();
      }
    };

    tryToFindAndPosition();

    return () => {
      if (resizeListener) window.removeEventListener('resize', resizeListener);
      if (findElementTimeout) clearTimeout(findElementTimeout);
      if (positionTimeout) clearTimeout(positionTimeout);
    };
  }, [step.selector, step.position, handleNext]);

  return (
    <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isAnimatingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      <div
        className="fixed transition-all duration-500 ease-in-out"
        style={{
          ...highlightStyle,
          borderRadius: '12px',
          boxShadow: isCentered ? 'none' : '0 0 0 9999px rgba(15, 23, 42, 0.7)',
        }}
      ></div>

      <div
        id="tour-tooltip"
        className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm transition-all duration-300 ease-in-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${
          isCentered ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={isCentered ? {} : tooltipStyle}
      >

        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">{step.title}</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm">{step.content}</p>
        </div>
        
        <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <button onClick={handlePrev} className="px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                Kembali
              </button>
            )}
            <button onClick={handleNext} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              {currentStep === TOUR_STEPS.length - 1 ? 'Selesai' : 'Lanjut'}
            </button>
          </div>
        </footer>

        <button onClick={handleClose} className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default OnboardingTour;
