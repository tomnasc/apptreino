import { useState } from 'react';
import YouTube from 'react-youtube';

export default function YouTubeVideo({ videoUrl, title = 'Demonstração do exercício' }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYoutubeVideoId(videoUrl);

  if (!videoId) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        URL de vídeo inválida ou não suportada.
      </div>
    );
  }

  const handleReady = () => {
    setIsLoading(false);
  };

  const handleError = (e) => {
    setIsLoading(false);
    setError('Erro ao carregar o vídeo. Por favor, tente novamente mais tarde.');
    console.error('Erro do YouTube:', e);
  };

  return (
    <div className="youtube-video-container">
      {isLoading && (
        <div className="flex justify-center items-center bg-gray-100 rounded-md h-48">
          <div className="animate-pulse text-gray-500">Carregando vídeo...</div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}
      
      <div className={isLoading ? 'hidden' : ''}>
        <YouTube
          videoId={videoId}
          title={title}
          opts={{
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 0,
              modestbranding: 1,
              rel: 0,
            },
          }}
          onReady={handleReady}
          onError={handleError}
          className="rounded-md overflow-hidden"
        />
      </div>
      
      <style jsx>{`
        .youtube-video-container {
          position: relative;
          width: 100%;
          padding-top: 56.25%; /* 16:9 Aspect Ratio */
          overflow: hidden;
          border-radius: 0.375rem;
        }
        
        .youtube-video-container > div {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
} 