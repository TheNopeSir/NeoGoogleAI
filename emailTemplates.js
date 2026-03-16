/**
 * NeoArchive — брендированные HTML-шаблоны писем
 * Совместимы с Gmail, Outlook, Apple Mail
 * Используют inline-стили (требование email-клиентов)
 */

const BRAND_GREEN   = '#4ade80';
const BRAND_DARK    = '#09090b';
const BODY_BG       = '#f4f4f5';
const CARD_BG       = '#ffffff';
const TEXT_MAIN     = '#18181b';
const TEXT_MUTED    = '#71717a';
const BORDER_COLOR  = '#e4e4e7';

/** Общая обёртка — шапка и подвал одинаковы во всех письмах */
const wrap = (content, previewText = '') => `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>NeoArchive</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700&display=swap');
    body { margin:0; padding:0; background:${BODY_BG}; }
    a { color:${BRAND_GREEN}; text-decoration:none; }
    @media (prefers-color-scheme: dark) {
      body { background:#09090b !important; }
      .card { background:#18181b !important; border-color:#27272a !important; }
      .text-main { color:#f4f4f5 !important; }
      .text-muted { color:#a1a1aa !important; }
      .footer-text { color:#52525b !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BODY_BG};font-family:'Exo 2',Arial,sans-serif;">

  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BODY_BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- HEADER -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <a href="https://neoarchive.ru" style="text-decoration:none;">
            <span style="font-family:'Exo 2',monospace,Arial;font-size:22px;font-weight:700;color:${BRAND_GREEN};letter-spacing:2px;">NEO</span><span style="font-family:'Exo 2',monospace,Arial;font-size:22px;font-weight:700;color:${TEXT_MAIN};letter-spacing:2px;">ARCHIVE</span>
          </a>
        </td></tr>

        <!-- CARD -->
        <tr><td class="card" style="background:${CARD_BG};border:1px solid ${BORDER_COLOR};border-radius:12px;padding:40px 36px;">
          ${content}
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p class="footer-text" style="font-size:11px;color:${TEXT_MUTED};margin:0 0 4px;">Вы получили это письмо, так как связаны с аккаунтом NeoArchive.</p>
          <p class="footer-text" style="font-size:11px;color:${TEXT_MUTED};margin:0;">
            <a href="https://neoarchive.ru" style="color:${TEXT_MUTED};">neoarchive.ru</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

/** Стилизованная кнопка-ссылка */
const btn = (text, href) =>
  `<table cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
    <tr><td style="border-radius:8px;background:${BRAND_GREEN};">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:'Exo 2',Arial,sans-serif;font-size:14px;font-weight:700;color:#000;text-decoration:none;letter-spacing:0.5px;border-radius:8px;">${text}</a>
    </td></tr>
  </table>`;

/** Блок с fallback-ссылкой под кнопкой */
const fallbackLink = (href) =>
  `<p style="margin:16px 0 0;font-size:11px;color:${TEXT_MUTED};text-align:center;">
    Если кнопка не работает, скопируйте ссылку:<br>
    <a href="${href}" style="color:${BRAND_GREEN};word-break:break-all;font-size:11px;">${href}</a>
  </p>`;

/** Разделитель */
const divider = () =>
  `<hr style="border:none;border-top:1px solid ${BORDER_COLOR};margin:28px 0;">`;

/** Иконка-заголовок секции */
const badge = (emoji, label) =>
  `<div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;color:#15803d;margin-bottom:20px;">${emoji} ${label}</div>`;

// ─────────────────────────────────────────
// 1. ПОДТВЕРЖДЕНИЕ РЕГИСТРАЦИИ
// ─────────────────────────────────────────
export const verificationTemplate = (username, verifyLink) => wrap(`
  ${badge('✦', 'Подтверждение аккаунта')}
  <h1 class="text-main" style="margin:0 0 12px;font-size:24px;font-weight:700;color:${TEXT_MAIN};line-height:1.3;">Добро пожаловать,<br><span style="color:${BRAND_GREEN};">@${username}</span></h1>
  <p class="text-main" style="margin:0 0 8px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">Ваш аккаунт почти готов. Нажмите кнопку ниже, чтобы активировать его и начать работу с NeoArchive.</p>
  <p class="text-muted" style="margin:0 0 16px;font-size:13px;color:${TEXT_MUTED};">Ссылка действительна <strong>24 часа</strong>.</p>
  ${btn('✓ Подтвердить аккаунт', verifyLink)}
  ${divider()}
  <p style="margin:0 0 8px;font-size:13px;color:${TEXT_MUTED};text-align:center;">Если кнопка не работает, скопируйте и вставьте ссылку в браузер:</p>
  <div style="background:#f4f4f5;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:14px 16px;word-break:break-all;font-family:monospace;font-size:12px;color:${TEXT_MAIN};line-height:1.6;">${verifyLink}</div>
  ${divider()}
  <p class="text-muted" style="margin:0;font-size:12px;color:${TEXT_MUTED};text-align:center;">Если вы не регистрировались на NeoArchive — просто проигнорируйте это письмо.</p>
`, `Активируйте аккаунт @${username} на NeoArchive`);

