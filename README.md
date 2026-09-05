# Мой заработок 1.0

Личный PWA-трекер заработка для iPhone.

### В 1.0
- несколько мест работы;
- универсальные формулы: почасовая, почасовая + процент, процент, фиксированная смена;
- отдельная ставка усиления;
- планирование будущих смен и выходных;
- редактирование любого дня задним числом;
- цели на месяц и прогресс;
- прогноз месячного заработка;
- статистика и график;
- импорт/экспорт JSON;
- локальное хранение в localStorage + резервное IndexedDB-хранилище;
- офлайн-кэш после первого запуска;
- снимок формулы в каждой записи дня, чтобы смена ставки не меняла историю;
- заметки и время напоминания.

### Установка
Разместить папку на HTTPS-хостинге, открыть в Safari и выбрать «Поделиться» → «На экран Домой».

### Для следующего этапа
Для массового продукта стоит добавить аккаунты, серверную синхронизацию, push-уведомления, аналитику ошибок и платежи.


## v18
- CSV export for selected month (UTF-8 BOM, semicolon delimiter for Excel compatibility).
- Excel-compatible `.xls` export for selected month.
- PDF monthly report via the device/browser print dialog, with summary, forecast, category breakdown and operations.
- Selected month is controlled by the month field in Settings → Export and backup.
- Smart earnings forecast: combines planned calendar shifts, weekday patterns and recent/historical earnings by workplace, with confidence and method labels.
- Dark-theme transaction list polished: transparent rows, correct text colors and hover/tap states.
