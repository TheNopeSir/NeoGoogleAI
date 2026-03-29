import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MatrixRain from './MatrixRain';
import CRTOverlay from './CRTOverlay';
import SEO from './SEO';
import XI from './XI';

interface TermsOfUsePageProps {
  onBack?: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-pixel text-sm text-green-400 mb-3 tracking-widest uppercase border-b border-white/10 pb-2">
      {title}
    </h2>
    <div className="font-mono text-xs text-white/70 leading-relaxed space-y-2">{children}</div>
  </div>
);

const TermsOfUsePage: React.FC<TermsOfUsePageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <SEO title="NeoArchive — Условия использования" />
      <MatrixRain theme="dark" />
      <CRTOverlay />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors font-mono text-xs"
            >
              <XI icon={ArrowLeft} size={16} /> НАЗАД
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-green-500 flex items-center justify-center">
              <span className="font-pixel text-black text-[10px] font-bold">NA</span>
            </div>
            <span className="font-pixel text-xs text-white/40 tracking-widest">NEO_ARCHIVE</span>
          </div>
        </div>

        <h1 className="font-pixel text-xl text-white mb-2 tracking-widest">УСЛОВИЯ ИСПОЛЬЗОВАНИЯ</h1>
        <p className="font-mono text-xs text-white/40 mb-10">
          Последнее обновление: 29 марта 2025 г.
        </p>

        <Section title="Принятие условий">
          <p>
            Используя сервис NeoArchive (далее — «Сервис»), доступный по адресу{' '}
            <a href="https://neoarchive.ru/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
              https://neoarchive.ru/
            </a>
            , вы подтверждаете, что прочитали, поняли и согласны с настоящими Условиями
            использования (далее — «Условия»).
          </p>
          <p>
            Если вы не согласны с Условиями, пожалуйста, не используйте Сервис. Регистрация
            аккаунта означает безоговорочное принятие Условий.
          </p>
        </Section>

        <Section title="Описание сервиса">
          <p>
            NeoArchive — это платформа для коллекционирования и демонстрации артефактов культуры
            (книги, игры, музыка, фильмы и другие предметы). Сервис позволяет пользователям:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Создавать и управлять личными коллекциями;</li>
            <li>Публиковать записи об артефактах с описаниями и изображениями;</li>
            <li>Взаимодействовать с другими пользователями (комментарии, реакции, подписки);</li>
            <li>Создавать вишлисты и участвовать в обменах;</li>
            <li>Использовать дополнительные инструменты для организации и поиска коллекций.</li>
          </ul>
        </Section>

        <Section title="Регистрация и аккаунт">
          <p>
            Для использования большинства функций Сервиса необходима регистрация. При регистрации
            вы обязуетесь:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Предоставлять достоверные и актуальные сведения о себе;</li>
            <li>Не создавать аккаунты от имени других лиц или организаций без их согласия;</li>
            <li>Хранить данные для входа в тайне и не передавать их третьим лицам;</li>
            <li>Незамедлительно уведомлять нас о несанкционированном использовании аккаунта.</li>
          </ul>
          <p>
            Вы несёте ответственность за все действия, совершённые с использованием вашего аккаунта.
          </p>
        </Section>

        <Section title="Правила публикации контента">
          <p>
            Публикуя контент (тексты, изображения, комментарии и иные материалы) на Сервисе,
            вы подтверждаете, что обладаете всеми необходимыми правами на него.
          </p>
          <p className="text-white/50 font-bold mt-2 mb-1">Запрещено публиковать контент, который:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Нарушает авторские права, товарные знаки или иные права третьих лиц;</li>
            <li>Содержит материалы сексуального насилия, в том числе с участием несовершеннолетних;</li>
            <li>Пропагандирует насилие, терроризм, экстремизм или дискриминацию;</li>
            <li>Содержит личные данные других лиц без их согласия;</li>
            <li>Является спамом, мошенничеством или вводит пользователей в заблуждение;</li>
            <li>Нарушает законодательство Российской Федерации.</li>
          </ul>
          <p>
            Публикуя контент, вы предоставляете NeoArchive безвозмездную, неисключительную лицензию
            на отображение, воспроизведение и распространение этого контента в рамках функционирования
            Сервиса.
          </p>
        </Section>

        <Section title="Правила поведения">
          <p>При использовании Сервиса запрещается:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Оскорблять, угрожать или преследовать других пользователей;</li>
            <li>Создавать несколько аккаунтов с целью обхода блокировки или ограничений;</li>
            <li>Использовать автоматизированные средства (боты, скрипты) без разрешения;</li>
            <li>Предпринимать попытки взлома, обхода защиты или иного нарушения безопасности Сервиса;</li>
            <li>Собирать данные других пользователей без их согласия;</li>
            <li>Размещать ссылки на вредоносное программное обеспечение.</li>
          </ul>
        </Section>

        <Section title="Интеллектуальная собственность">
          <p>
            Все объекты интеллектуальной собственности Сервиса (логотип, дизайн, программный код,
            оформление) принадлежат оператору NeoArchive. Их использование без письменного разрешения
            запрещено.
          </p>
          <p>
            Пользователи сохраняют права на контент, который они публикуют. Оператор не претендует
            на право собственности на ваши материалы.
          </p>
        </Section>

        <Section title="Ответственность сторон">
          <p>
            Сервис предоставляется «как есть», без каких-либо явных или подразумеваемых гарантий
            бесперебойной работы.
          </p>
          <p>Оператор не несёт ответственности за:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Потерю данных вследствие технических сбоев или действий третьих лиц;</li>
            <li>Контент, опубликованный пользователями;</li>
            <li>Действия пользователей, нарушающие права третьих лиц;</li>
            <li>Временную недоступность Сервиса по техническим причинам.</li>
          </ul>
          <p>
            Пользователь несёт полную ответственность за контент, который он публикует, и за
            соответствие своей деятельности на Сервисе законодательству РФ.
          </p>
        </Section>

        <Section title="Модерация и блокировка">
          <p>
            Оператор вправе без предупреждения удалять контент, нарушающий настоящие Условия, и
            блокировать аккаунты пользователей, систематически нарушающих Условия или
            законодательство РФ.
          </p>
          <p>
            При несогласии с решением о блокировке вы можете обратиться к нам по адресу{' '}
            <a href="mailto:kennyornope@gmail.com" className="text-green-400 hover:underline">
              kennyornope@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="Платные функции">
          <p>
            Часть функций Сервиса может предоставляться на платной основе. Условия оплаты
            и возврата средств сообщаются пользователю при оформлении соответствующей услуги.
          </p>
        </Section>

        <Section title="Изменение условий">
          <p>
            Оператор вправе изменять настоящие Условия. Актуальная редакция всегда доступна
            по адресу{' '}
            <a href="https://neoarchive.ru/terms" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
              neoarchive.ru/terms
            </a>
            . Продолжение использования Сервиса после публикации изменений означает принятие новой
            редакции Условий.
          </p>
        </Section>

        <Section title="Применимое право">
          <p>
            Настоящие Условия регулируются законодательством Российской Федерации. Все споры
            подлежат разрешению в досудебном порядке; при недостижении соглашения — в судебном
            порядке по месту нахождения оператора.
          </p>
        </Section>

        <Section title="Контакты">
          <p>По вопросам, связанным с настоящими Условиями, обращайтесь:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>E-mail: <a href="mailto:kennyornope@gmail.com" className="text-green-400 hover:underline">kennyornope@gmail.com</a></li>
          </ul>
        </Section>

        {/* Footer */}
        <div className="mt-10 text-center">
          <span className="font-mono text-[10px] text-white/20">
            © {new Date().getFullYear()} NeoArchive. Все права защищены.
          </span>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
