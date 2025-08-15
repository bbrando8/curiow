import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface OnboardingModalProps {
  isOpen: boolean;
  onLoginRequest: () => void;
  onSignUpRequest: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onLoginRequest,
  onSignUpRequest
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const videoRefs = React.useRef<(HTMLVideoElement | null)[]>([]);

  const slides = [
    {
      id: 1,
      title: "Stanco di scorrere senza meta?",
      subtitle: "Scopri Curiow!",
      description: "Trasforma ogni minuto sui social in crescita personale. Intrattenimento di qualità che stimola la mente.",
      videoSrc: "/videos/curiow_slide1.mp4",
      ctaText: "Inizia a Crescere"
    },
    {
      id: 2,
      title: "Il tuo mondo di conoscenza",
      subtitle: "Oltre la superficie",
      description: "Feed dinamico di gemme: Cultura, Scienza, Arte, Benessere, Economia. Ogni card è una scoperta che cattura l'attenzione.",
      videoSrc: "/videos/curiow_slide2.mp4",
      ctaText: "Esplora i Contenuti"
    },
    {
      id: 3,
      title: "Community di menti curiose",
      subtitle: "Il tuo percorso ti aspetta",
      description: "Non solo un'app, ma una community di persone proattive che cercano crescita attraverso l'intrattenimento intelligente.",
      videoSrc: "/videos/curiow_slide3.mp4",
      ctaText: "Registrati Ora"
    }
  ];

  const totalSlides = slides.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEndX(e.changedTouches[0].clientX);
    const minSwipeDistance = 50;

    if (touchStartX - touchEndX > minSwipeDistance) {
      nextSlide();
    } else if (touchEndX - touchStartX > minSwipeDistance) {
      prevSlide();
    }
  };

  const handleSignUpClick = () => {
    onSignUpRequest();
  };

  const handleLoginClick = () => {
    onLoginRequest();
  };

  // Effect per gestire l'autoplay del video quando cambia slide
  useEffect(() => {
    if (isOpen && videoRefs.current[currentSlide]) {
      // Pausa tutti i video
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
      });

      // Avvia il video della slide corrente con un piccolo delay
      const currentVideo = videoRefs.current[currentSlide];
      if (currentVideo) {
        const playVideo = async () => {
          try {
            currentVideo.muted = true; // Assicura che l'audio sia disattivato
            await currentVideo.play();
          } catch (error) {
            console.log('Autoplay video failed:', error);
          }
        };

        // Delay per permettere alla transizione di completarsi
        setTimeout(playVideo, 300);
      }
    }
  }, [currentSlide, isOpen]);

  // Reset quando la modale si apre
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    } else {
      // Pausa tutti i video quando la modale si chiude
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSlideData = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Il pulsante di chiusura è stato rimosso */}

        {/* Slides container */}
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((slide, index) => (
            <div key={slide.id} className="w-full flex-shrink-0 p-6 lg:p-10">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Video section */}
                <div className="w-full lg:w-1/2">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <video
                      ref={(el) => (videoRefs.current[index] = el)}
                      className="w-full h-64 lg:h-80 object-cover"
                      controls
                      poster={`https://placehold.co/600x400/1e293b/d1d5db?text=Curiow+Video+${slide.id}`}
                      preload="metadata"
                    >
                      <source src={slide.videoSrc} type="video/mp4" />
                      Il tuo browser non supporta i video HTML5.
                    </video>
                  </div>
                </div>

                {/* Content section */}
                <div className="w-full lg:w-1/2 text-center lg:text-left">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                    {slide.title}
                  </h1>
                  <h2 className="text-xl lg:text-2xl font-semibold text-indigo-300 mb-6">
                    {slide.subtitle}
                  </h2>
                  <p className="text-gray-300 text-lg leading-relaxed mb-8">
                    {slide.description}
                  </p>

                  {/* CTA Buttons */}
                  <div className="space-y-4">
                    <button
                      onClick={handleSignUpClick}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105"
                    >
                      {slide.ctaText}
                    </button>
                    <button
                      onClick={handleLoginClick}
                      className="w-full bg-transparent border-2 border-gray-400 text-gray-300 hover:text-white hover:border-white font-medium py-3 px-8 rounded-full transition-all duration-300"
                    >
                      Hai già un account? Accedi
                    </button>
                  </div>

                  {/* Social login hint */}
                  <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm mb-3">Accesso rapido con:</p>
                    <div className="flex justify-center">
                      <div className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer">
                        <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 text-gray-400 hover:text-white transition-colors bg-black bg-opacity-30 rounded-full"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 text-gray-400 hover:text-white transition-colors bg-black bg-opacity-30 rounded-full"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>

        {/* Slide indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-blue-500 scale-125'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