// ─────────────────────────────────────────
// 2. ПРИВЕТСТВИЕ (после успешной активации)
// ─────────────────────────────────────────
export const welcomeTemplate = (username) => wrap(`
  ${badge('🎉', 'Аккаунт активирован')}
  <h1 class="text-main" style="margin:0 0 12px;font-size:24px;font-weight:700;color:${TEXT_MAIN};line-height:1.3;">Аккаунт активирован,<br><span style="color:${BRAND_GREEN};">@${username}</span>!</h1>
  <p class="text-main" style="margin:0 0 20px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">Теперь вы полноправный участник NeoArchive — пространства для цифровых коллекционеров. Загружайте экспонаты, создавайте коллекции и находите единомышленников.</p>
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:8px;">
    <tr>
      <td style="padding:8px;background:#f0fdf4;border-radius:8px;font-size:13px;color:#15803d;text-align:center;">📦 Загружайте экспонаты</td>
      <td width="8"></td>
      <td style="padding:8px;background:#f0fdf4;border-radius:8px;font-size:13px;color:#15803d;text-align:center;">🗂 Создавайте коллекции</td>
    </tr>
  </table>
  ${btn('Начать работу →', 'https://neoarchive.ru')}
`, `Добро пожаловать в NeoArchive, @${username}!`);

// ─────────────────────────────────────────
// 3. СБРОС ПАРОЛЯ
// ─────────────────────────────────────────
export const resetPasswordTemplate = (username, resetLink) => wrap(`
  ${badge('🔑', 'Сброс пароля')}
  <h1 class="text-main" style="margin:0 0 12px;font-size:24px;font-weight:700;color:${TEXT_MAIN};">Сброс пароля</h1>
  <p class="text-main" style="margin:0 0 8px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">Мы получили запрос на сброс пароля для аккаунта <strong>@${username}</strong>. Нажмите кнопку ниже, чтобы задать новый пароль.</p>
  <p class="text-muted" style="margin:0;font-size:13px;color:${TEXT_MUTED};">Ссылка действительна <strong>24 часа</strong>.</p>
  ${btn('Задать новый пароль', resetLink)}
  ${fallbackLink(resetLink)}
  ${divider()}
  <p class="text-muted" style="margin:0;font-size:12px;color:${TEXT_MUTED};text-align:center;">⚠️ Если вы не запрашивали сброс пароля — ничего не делайте. Ваш текущий пароль останется прежним.</p>
`, `Сброс пароля для @${username}`);

// ─────────────────────────────────────────
// 4. ПОДТВЕРЖДЕНИЕ СМЕНЫ ПАРОЛЯ
// ─────────────────────────────────────────
export const changePasswordTemplate = (username, confirmLink) => wrap(`
  ${badge('🔐', 'Смена пароля')}
  <h1 class="text-main" style="margin:0 0 12px;font-size:24px;font-weight:700;color:${TEXT_MAIN};">Подтвердите смену пароля</h1>
  <p class="text-main" style="margin:0 0 8px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">Для аккаунта <strong>@${username}</strong> запрошена смена пароля через настройки профиля. Нажмите кнопку ниже, чтобы подтвердить действие.</p>
  <p class="text-muted" style="margin:0;font-size:13px;color:${TEXT_MUTED};">Ссылка действительна <strong>2 часа</strong>.</p>
  ${btn('Подтвердить смену пароля', confirmLink)}
  ${fallbackLink(confirmLink)}
  ${divider()}
  <p class="text-muted" style="margin:0;font-size:12px;color:${TEXT_MUTED};text-align:center;">⚠️ Если это были не вы — немедленно проверьте безопасность вашего аккаунта.</p>
`, `Подтверждение смены пароля — NeoArchive`);

// ─────────────────────────────────────────
// 5. УВЕДОМЛЕНИЕ: ПАРОЛЬ БЫЛ ИЗМЕНЁН
// ─────────────────────────────────────────
export const passwordChangedAlertTemplate = (username) => wrap(`
  ${badge('🛡', 'Безопасность')}
  <h1 class="text-main" style="margin:0 0 12px;font-size:24px;font-weight:700;color:${TEXT_MAIN};">Пароль изменён</h1>
  <p class="text-main" style="margin:0 0 20px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">Пароль аккаунта <strong>@${username}</strong> был успешно изменён. Если это были вы — ничего делать не нужно.</p>
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-bottom:8px;">
    <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">⚠️ <strong>Это были не вы?</strong> Немедленно воспользуйтесь функцией сброса пароля на сайте и обратитесь в поддержку.</p>
  </div>
  ${btn('Перейти на сайт', 'https://neoarchive.ru')}
`, `Пароль аккаунта @${username} был изменён`);

// ─────────────────────────────────────────
// 6. ПОДТВЕРЖДЕНИЕ СМЕНЫ EMAIL
// ─────────────────────────────────────────
export const changeEmailTemplate = (username, newEmail, confirmLink) => wrap(`
  ${badge('✉️', 'Смена email')}
  <h1 class="text-main" style="margin:0 0 12px;font-size:24px;font-weight:700;color:${TEXT_MAIN};">Подтвердите новый email</h1>
  <p class="text-main" style="margin:0 0 8px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">Для аккаунта <strong>@${username}</strong> запрошена смена email-адреса на:</p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:0 0 16px;font-family:monospace;font-size:14px;color:#15803d;word-break:break-all;">${newEmail}</div>
  <p class="text-muted" style="margin:0;font-size:13px;color:${TEXT_MUTED};">Нажмите кнопку ниже, чтобы подтвердить. Ссылка действительна <strong>24 часа</strong>.</p>
  ${btn('✓ Подтвердить новый email', confirmLink)}
  ${fallbackLink(confirmLink)}
  ${divider()}
  <p class="text-muted" style="margin:0;font-size:12px;color:${TEXT_MUTED};text-align:center;">Если вы не меняли email — проигнорируйте это письмо. Email останется прежним.</p>
`, `Подтвердите смену email — NeoArchive`);
