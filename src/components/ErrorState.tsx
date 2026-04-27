import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ 
  message = 'Veri yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.',
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="absolute inset-0 z-[999] flex items-center justify-center bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm">
      <div className="max-w-md mx-auto text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
          Bağlantı Hatası
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-md shadow-indigo-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
        )}
      </div>
    </div>
  );
}
