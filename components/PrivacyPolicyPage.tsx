import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MatrixRain from './MatrixRain';
import CRTOverlay from './CRTOverlay';
import SEO from './SEO';
import XI from './XI';

interface PrivacyPolicyPageProps {
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

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <SEO title="NeoArchive — Политика конфиденциальности" />
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

        <h1 className="font-pixel text-xl text-white mb-2 tracking-widest">ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ</h1>
        <p className="font-mono text-xs text-white/40 mb-10">
          Последнее обновление: 29 марта 2025 г.
        </p>

        <Section title="Общие положения">
          <p>
            Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки
            персональных данных пользователей сервиса NeoArchive (далее — «Сервис»), расположенного
            по адресу{' '}
            <a href="https://neoarchive.ru/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
              https://neoarchive.ru/
            </a>
            .
          </p>
          <p>
            Используя Сервис, вы даёте согласие на обработку персональных данных в соответствии с
            настоящей Политикой. Если вы не согласны с условиями Политики, пожалуйста, прекратите
            использование Сервиса.
          </p>
          <p>
            Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ
            «О персональных данных».
          </p>
        </Section>

        <Section title="Оператор персональных данных">
          <p>Оператором персональных данных является:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Демидов Константин Андреевич (самозанятый)</li>
            <li>ИНН: 615011868785</li>
            <li>E-mail: <a href="mailto:kennyornope@gmail.com" className="text-green-400 hover:underline">kennyornope@gmail.com</a></li>
            <li>Телефон: +7 900 134-23-87</li>
          </ul>
        </Section>

        <Section title="Какие данные мы собираем">
          <p>При использовании Сервиса мы можем собирать следующие категории данных:</p>
          <p className="text-white/50 font-bold mt-2 mb-1">Данные, предоставляемые вами:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Имя пользователя (никнейм);</li>
            <li>Адрес электронной почты;</li>
            <li>Пароль (хранится в зашифрованном виде);</li>
            <li>Аватар и изображения, загружаемые вами;</li>
            <li>Информация в профиле (статус, слоган и иные сведения по желанию);</li>
            <li>Контент, публикуемый в Сервисе (записи, коллекции, комментарии).</li>
          </ul>
          <p className="text-white/50 font-bold mt-3 mb-1">Данные, собираемые автоматически:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>IP-адрес и сведения об устройстве;</li>
            <li>Тип и версия браузера / операционной системы;</li>
            <li>Страницы, посещённые в рамках Сервиса, дата и время визита;</li>
            <li>Реферальные ссылки (откуда пришёл пользователь).</li>
          </ul>
        </Section>

        <Section title="Цели обработки данных">
          <p>Персональные данные обрабатываются в следующих целях:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Регистрация и авторизация в Сервисе;</li>
            <li>Предоставление функций Сервиса (публикация, поиск, взаимодействие с пользователями);</li>
            <li>Отправка уведомлений, связанных с использованием Сервиса;</li>
            <li>Техническая поддержка пользователей;</li>
            <li>Улучшение качества и безопасности Сервиса;</li>
            <li>Соблюдение требований законодательства РФ.</li>
          </ul>
        </Section>

        <Section title="Правовые основания обработки">
          <p>Обработка персональных данных осуществляется на следующих правовых основаниях:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Согласие пользователя (ст. 9 ФЗ «О персональных данных»);</li>
            <li>Исполнение договора, стороной которого является пользователь;</li>
            <li>Законные интересы оператора, не нарушающие права пользователей.</li>
          </ul>
        </Section>

        <Section title="Передача данных третьим лицам">
          <p>
            Мы не продаём и не передаём ваши персональные данные третьим лицам в коммерческих
            целях. Данные могут быть переданы третьим лицам только в следующих случаях:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Поставщикам инфраструктурных услуг (хостинг, облачные хранилища — Supabase, Amazon S3 и иные), исключительно для обеспечения работы Сервиса;</li>
            <li>По требованию уполномоченных государственных органов в соответствии с законодательством РФ;</li>
            <li>В случае реорганизации или передачи прав на Сервис — в объёме, необходимом для продолжения оказания услуг.</li>
          </ul>
          <p>
            Все поставщики услуг обязаны соблюдать конфиденциальность данных и обрабатывать их
            только в целях, для которых они были предоставлены.
          </p>
        </Section>

        <Section title="Хранение и защита данных">
          <p>
            Мы принимаем разумные технические и организационные меры для защиты ваших персональных
            данных от несанкционированного доступа, изменения, раскрытия или уничтожения:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Пароли хранятся в хешированном виде;</li>
            <li>Соединение с Сервисом защищено протоколом HTTPS;</li>
            <li>Доступ к базе данных ограничен и контролируется.</li>
          </ul>
          <p>
            Данные хранятся в течение всего срока существования аккаунта. После удаления аккаунта
            данные могут сохраняться до 30 дней, после чего безвозвратно удаляются, если иное не
            предусмотрено законодательством.
          </p>
        </Section>

        <Section title="Права пользователей">
          <p>В соответствии с законодательством РФ вы вправе:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Получить информацию о том, какие данные о вас обрабатываются;</li>
            <li>Потребовать исправления неточных данных;</li>
            <li>Потребовать удаления персональных данных («право на забвение»);</li>
            <li>Отозвать согласие на обработку данных;</li>
            <li>Обжаловать действия оператора в Роскомнадзор.</li>
          </ul>
          <p>
            Для реализации своих прав обратитесь по адресу:{' '}
            <a href="mailto:kennyornope@gmail.com" className="text-green-400 hover:underline">
              kennyornope@gmail.com
            </a>
          </p>
        </Section>

        <Section title="Файлы cookie">
          <p>
            Сервис использует файлы cookie и аналогичные технологии для обеспечения работы
            авторизации, сохранения настроек и улучшения пользовательского опыта. Вы можете
            отключить cookie в настройках браузера, однако это может ограничить функциональность
            Сервиса.
          </p>
        </Section>

        <Section title="Дети">
          <p>
            Сервис не предназначен для лиц младше 13 лет. Мы не собираем намеренно персональные
            данные детей. Если вам стало известно, что ребёнок предоставил нам свои данные без
            согласия родителей, пожалуйста, свяжитесь с нами.
          </p>
        </Section>

        <Section title="Изменения Политики">
          <p>
            Мы оставляем за собой право изменять настоящую Политику. Актуальная версия всегда
            доступна по адресу{' '}
            <a href="https://neoarchive.ru/privacy" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
              neoarchive.ru/privacy
            </a>
            . Продолжение использования Сервиса после публикации изменений означает принятие новой
            редакции Политики.
          </p>
        </Section>

        <Section title="Контакты">
          <p>
            По вопросам, связанным с обработкой персональных данных, обращайтесь:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>E-mail: <a href="mailto:kennyornope@gmail.com" className="text-green-400 hover:underline">kennyornope@gmail.com</a></li>
            <li>Телефон: +7 900 134-23-87</li>
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

export default PrivacyPolicyPage;
