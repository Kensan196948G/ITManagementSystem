import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import jaMessages from './locales/ja.json';
import enMessages from './locales/en.json';

// サポートされる言語
export type Locale = 'ja' | 'en';

// 言語メッセージ
const messages: Record<Locale, Record<string, string>> = {
  ja: jaMessages,
  en: enMessages
};

// I18nコンテキストの型定義
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  formatMessage: (id: string, values?: Record<string, any>) => string;
}

// I18nコンテキストの作成
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// I18nプロバイダーのプロパティ
interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

/**
 * 国際化（i18n）プロバイダーコンポーネント
 * アプリケーション全体の言語設定を管理
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale = 'ja'
}) => {
  // ローカルストレージから言語設定を取得、なければデフォルト言語を使用
  const [locale, setLocale] = useState<Locale>(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    return savedLocale || defaultLocale;
  });

  // 言語設定が変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('locale', locale);
    // HTML要素のlang属性を更新
    document.documentElement.lang = locale;
  }, [locale]);

  // メッセージのフォーマット関数
  const formatMessage = (id: string, values?: Record<string, any>): string => {
    const messageTemplate = messages[locale][id] || id;
    
    if (!values) {
      return messageTemplate;
    }
    
    // 簡易的なメッセージフォーマット（react-intlのformatMessageの代替）
    return messageTemplate.replace(/{(\w+)}/g, (match, key) => {
      return values[key] !== undefined ? String(values[key]) : match;
    });
  };

  // コンテキスト値
  const contextValue: I18nContextType = {
    locale,
    setLocale,
    formatMessage
  };

  return (
    <I18nContext.Provider value={contextValue}>
      <IntlProvider
        locale={locale}
        messages={messages[locale]}
        defaultLocale="ja"
      >
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
};

/**
 * 国際化（i18n）フックを使用
 * コンポーネント内で言語設定にアクセスするためのフック
 */
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  
  return context;
};

/**
 * 言語切り替えコンポーネント
 * 言語を切り替えるためのユーティリティコンポーネント
 */
export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, formatMessage } = useI18n();
  
  const toggleLanguage = () => {
    setLocale(locale === 'ja' ? 'en' : 'ja');
  };
  
  return (
    <button
      onClick={toggleLanguage}
      aria-label={formatMessage('switchLanguage')}
      style={{
        background: 'none',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '4px 8px',
        cursor: 'pointer'
      }}
    >
      {locale === 'ja' ? 'English' : '日本語'}
    </button>
  );
};

export default I18nProvider;