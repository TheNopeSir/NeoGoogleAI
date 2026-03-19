import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MatrixRain from './MatrixRain';
import CRTOverlay from './CRTOverlay';
import SEO from './SEO';
import XI from './XI';

interface OfertaPageProps {
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

const OfertaPage: React.FC<OfertaPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <SEO title="NeoArchive — Публичная оферта" />
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

        <h1 className="font-pixel text-xl text-white mb-2 tracking-widest">ПУБЛИЧНАЯ ОФЕРТА</h1>
        <p className="font-mono text-xs text-white/40 mb-10">
          о заключении договора об оказании услуг
        </p>

        <Section title="Общие положения">
          <p>
            В настоящей Публичной оферте содержатся условия заключения Договора об оказании услуг
            (далее — «Договор»). Совершение указанных в настоящей Оферте действий является
            подтверждением согласия обеих Сторон заключить Договор на изложенных условиях.
          </p>
          <p>
            Нижеизложенный текст является официальным публичным предложением Исполнителя,
            адресованным заинтересованному кругу лиц, в соответствии с п. 2 ст. 437 ГК РФ.
          </p>
          <p>
            Договор считается заключённым с момента совершения Сторонами конклюдентных действий
            (регистрация учётной записи, оформление заявки, оплата Услуг и т. д.).
          </p>
          <p className="pt-2 text-white/50">
            <span className="text-white/70">Сайт Исполнителя:</span>{' '}
            <a
              href="https://neoarchive.ru/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline"
            >
              https://neoarchive.ru/
            </a>
          </p>
        </Section>

        <Section title="Предмет договора">
          <p>
            Исполнитель обязуется оказать Заказчику Услуги, а Заказчик — оплатить их в порядке и
            сроки, установленные настоящим Договором.
          </p>
          <p>
            Наименование, количество и иные условия оказания Услуг определяются при оформлении
            заявки либо устанавливаются на Сайте Исполнителя.
          </p>
          <p>
            Исполнитель вправе привлекать третьих лиц; за их действия отвечает как за свои.
          </p>
        </Section>

        <Section title="Права и обязанности сторон">
          <p className="text-white/50 font-bold mb-1">Исполнитель:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Оказывает Услуги в сроки и объёме, указанных в Договоре или на Сайте.</li>
            <li>Обеспечивает Заказчику доступ к необходимым разделам Сайта.</li>
            <li>Несёт ответственность за хранение и обработку персональных данных Заказчика.</li>
            <li>
              Вправе в одностороннем порядке изменять условия Оферты, публикуя изменения на Сайте;
              новые условия действуют только в отношении вновь заключаемых Договоров.
            </li>
          </ul>
          <p className="text-white/50 font-bold mb-1 mt-3">Заказчик:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Предоставляет достоверную информацию о себе.</li>
            <li>
              Обязуется не копировать и не распространять материалы, ставшие доступными в связи с
              оказанием Услуг.
            </li>
            <li>Принимает Услуги, оказанные Исполнителем.</li>
            <li>
              Вправе потребовать возврата средств по основаниям, предусмотренным действующим
              законодательством РФ.
            </li>
          </ul>
        </Section>

        <Section title="Цена и порядок расчётов">
          <p>
            Стоимость Услуг определяется при оформлении заявки либо устанавливается на Сайте
            Исполнителя. Все расчёты производятся в безналичном порядке.
          </p>
        </Section>

        <Section title="Конфиденциальность и безопасность">
          <p>
            Стороны обеспечивают конфиденциальность и безопасность персональных данных в
            соответствии с ФЗ № 152-ФЗ «О персональных данных» и ФЗ № 149-ФЗ «Об информации».
          </p>
          <p>
            Стороны обязуются сохранять конфиденциальность информации, полученной в ходе исполнения
            Договора, и принять все меры для предохранения её от разглашения.
          </p>
        </Section>

        <Section title="Форс-мажор">
          <p>
            Стороны освобождаются от ответственности за неисполнение обязательств вследствие
            непреодолимой силы (стихийные бедствия, эпидемии, запретные действия властей и др.).
          </p>
          <p>
            О наступлении таких обстоятельств Сторона уведомляет другую в течение 30 рабочих дней.
            Если форс-мажор длится более 60 рабочих дней — каждая Сторона вправе отказаться от
            Договора в одностороннем порядке.
          </p>
        </Section>

        <Section title="Ответственность сторон">
          <p>
            Стороны несут ответственность в соответствии с условиями настоящей Оферты и
            действующим законодательством РФ.
          </p>
          <p>
            Исполнитель не несёт ответственности за неисполнение обязательств, произошедшее по
            вине Заказчика.
          </p>
        </Section>

        <Section title="Срок действия оферты">
          <p>
            Оферта вступает в силу с момента размещения на Сайте и действует до её отзыва
            Исполнителем. Исполнитель вправе изменить или отозвать Оферту в любой момент.
          </p>
          <p>
            Договор вступает в силу с момента акцепта Заказчиком и действует до полного исполнения
            обязательств.
          </p>
        </Section>

        <Section title="Дополнительные условия">
          <p>
            Договор регулируется действующим законодательством Российской Федерации. Споры
            разрешаются в досудебном порядке; при недостижении соглашения — в судебном порядке по
            законодательству РФ.
          </p>
          <p>
            Языком Договора и любого взаимодействия Сторон является русский язык. Бездействие
            Стороны не означает отказа от своих прав.
          </p>
        </Section>

        {/* Реквизиты */}
        <div className="mt-10 p-5 border border-green-500/30 rounded-xl bg-green-500/5">
          <h2 className="font-pixel text-sm text-green-400 mb-4 tracking-widest uppercase">
            Реквизиты исполнителя
          </h2>
          <table className="w-full font-mono text-xs text-white/70 border-collapse">
            <tbody>
              {[
                ['Исполнитель', 'Демидов Константин Андреевич'],
                ['Статус', 'Самозанятый'],
                ['ИНН', '615011868785'],
                ['Телефон', '+7 900 134-23-87'],
                ['E-mail', 'kennyornope@gmail.com'],
                ['Сайт', 'https://neoarchive.ru/'],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-4 text-white/40 w-28 align-top">{label}</td>
                  <td className="py-2 text-white/80 break-all">
                    {label === 'Сайт' || label === 'E-mail' ? (
                      <a
                        href={label === 'Сайт' ? value : `mailto:${value}`}
                        className="text-green-400 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

export default OfertaPage;
